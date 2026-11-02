import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const CORE_DIR = join(__dirname, '../src/core')

/** Le cœur ne peut importer que ses propres fichiers (principe V). */
function externalImports(source: string): string[] {
  const pattern = /(?:from\s+|import\s*\(?\s*|require\s*\(\s*)['"]([^'"]+)['"]/g
  return [...source.matchAll(pattern)]
    .map((match) => match[1] ?? '')
    .filter((target) => !target.startsWith('./'))
}

function coreSources(): string[] {
  return readdirSync(CORE_DIR, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.ts'))
    .map((file) => join(CORE_DIR, file))
}

describe('architecture', () => {
  it("repère les imports interdits, quelle que soit leur forme", () => {
    const source = `
      import { app } from 'electron'
      import * as THREE from "three"
      import { x } from './units'
      const fs = require('node:fs')
      const later = import('react')
    `
    expect(externalImports(source)).toEqual(['electron', 'three', 'node:fs', 'react'])
  })

  it("le cœur n'importe que ses propres fichiers", () => {
    const violations = coreSources().flatMap((file) =>
      externalImports(readFileSync(file, 'utf8')).map((target) => `${file} → ${target}`)
    )
    expect(violations).toEqual([])
  })
})

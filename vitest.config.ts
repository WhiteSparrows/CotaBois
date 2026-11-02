import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/core/**/*.test.ts', 'tests/main/**/*.test.ts', 'tests/architecture.test.ts']
  }
})

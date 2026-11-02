import { describe, expect, it } from 'vitest'
import { canRedo, canUndo, createHistory, MAX_HISTORY, pushState, redo, undo } from '../../src/core/history'
import { createEmptyProject, type Project } from '../../src/core/model'

function named(name: string): Project {
  return { ...createEmptyProject(), name }
}

describe('history', () => {
  it('démarre sans rien à annuler ni à rétablir', () => {
    const history = createHistory(named('a'))
    expect(history.present.name).toBe('a')
    expect(canUndo(history)).toBe(false)
    expect(canRedo(history)).toBe(false)
  })

  it('annule puis rétablit exactement les mêmes états', () => {
    const a = named('a')
    const b = named('b')
    const c = named('c')
    let history = pushState(pushState(createHistory(a), b), c)

    history = undo(history)
    expect(history.present).toBe(b)
    history = undo(history)
    expect(history.present).toBe(a)
    history = redo(history)
    expect(history.present).toBe(b)
    history = redo(history)
    expect(history.present).toBe(c)
  })

  it('est sans effet quand il n\'y a rien à annuler ou à rétablir', () => {
    const history = createHistory(named('a'))
    expect(undo(history)).toBe(history)
    expect(redo(history)).toBe(history)
  })

  it('vide les états à rétablir après une nouvelle action', () => {
    let history = pushState(createHistory(named('a')), named('b'))
    history = undo(history)
    expect(canRedo(history)).toBe(true)
    history = pushState(history, named('c'))
    expect(canRedo(history)).toBe(false)
  })

  it('ignore un état identique, sans créer d\'action vide', () => {
    const a = named('a')
    const history = createHistory(a)
    expect(pushState(history, a)).toBe(history)
  })

  it('permet d\'annuler au moins 50 actions', () => {
    let history = createHistory(named('départ'))
    for (let i = 1; i <= 50; i++) history = pushState(history, named(`action ${i}`))
    for (let i = 0; i < 50; i++) history = undo(history)
    expect(history.present.name).toBe('départ')
  })

  it(`oublie les états au-delà de ${MAX_HISTORY}`, () => {
    let history = createHistory(named('départ'))
    for (let i = 1; i <= MAX_HISTORY + 20; i++) history = pushState(history, named(`action ${i}`))
    let undone = 0
    while (canUndo(history)) {
      history = undo(history)
      undone++
    }
    expect(undone).toBe(MAX_HISTORY)
    expect(history.present.name).toBe('action 20')
  })
})

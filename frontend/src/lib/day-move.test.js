import { describe, expect, it } from 'vitest'
import { canMoveSession, moveSession, undoMove } from './day-move.js'
import { effectiveRoutineIds } from './history.js'

// 2026-10-19 is a Monday (weekday 1), the 20th a Tuesday.
const MON = '2026-10-19', TUE = '2026-10-20'
const state = (over = {}) => ({
  routines: [{ id: 'a', name: 'A', ex: [{ id: 'x' }] }, { id: 'b', name: 'B', ex: [{ id: 'y' }] }],
  week: { 1: ['a'] }, dayPlan: {}, queue: null, ...over,
})

describe('moving a planned session to another day', () => {
  it('plans the routine on the new day and rests the old one', () => {
    const S = state()
    expect(moveSession(S, MON, TUE)).toEqual({ [MON]: undefined, [TUE]: undefined })
    expect(effectiveRoutineIds(S, MON, MON)).toEqual([])
    expect(effectiveRoutineIds(S, TUE, MON)).toEqual(['a'])
  })

  it('undo puts both days back, a day that had no override included', () => {
    const S = state({ dayPlan: { [TUE]: 'b' } })
    const before = moveSession(S, MON, TUE)
    undoMove(S, before)
    expect(S.dayPlan).toEqual({ [TUE]: 'b' })
    expect(effectiveRoutineIds(S, MON, MON)).toEqual(['a'])
  })

  it('a combined day cannot be moved as one', () => {
    const S = state({ week: { 1: ['a', 'b'] } })
    expect(canMoveSession(S, MON)).toBe(false)
    expect(moveSession(S, MON, TUE)).toBe(null)
    expect(S.dayPlan).toEqual({})
  })

  it('a rest day has nothing to move, and neither has the same day', () => {
    const S = state()
    expect(moveSession(S, TUE, MON)).toBe(null)
    expect(moveSession(S, MON, MON)).toBe(null)
  })

  it('a rotation keeps its own order, so nothing moves', () => {
    const S = state({ queue: { ids: ['a', 'b'], startsOn: MON, since: MON } })
    expect(canMoveSession(S, MON)).toBe(false)
  })
})

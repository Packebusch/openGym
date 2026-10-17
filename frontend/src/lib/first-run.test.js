import { describe, expect, it } from 'vitest'
import { needsFirstRun, recommendPlan, PLACES } from './first-run.js'
import { buildStarterPlan, starterPlanOptions } from './starter.js'

describe('who sees the first run', () => {
  it('a new, empty profile does', () => {
    expect(needsFirstRun({ routines: [], workouts: [] })).toBe(true)
  })
  it('a profile with anything of its own does not, nor one that finished or skipped it', () => {
    expect(needsFirstRun({ routines: [{ id: 'r' }], workouts: [] })).toBe(false)
    expect(needsFirstRun({ routines: [], workouts: [{ id: 'w' }] })).toBe(false)
    expect(needsFirstRun({ routines: [], workouts: [], active: { id: 'a' } })).toBe(false)
    expect(needsFirstRun({ routines: [], workouts: [], setupDone: true })).toBe(false)
  })
})

describe('the plan the first run recommends', () => {
  it('follows the days you can train, then your experience', () => {
    expect(recommendPlan({ days: 2, experienced: false })).toBe('full-body')
    expect(recommendPlan({ days: 3, experienced: false })).toBe('full-body')
    expect(recommendPlan({ days: 3, experienced: true })).toBe('5x5')
    expect(recommendPlan({ days: 4, experienced: false })).toBe('upper-lower')
    expect(recommendPlan({ days: 6, experienced: true })).toBe('ppl')
  })

  it('only ever names a plan the catalog has', () => {
    const ids = starterPlanOptions().map(o => o.id)
    for (const days of [2, 3, 4, 5, 6]) for (const experienced of [false, true]) {
      expect(ids).toContain(recommendPlan({ days, experienced }))
    }
  })

  it('every plan still has a session on every place you can train', () => {
    for (const { id } of starterPlanOptions()) for (const equipment of Object.values(PLACES)) {
      const plan = buildStarterPlan(id, equipment || undefined)
      expect(plan.routines.length, `${id} at ${equipment}`).toBeGreaterThan(0)
      expect(plan.routines.every(r => r.ex.length > 0), `${id} at ${equipment}`).toBe(true)
    }
  })
})

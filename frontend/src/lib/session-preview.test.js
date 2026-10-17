// The preview of a planned session has to say what the session will open with — the numbers
// beginWorkout builds, not the routine's saved ones — or "82.5 kg" in the sheet becomes "80" on
// the bar the moment you tap Start.
import { describe, it, expect } from 'vitest'
import { routineExerciseIds, firstOf, sessionPreview, routineSummary } from './session-preview.js'
import { buildCombinedEntries } from './session-merge.js'
import { buildCompletedWorkout } from './finish-workout.js'
import { isWarmupRow } from './workout-model.js'
import { exOr } from './exercises.js'

const BENCH = '0025', ROW = '0031', CRUNCH = '0047'
const clone = v => JSON.parse(JSON.stringify(v))
const state = (routines, extra = {}) => ({ unit: 'kg', exWeights: {}, routines: clone(routines), workouts: [], week: {}, dayPlan: {}, ...extra })

// Train a routine once, every row ticked as built (so a linear policy moves up next time).
function train(st, rids, d = '2026-08-01') {
  const entries = buildCombinedEntries(st, rids).entries.map(e => ({ ...e, sets: e.sets.map(s => ({ ...s, done: true })) }))
  st.workouts.push(buildCompletedWorkout({ id: 'w-' + d, d, start: 1000, routineIds: rids, name: 'x', entries }, { end: 2000 }))
}

describe('routineExerciseIds', () => {
  it('lists every routine\'s exercises in order and reads a repeated routine once', () => {
    const A = { id: 'A', ex: [{ id: BENCH }, { id: ROW }] }
    const B = { id: 'B', ex: [{ id: CRUNCH }] }
    expect(routineExerciseIds([A, B, A])).toEqual([BENCH, ROW, CRUNCH])
    expect(routineExerciseIds([])).toEqual([])
    expect(routineExerciseIds(null)).toEqual([])
  })
})

describe('firstOf', () => {
  it('shows the first few and counts the rest', () => {
    expect(firstOf(['a', 'b', 'c', 'd', 'e'], 3)).toEqual({ shown: ['a', 'b', 'c'], more: 2 })
    expect(firstOf(['a', 'b'], 3)).toEqual({ shown: ['a', 'b'], more: 0 })
  })
  it('names a single leftover instead of "+1 more"', () => {
    expect(firstOf(['a', 'b', 'c', 'd'], 3)).toEqual({ shown: ['a', 'b', 'c', 'd'], more: 0 })
  })
})

describe('sessionPreview', () => {
  it('reads the weight the session will open with, not the routine\'s saved one', () => {
    const st = state([{ id: 'A', name: 'Push', ex: [{ id: BENCH, sets: 3, reps: 5, weight: 80 }] }])
    train(st, ['A'])
    const p = sessionPreview(st, ['A'])
    const built = buildCombinedEntries(st, ['A']).entries[0]
    const topWork = built.sets.filter(s => !isWarmupRow(s))[0].w
    expect(topWork).toBeGreaterThan(80)
    expect(topWork).toBe(82.5)
    expect(p.items[0].line).toBe('3 × 5 · 82.5 kg')
    expect(p.items[0].kind).toBe('up')
  })

  it('keeps session order across combined routines and stamps each exercise\'s routine', () => {
    const st = state([
      { id: 'A', name: 'Strength', prog: 'off', ex: [{ id: BENCH, sets: 3, reps: 5, weight: 60 }, { id: ROW, sets: 3, reps: 8, weight: 40 }] },
      { id: 'B', name: 'Core', prog: 'off', ex: [{ id: CRUNCH, sets: 2, reps: 12, weight: 0 }] },
    ])
    const p = sessionPreview(st, ['A', 'B'])
    expect(p.items.map(i => [i.id, i.rid])).toEqual([[BENCH, 'A'], [ROW, 'A'], [CRUNCH, 'B']])
    expect(p.routines.map(r => r.name)).toEqual(['Strength', 'Core'])
    expect(p.sets).toBe(8)
    expect(p.items[1].line).toBe('3 × 8 · 40 kg')
  })

  it('groups a superset\'s exercises into one unit', () => {
    const st = state([{ id: 'A', name: 'Pair', prog: 'off', ex: [
      { id: BENCH, sets: 3, reps: 8, weight: 60, sg: 'g1' }, { id: ROW, sets: 3, reps: 8, weight: 40, sg: 'g1' }, { id: CRUNCH, sets: 2, reps: 12 },
    ] }])
    expect(sessionPreview(st, ['A']).units).toEqual([[0, 1], [2]])
  })

  it('names the main muscles by work sets, most first', () => {
    const st = state([{ id: 'A', name: 'Mix', prog: 'off', ex: [
      { id: BENCH, sets: 2, reps: 8, weight: 60 }, { id: ROW, sets: 5, reps: 8, weight: 40 },
    ] }])
    const p = sessionPreview(st, ['A'])
    const key = id => exOr(id).tg || exOr(id).bp
    expect(p.muscles[0]).toBe(key(ROW))
    expect(p.muscles).toContain(key(BENCH))
    expect(sessionPreview(st, ['A'], { maxMuscles: 1 }).muscles).toEqual([key(ROW)])
  })

  it('reads an excluded routine\'s exercises as kept out of progression', () => {
    const st = state([{ id: 'R', name: 'Rehab', excludeFromProgression: true, ex: [{ id: BENCH, sets: 2, reps: 15, weight: 20 }] }])
    expect(sessionPreview(st, ['R']).items[0].kind).toBe('off')
  })

  it('is empty for no routine or one that no longer exists', () => {
    const st = state([])
    expect(sessionPreview(st, ['gone'])).toMatchObject({ items: [], units: [], muscles: [], sets: 0 })
  })
})

describe('routineSummary', () => {
  const r = { id: 'r', name: 'Push', ex: [{ id: BENCH, sets: 5 }, { id: ROW, sets: 3 }, { id: CRUNCH, sets: 1 }] }

  it('lists the exercises in order and ranks the muscles by planned sets', () => {
    const sum = routineSummary(state([r]), r)
    expect(sum.exIds).toEqual([BENCH, ROW, CRUNCH])
    const key = id => exOr(id).tg || exOr(id).bp
    expect(sum.muscles[0]).toBe(key(BENCH))
    expect(sum.muscles).toContain(key(ROW))
  })

  it('finds the latest day the routine was trained, alone or combined, and null when never', () => {
    const st = state([r], { workouts: [
      { id: 'a', d: '2026-08-01', start: 1, routineIds: ['r'] },
      { id: 'b', d: '2026-08-09', start: 2, routineIds: ['other', 'r'] },
      { id: 'c', d: '2026-08-12', start: 3, routineIds: ['other'] },
      { id: 'd', d: '2026-08-05', start: 4, routineId: 'r' },
    ] })
    expect(routineSummary(st, r).lastDay).toBe('2026-08-09')
    expect(routineSummary(state([r]), r).lastDay).toBeNull()
  })

  it('tolerates an empty or malformed routine', () => {
    expect(routineSummary(state([]), { id: 'x' })).toEqual({ exIds: [], muscles: [], lastDay: null })
  })
})

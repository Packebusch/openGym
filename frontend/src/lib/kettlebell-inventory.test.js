// The kettlebells you own: a per-unit list like the dumbbells (dumbbell-inventory.test.js), read by
// kettlebell lifts only. A home rack of three bells is the case it is for: 12, 20 and 28 kg, where
// the 2.5 kg grid would ask for a 22.5 kg bell nobody has.
import { describe, expect, it } from 'vitest'
import { kettlebellsOf, ownsKettlebells, withKettlebells, bellsOf, ownedWeightsFor } from './dumbbells.js'
import { nextPrescription } from './progression.js'
import { buildSessionEntries } from './session-start.js'
import { isWarmupRow } from './workout-model.js'
import { mergeStates } from './sync-merge.js'
import { EXIDX } from './exercises.js'

const GOBLET = '0534'   // kettlebell goblet squat
const CURL = '0294'     // dumbbell biceps curl
const BELLS = [12, 20, 28]

describe('the kettlebell inventory', () => {
  it('the exercises used here are what the test assumes', () => {
    expect(EXIDX[GOBLET].eq).toBe('kettlebell')
    expect(EXIDX[CURL].eq).toBe('dumbbell')
  })

  it('is kept per unit, sorted, without doubles, and stamped', () => {
    const S = { unit: 'kg', kettlebells: { lb: { weights: [35, 53], _ts: 1 } } }
    const next = withKettlebells(S, [28, 12, 20, 12], 7)
    expect(next.kg).toEqual({ weights: BELLS, _ts: 7 })
    expect(next.lb).toEqual({ weights: [35, 53], _ts: 1 })
    expect(kettlebellsOf({ ...S, kettlebells: next })).toEqual(BELLS)
    expect(ownsKettlebells({ unit: 'kg', kettlebells: withKettlebells(S, [], 8) })).toBe(false)
  })

  it('applies to kettlebell lifts, and the dumbbell list to dumbbell lifts', () => {
    const S = { unit: 'kg', kettlebells: { kg: { weights: BELLS, _ts: 1 } }, dumbbells: { kg: { weights: [2, 4, 6], _ts: 1 } } }
    expect(ownedWeightsFor(S, { id: GOBLET })).toEqual(BELLS)
    expect(ownedWeightsFor(S, { id: CURL })).toEqual([2, 4, 6])
    expect(bellsOf(S, 'barbell')).toEqual([])
    // A dumbbell list alone leaves kettlebell lifts on their increment, and the other way round.
    expect(ownedWeightsFor({ ...S, kettlebells: {} }, { id: GOBLET })).toBe(null)
    expect(ownedWeightsFor({ ...S, dumbbells: {} }, { id: CURL })).toBe(null)
  })

  it('keeps the list edited last on either device', () => {
    const base = { unit: 'kg', workouts: [], routines: [], exWeights: {} }
    const phone = { ...base, _ts: 10, kettlebells: { kg: { weights: BELLS, _ts: 10 } } }
    const laptop = { ...base, _ts: 20, kettlebells: { kg: { weights: [12, 20], _ts: 5 } } }
    expect(mergeStates(laptop, phone).kettlebells.kg.weights).toEqual(BELLS)
  })
})

describe('linear progression over three bells', () => {
  it('goes to the next bell, not up the grid', () => {
    const c = { id: GOBLET, sets: 3, reps: 8, weight: 20, inc: 2.5, mode: 'reps', prog: 'linear' }
    const S = {
      unit: 'kg', exWeights: {}, routines: [], kettlebells: { kg: { weights: BELLS, _ts: 1 } },
      workouts: [{ id: 'w1', d: '2026-01-01', entries: [{ id: GOBLET, target: { sets: 3, reps: 8, mode: 'reps' }, sets: [8, 8, 8].map(r => ({ w: 20, r, done: true })) }] }],
    }
    expect(nextPrescription(S, c).weight).toBe(28)
  })
})

describe('triple progression over three bells', () => {
  // 3 to 5 sets of 6 to 10: the reps climb, then the sets, then the next bell, which is a jump
  // of 8 kg here and has to start again at the bottom.
  const cfg = { id: GOBLET, sets: 3, setsMax: 5, reps: 10, repsMin: 6, weight: 20, inc: 2.5, mode: 'reps', prog: 'triple' }
  const routine = { id: 'r', name: 'A', ex: [cfg] }
  let day = 0
  const fresh = () => { day = 0; return { unit: 'kg', workouts: [], exWeights: {}, routines: [routine], kettlebells: { kg: { weights: BELLS, _ts: 1 } } } }
  // One session built from the routine, every work set lifted with `lift(aim)` reps.
  const train = (st, lift = aim => aim) => {
    const [entry] = buildSessionEntries(st, routine)
    const sets = entry.sets.map(s => (isWarmupRow(s) ? { ...s, done: true } : { ...s, r: lift(s.r), done: true }))
    day++
    const w = { d: `2026-01-${String(day).padStart(2, '0')}`, routineId: 'r', entries: [{ ...entry, rid: 'r', sets }] }
    return { st: { ...st, workouts: [...st.workouts, w] }, entry }
  }
  const climb = st => {
    for (let i = 0; i < 40; i++) {
      const p = nextPrescription(st, cfg, routine)
      if (p.weight !== undefined && st.workouts.length && p.weight !== st.workouts.at(-1).entries[0].sets.at(-1).w) return { st, p }
      st = train(st).st
    }
    throw new Error('never raised')
  }

  it('raises to the next bell, says how much, and starts the cycle again', () => {
    const { p } = climb(fresh())
    expect(p.kind).toBe('up')
    expect(p.weight).toBe(28)
    expect(p.rowReps).toEqual([6, 6, 6])
    expect(p.why[2]).toBe(8)
  })

  it('holds at the heaviest bell instead of promising one', () => {
    let { st } = climb(fresh())
    let p
    for (let i = 0; i < 40; i++) {
      st = train(st).st
      p = nextPrescription(st, cfg, routine)
      if (p.why[0].includes('heaviest')) break
    }
    expect(p.kind).toBe('hold')
    expect(p.weight).toBe(28)
    expect(p.rowReps).toEqual([10, 10, 10, 10, 10])
    expect(p.why[0]).toMatch(/heaviest kettlebell/)
  })

  it('deloads onto a bell you own', () => {
    let { st } = climb(fresh())
    st = train(st).st
    for (let i = 0; i < 3; i++) st = train(st, () => 3).st
    const p = nextPrescription(st, cfg, routine)
    expect(p.kind).toBe('deload')
    expect(BELLS).toContain(p.weight)
    expect(p.weight).toBeLessThan(28)
  })
})

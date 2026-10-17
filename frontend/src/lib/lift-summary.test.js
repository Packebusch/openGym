import { describe, expect, it } from 'vitest'
import { liftSeries, liftSummaries, trendOf } from './lift-summary.js'

const BENCH = '0025', ASSISTED = '0017', PUSHUP = '0662'
const set = (w, r, done = true) => ({ w, r, done })
const entry = (id, sets, mode = 'reps') => ({ id, target: { mode, sets: sets.length, reps: 8, weight: sets[0].w || 0 }, sets })
const workout = (d, ...entries) => ({ id: 'w' + d, d, start: Date.parse(d + 'T10:00:00Z'), entries })
const S = workouts => ({ workouts, unit: 'kg' })

describe('an exercise\'s series, in the metric its chart opens on', () => {
  it('best set weight per session for loaded work', () => {
    const s = S([workout('2026-01-01', entry(BENCH, [set(60, 5), set(62.5, 5)])), workout('2026-01-03', entry(BENCH, [set(65, 3)]))])
    expect(liftSeries(s, BENCH).points.map(p => p.y)).toEqual([62.5, 65])
  })

  it('reps for work that was never loaded', () => {
    const s = S([workout('2026-01-01', entry(PUSHUP, [set(0, 12), set(0, 15)])), workout('2026-01-03', entry(PUSHUP, [set(0, 18)]))])
    const series = liftSeries(s, PUSHUP)
    expect(series.repsOnly).toBe(true)
    expect(series.points.map(p => p.y)).toEqual([15, 18])
  })

  it('skips unfinished sets and sessions without the exercise', () => {
    const s = S([workout('2026-01-01', entry(BENCH, [set(100, 5, false), set(60, 5)])), workout('2026-01-02', entry('0031', [set(40, 8)]))])
    expect(liftSeries(s, BENCH).points.map(p => p.y)).toEqual([60])
  })
})

describe('which way it is going', () => {
  const pts = (...ys) => ys.map((y, i) => ({ t: i, d: '', y }))
  it('the latest session against the few before it', () => {
    expect(trendOf(BENCH, pts(60, 60, 60, 62.5), { weighted: true })).toBe(1)
    expect(trendOf(BENCH, pts(60, 62.5, 65, 55), { weighted: true })).toBe(-1)
    expect(trendOf(BENCH, pts(60, 60), { weighted: true })).toBe(0)
    expect(trendOf(BENCH, pts(60))).toBe(0)
  })
  it('less help is better on an assistance machine', () => {
    expect(trendOf(ASSISTED, pts(30, 30, 25), { weighted: true })).toBe(1)
    expect(trendOf(ASSISTED, pts(25, 25, 30), { weighted: true })).toBe(-1)
  })
})

describe('the lifts list', () => {
  it('most recently trained first, with latest, best and trend', () => {
    const s = S([
      workout('2026-01-01', entry(BENCH, [set(60, 5)]), entry(ASSISTED, [set(30, 8)])),
      workout('2026-01-03', entry(BENCH, [set(65, 5)])),
      workout('2026-01-05', entry(ASSISTED, [set(25, 8)])),
    ])
    const rows = liftSummaries(s)
    expect(rows.map(r => r.id)).toEqual([ASSISTED, BENCH])
    expect(rows[0]).toMatchObject({ last: 25, best: 25, trend: 1, lastD: '2026-01-05' })
    expect(rows[1]).toMatchObject({ last: 65, best: 65, trend: 1, lastD: '2026-01-03' })
  })

  it('leaves out an exercise with nothing finished', () => {
    const s = S([workout('2026-01-01', entry(BENCH, [set(60, 5, false)]))])
    expect(liftSummaries(s)).toEqual([])
  })

  it('draws at most the last eight sessions', () => {
    const s = S(Array.from({ length: 12 }, (_, i) => workout(`2026-01-${String(i + 1).padStart(2, '0')}`, entry(BENCH, [set(40 + i, 5)]))))
    const [row] = liftSummaries(s)
    expect(row.curve).toHaveLength(8)
    expect(row.curve[0].y).toBe(44)
    expect(row.best).toBe(51)
  })
})

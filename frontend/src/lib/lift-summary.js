// "Your lifts" on Progress (design audit, proposal 6): one line per exercise you have logged — its
// latest figure, its best, a short curve and which way it is going — so "am I getting stronger at
// X?" is answered on the first screen. The figure is the one the exercise's chart opens on
// (views/Stats.jsx ExerciseProgress): the best set weight, reps for work that was never loaded, the
// longest hold, the top speed. Read only; nothing here is stored.
import { metricEntriesForExercise, bestWeightForEntry, completedRepsOf } from './history.js'
import { betterWeight } from './exercises.js'
import { workoutAs, currentDbLoad } from './dumbbells.js'
import { toSpeed } from './speed.js'

// How many sessions a row's curve draws, and how many before the latest its trend is held against.
export const CURVE_POINTS = 8
const TREND_BASE = 3

/**
 * The exercise's history in the metric its chart opens on.
 * `{ mode, repsOnly, points: [{ t, d, y }] }`, oldest first; `points` is empty with nothing logged.
 */
export function liftSeries(S, id, { speedUnit } = {}) {
  const workouts = S.workouts || []
  const meant = currentDbLoad(S, id)
  const data = workouts.map(w => {
    const entries = metricEntriesForExercise(workoutAs(w, id, meant), id)
    const mode = entries.at(-1)?.mode || null
    const same = entries.filter(e => e.mode === mode)
    return { w, mode, entries: same, rows: same.flatMap(e => e.rows) }
  })
  // The mode the exercise is logged in now; sessions in another mode are another curve.
  const mode = data.findLast(x => x.mode)?.mode || null
  if (!mode) return { mode: null, repsOnly: false, points: [] }
  const repsOnly = mode === 'reps' && !data.some(x => x.entries.some(e => bestWeightForEntry(e.entry) > 0))
  const points = []
  for (const x of data) {
    if (x.mode !== mode) continue
    let y = 0
    if (mode === 'reps' && !repsOnly) {
      y = x.entries.reduce((best, e) => {
        const c = bestWeightForEntry(e.entry)
        return c > 0 ? (best > 0 ? betterWeight(id, best, c) : c) : best
      }, 0)
    } else if (mode === 'reps') y = Math.max(0, ...x.rows.map(completedRepsOf))
    else if (mode === 'time') y = Math.max(0, ...x.rows.map(s => s.sec || 0))
    else if (mode === 'cardio') y = Math.max(0, ...x.rows.map(s => toSpeed(s.speed || 0, speedUnit)))
    if (y > 0) points.push({ t: x.w.start, d: x.w.d, y })
  }
  return { mode, repsOnly, points }
}

/**
 * Which way an exercise is going: the latest session against the average of the few before it.
 * 1 better, -1 worse, 0 level or too little to tell. On an assistance machine less help is better.
 */
export function trendOf(id, points, { weighted = false } = {}) {
  if (points.length < 2) return 0
  const last = points.at(-1).y
  const base = points.slice(-1 - TREND_BASE, -1)
  const avg = base.reduce((n, p) => n + p.y, 0) / base.length
  if (Math.abs(last - avg) < 1e-9) return 0
  const better = weighted ? betterWeight(id, last, avg) === last : last > avg
  return better ? 1 : -1
}

/**
 * Every exercise with a logged figure, most recently trained first:
 * `{ id, mode, repsOnly, last, best, lastD, trend, curve }` — `curve` the last CURVE_POINTS points.
 */
export function liftSummaries(S, { speedUnit } = {}) {
  const ids = []
  const seen = new Set()
  const workouts = S.workouts || []
  for (let i = workouts.length - 1; i >= 0; i--) {
    for (const e of workouts[i]?.entries || []) {
      if (e?.id == null || seen.has(e.id)) continue
      seen.add(e.id)
      ids.push(e.id)
    }
  }
  const out = []
  for (const id of ids) {
    const { mode, repsOnly, points } = liftSeries(S, id, { speedUnit })
    if (!points.length) continue
    const weighted = mode === 'reps' && !repsOnly
    const best = points.reduce((b, p) => (weighted ? betterWeight(id, b, p.y) : Math.max(b, p.y)), points[0].y)
    out.push({
      id, mode, repsOnly,
      last: points.at(-1).y, best, lastD: points.at(-1).d,
      trend: trendOf(id, points, { weighted }),
      curve: points.slice(-CURVE_POINTS),
    })
  }
  return out
}

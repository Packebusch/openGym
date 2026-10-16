// What a planned session holds, read before it starts: the Home today row's one-line summary and
// the preview sheet behind it. The sheet's numbers are the ones the session would open with —
// built through buildCombinedEntries, the same path beginWorkout takes — so "3 × 5 · 82.5 kg"
// in the preview is what the rows say once you tap Start, never a second reading of the plan.
// Nothing here is stored: a preview is built, shown and dropped.
import { buildCombinedEntries } from './session-merge.js'
import { exLine, supersetUnits } from './history.js'
import { isWarmupRow } from './workout-model.js'
import { exOr } from './exercises.js'

/**
 * The exercise ids a set of routines holds, in session order (routine by routine), with a
 * routine listed twice read once — the way buildCombinedEntries de-duplicates them. Only reads
 * the routines, so it is cheap enough for a row that renders on every Home visit.
 */
export function routineExerciseIds(routines) {
  const seen = new Set()
  return (routines || []).filter(r => r && !seen.has(r.id) && seen.add(r.id)).flatMap(r => (r.ex || []).map(cfg => cfg.id))
}

/** The first `n` of a list and how many it leaves out: "Bench · Row · Squat · +2 more". */
export function firstOf(ids, n = 3) {
  const list = ids || []
  // One left over reads better as its name than as "+1 more".
  const shown = list.length === n + 1 ? list : list.slice(0, n)
  return { shown, more: list.length - shown.length }
}

/**
 * The session `routineIds` would start right now, as the preview sheet lists it.
 * - `items`: one per exercise, in session order — `line` is today's prescription in the routine
 *   editor's words (exLine over the built target), `kind` the progression's decision ('up',
 *   'deload', …) and `warmups` the ramp rows the session opens with.
 * - `units`: indexes into `items`, a superset's exercises together (supersetUnits).
 * - `muscles`: the main target muscles by work sets, most first, at most `maxMuscles`.
 * - `sets`: the work sets in all.
 */
export function sessionPreview(st, routineIds, { speedUnit, maxMuscles = 3 } = {}) {
  const { entries, routines } = buildCombinedEntries(st, routineIds)
  const items = entries.map(e => {
    const work = e.sets.filter(s => !isWarmupRow(s)).length
    return {
      id: e.id, rid: e.rid, sg: e.sg,
      line: exLine(e.target, st.unit, speedUnit),
      kind: e.noProg ? 'off' : e.plan?.kind || 'off',
      warmups: e.sets.length - work,
      work,
    }
  })
  const load = new Map()
  for (const it of items) {
    const ex = exOr(it.id)
    const key = ex?.tg || ex?.bp
    if (key) load.set(key, (load.get(key) || 0) + it.work)
  }
  const muscles = [...load].sort((a, b) => b[1] - a[1]).slice(0, maxMuscles).map(([k]) => k)
  return {
    routines, items, units: supersetUnits(items), muscles,
    sets: items.reduce((n, it) => n + it.work, 0),
  }
}

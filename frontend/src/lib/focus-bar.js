// The Focus layout's Done bar (design audit, proposal 4): the one set to do next, in the thumb's
// reach at the bottom of the screen, ticked in one tap. In a superset the next set is read round
// by round — A1, B1, A2, B2 — the order the bar sees them. Pure: views/Workout.jsx renders it.
import { isSideSet, isWarmupRow } from './workout-model.js'

/**
 * The next unticked set of the unit on screen: `{ idx, i, n, of }` — the entry, the row, and the
 * row's number among that entry's work sets (warm-ups numbered on their own) — or null when the
 * unit is done. `tickable` says whether one tap can finish it: a per-side set has two ticks, and
 * a hold or a cardio row has its own clock to run, so those stay on their row.
 */
export function focusTarget(entries, unit, modeOf = () => 'reps') {
  if (!Array.isArray(entries) || !Array.isArray(unit) || !unit.length) return null
  const rounds = Math.max(0, ...unit.map(idx => entries[idx]?.sets?.length || 0))
  for (let i = 0; i < rounds; i++) {
    for (const idx of unit) {
      const sets = entries[idx]?.sets || []
      const row = sets[i]
      if (!row || row.done) continue
      const warm = isWarmupRow(row)
      const same = sets.slice(0, i + 1).filter(s => isWarmupRow(s) === warm)
      return {
        idx, i, warmup: warm,
        n: same.length, of: sets.filter(s => isWarmupRow(s) === warm).length,
        tickable: !isSideSet(row) && modeOf(idx) === 'reps',
      }
    }
  }
  return null
}

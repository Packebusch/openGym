// Moving a planned session to another day (design audit, flow F5): one intent, where it used to
// take two day sheets — plan the routine on the new day, then set the old one to rest. Both are
// ordinary day overrides (S.dayPlan), so a move reads, syncs and undoes like any reschedule.
import { effectiveRoutineIds } from './history.js'
import { queueOf } from './queue.js'

/**
 * Whether the session planned on `iso` can be moved as one: a single routine, on a fixed week.
 * A combined day has no one override that holds it, and a rotation's next session stays next
 * whatever the day, so there is nothing to move.
 */
export function canMoveSession(S, iso) {
  if (queueOf(S)) return false
  return effectiveRoutineIds(S, iso).length === 1
}

/**
 * Moves the session planned on `from` to `to`, in place. Returns what the two days held before
 * (for an Undo), or null when there is nothing to move.
 */
export function moveSession(S, from, to) {
  if (from === to || !canMoveSession(S, from)) return null
  const [id] = effectiveRoutineIds(S, from)
  const before = { [from]: S.dayPlan[from], [to]: S.dayPlan[to] }
  S.dayPlan = { ...S.dayPlan, [to]: id, [from]: 'rest' }
  return before
}

/** Puts the two days back as `moveSession` found them. */
export function undoMove(S, before) {
  const next = { ...S.dayPlan }
  for (const [iso, v] of Object.entries(before)) {
    if (v === undefined) delete next[iso]
    else next[iso] = v
  }
  S.dayPlan = next
}

// The first run (design audit, proposal 10): three short steps between signing in and a Today
// screen with session 1 ready — how often and how experienced, which program, and the setup the
// numbers depend on. Pure helpers here; the screens are views/FirstRun.jsx.

/**
 * Whether this profile should see the first run: it has never finished or skipped it and holds
 * nothing of its own yet. A profile with a routine or a workout — every one made before this
 * existed — never sees it.
 */
export function needsFirstRun(S) {
  if (!S || S.setupDone) return false
  return !(S.routines || []).length && !(S.workouts || []).length && !S.active
}

/**
 * The starter plan that fits how often you can train and how long you have lifted. A newcomer on
 * three days gets full body, which repeats each lift often enough to learn it; someone who knows
 * the barbell lifts gets 5×5 on three days; four days is an upper/lower split; five or more, the
 * push/pull/legs split, the one that spreads over that many days.
 */
export function recommendPlan({ days, experienced }) {
  if (days >= 5) return 'ppl'
  if (days === 4) return 'upper-lower'
  return experienced ? '5x5' : 'full-body'
}

// Where you train, as the equipment an exercise may ask for (lib/equipment.js). A gym has it all,
// so it needs no profile; the other two become one, and the plan is fitted to it.
export const PLACES = {
  gym: null,
  home: ['dumbbell', 'body weight', 'bench'],
  bodyweight: ['body weight', 'pull-up bar'],
}

// Which optional control groups the workout screen shows besides the sets themselves. Design
// audit, proposal 5: five of the six were switches under Settings → Workout → Fine-tuning, each
// doubling the screens to design and test; they are fixed now, at what most people had. Swipe is
// the one left to choose, since a gesture you did not mean costs a set. A stored `S.wc` from
// before keeps syncing untouched — only `swipeSets` is still read from it.
// Lives in its own module so views can read it without the store — the store's DEF only
// references it.
export const WC_DEFAULT = Object.freeze({
  steppers: true,         // +/- buttons on every weight/reps/effort field
  setShortcuts: false,    // drop / burst live on the set number's menu
  pairButtons: false,     // superset with previous/next lives on the exercise's ⋯ menu
  exerciseButtons: false, // move, swap and remove live on the exercise's ⋯ menu
  exerciseChips: true,    // the numbered chip per exercise at the top of the workout (#323)
  swipeSets: true,        // swipe actions: a set row (start deletes with Undo, end copies) and, despite the
                          // name, Plan's routines, loop and routine exercises too (Settings: "Swipe actions")
})

export function workoutControls(S) {
  const own = (S && S.wc) || {}
  return { ...WC_DEFAULT, swipeSets: own.swipeSets ?? WC_DEFAULT.swipeSets }
}

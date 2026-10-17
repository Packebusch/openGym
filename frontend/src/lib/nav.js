// Lets non-component modules (sheet flows) navigate. App registers the router's navigate.
let _nav = () => {}
export const setNav = fn => { _nav = fn }
// `opts` goes to the router as is ({ replace: true }).
export const nav = (to, opts) => (opts ? _nav(to, opts) : _nav(to))

// Every open sheet sits on a history entry of its own (Modals.jsx), and closing it walks back
// only while the page is still where the sheet opened. A sheet that closes and moves to another
// page at once left that entry behind: back from the new page landed on it, the same page with
// no sheet, and the next back seemed to do nothing. The new page takes the sheet's entry instead.
export const onSheetEntry = () => {
  try { return !!globalThis.history?.state?.openGymSheet } catch { return false }
}

export function closeThenNav(close, to) {
  const replace = onSheetEntry()
  close()
  nav(to, replace ? { replace: true } : undefined)
}

// Into the workout screen: from the routine chooser (already #/workout) or from a sheet's entry,
// the session takes that entry, so one back leaves it rather than landing on itself.
export function navToWorkout() {
  const here = String(globalThis.location?.hash || '').startsWith('#/workout')
  nav('/workout', here || onSheetEntry() ? { replace: true } : undefined)
}

// A screen's own back button (‹ in its header). It used to push the parent route, so the stack
// grew Plan > Edit > Plan > Edit and Android's back walked through all of it. Now it goes back
// when the page we came from is the parent, and otherwise takes the parent's place in history —
// opened from somewhere else (a link, after a save that navigated here), there is nothing to
// walk back to that the button promises. App reports every route change through notePath.
let paths = [null, null]
export const notePath = p => { if (p !== paths[1]) paths = [paths[1], p] }
export function goBack(up) {
  let idx = 0
  try { idx = globalThis.history?.state?.idx || 0 } catch { /* no history */ }
  if (idx > 0 && paths[0] === up) _nav(-1)
  else _nav(up, { replace: true })
}

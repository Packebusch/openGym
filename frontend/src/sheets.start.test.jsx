// @vitest-environment happy-dom
// The Start sheet (design audit, proposals 1 and 2): every Start lands here. Today's plan is
// picked already; another routine or freestyle is one tap away; the weigh-in is part of the sheet
// — filled in and saved with Start when the profile asks for it, a chip when it does not.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { DEF, useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { startSheet } from './sheets.jsx'
import { todayISO } from './lib/format.js'

vi.mock('./lib/nav.js', async orig => ({ ...(await orig()), nav: vi.fn(), navToWorkout: vi.fn() }))
import { nav } from './lib/nav.js'

const clone = v => JSON.parse(JSON.stringify(v))
const S = () => useStore.getState().S
const BENCH = '0025', ROW = '0031'
const mounted = []

function install(over = {}) {
  const st = clone(DEF)
  st.routines = [
    { id: 'push', name: 'Push', prog: 'off', ex: [{ id: BENCH, sets: 3, reps: 5, weight: 60 }] },
    { id: 'pull', name: 'Pull', prog: 'off', ex: [{ id: ROW, sets: 3, reps: 8, weight: 40 }] },
  ]
  st.week = { [new Date().getDay()]: ['push'] }
  st.weighIn = false
  st.bodyweight = []
  Object.assign(st, over)
  useStore.setState({ S: st, user: null })
}
function open(pick) {
  act(() => startSheet(pick))
  const sheet = useUI.getState().sheets.at(-1)
  if (!sheet) return null
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted.push(root)
  act(() => root.render(sheet.render(() => useUI.getState().closeSheet(sheet.id))))
  return host
}
const options = host => [...host.querySelectorAll('[role="radio"]')]
const picked = host => options(host).find(o => o.getAttribute('aria-checked') === 'true')?.querySelector('.tt').textContent
const go = host => [...host.querySelectorAll('.btn.primary')].at(-1)
const click = el => act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })) })

beforeEach(() => { localStorage.clear(); nav.mockClear(); useUI.setState({ sheets: [], timer: null, work: null }) })
afterEach(() => { mounted.splice(0).forEach(r => act(() => r.unmount())); document.body.innerHTML = '' })

describe('the Start sheet', () => {
  it('has today\'s plan picked, the other routines and freestyle under it', () => {
    install()
    const host = open()
    expect(options(host).map(o => o.querySelector('.tt').textContent)).toEqual(['Push', 'Pull', 'Freestyle'])
    expect(picked(host)).toBe('Push')
    expect(go(host).textContent).toBe('Start Push')
  })

  it('starts what is picked, and closes', () => {
    install()
    const host = open()
    click(options(host)[1])
    expect(go(host).textContent).toBe('Start Pull')
    click(go(host))
    expect(S().active.routineIds).toEqual(['pull'])
    expect(useUI.getState().sheets.length).toBe(0)
  })

  it('freestyle starts an empty session', () => {
    install()
    const host = open()
    click(options(host)[2])
    expect(go(host).textContent).toBe('Start freestyle workout')
    click(go(host))
    expect(S().active.routineIds).toEqual([])
    expect(S().active.entries).toEqual([])
  })

  it('opens with the routines it was handed, not today\'s', () => {
    install()
    expect(picked(open(['pull']))).toBe('Pull')
  })

  it('on a rest day freestyle is picked', () => {
    install({ week: {} })
    const host = open()
    expect(picked(host)).toBe('Freestyle')
  })

  it('with a session running, goes back to it instead', () => {
    install({ active: { id: 'a', name: 'Push', start: Date.now(), cur: 0, entries: [] } })
    expect(open()).toBeNull()
    expect(nav).toHaveBeenCalledWith('/workout')
  })
})

describe('the weigh-in, inside the Start sheet', () => {
  it('asked for: the field is there, and Start saves it onto today and the session', () => {
    install({ weighIn: true, bodyweight: [{ d: '2026-01-01', w: 80, t: 1 }] })
    const host = open()
    expect(host.querySelector('.start-weigh .bwstep')).not.toBeNull()
    click(go(host))
    expect(S().bodyweight.at(-1)).toMatchObject({ d: todayISO(), w: 80 })
    expect(S().active.bw).toBe(80)
  })

  it('Skip today starts without one', () => {
    install({ weighIn: true, bodyweight: [{ d: '2026-01-01', w: 80, t: 1 }] })
    const host = open()
    click([...host.querySelectorAll('.start-weigh .chip')].find(b => b.textContent === 'Skip today'))
    expect(host.querySelector('.start-weigh .bwstep')).toBeNull()
    click(go(host))
    expect(S().bodyweight).toHaveLength(1)
    expect(S().active.bw).toBe(null)
  })

  it('not asked for: a chip offers it, and nothing is saved without it', () => {
    install()
    const host = open()
    const chip = host.querySelector('.start-weigh > .chip')
    expect(chip.textContent).toBe('Log body weight')
    click(go(host))
    expect(S().bodyweight).toEqual([])
    expect(S().active.bw).toBe(null)
  })

  it('already weighed in today: says so and carries it onto the session', () => {
    install({ weighIn: true, bodyweight: [{ d: todayISO(), w: 77.5, t: 1 }] })
    const host = open()
    expect(host.querySelector('.start-weigh .bwstep')).toBeNull()
    expect(host.querySelector('.start-weigh').textContent).toBe('Weighed in today: 77.5 kg')
    click(go(host))
    expect(S().active.bw).toBe(77.5)
  })
})

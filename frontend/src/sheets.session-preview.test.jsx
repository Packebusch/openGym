// @vitest-environment happy-dom
// The preview sheet behind Home's today row and the coach week's chips: what a planned session
// holds, read before it starts, with Start at the bottom. Its numbers come from
// lib/session-preview.js (tested there); this covers what the sheet shows and that Start starts
// exactly the routines it was opened for.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { DEF, useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { sessionPreviewSheet } from './sheets.jsx'
import { exOr } from './lib/exercises.js'
import { exerciseNameFor } from './lib/i18n.js'

const clone = v => JSON.parse(JSON.stringify(v))
const S = () => useStore.getState().S
const BENCH = '0025', ROW = '0031', CRUNCH = '0047'
const mounted = []

function install(routines) {
  const st = clone(DEF)
  st.routines = routines
  st.weighIn = false
  useStore.setState({ S: st, user: null })
}
function openSheet(ids) {
  act(() => sessionPreviewSheet(ids))
  return renderTop()
}
function renderTop() {
  const sheet = useUI.getState().sheets.at(-1)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted.push(root)
  act(() => root.render(sheet.render(() => useUI.getState().closeSheet(sheet.id))))
  return host
}

beforeEach(() => { localStorage.clear(); useUI.setState({ sheets: [], timer: null, work: null }) })
afterEach(() => { mounted.splice(0).forEach(r => act(() => r.unmount())); document.body.innerHTML = '' })

describe('the session preview sheet', () => {
  it('lists every exercise with today\'s prescription, a superset together', () => {
    install([{ id: 'p', name: 'Push', prog: 'off', ex: [
      { id: BENCH, sets: 3, reps: 5, weight: 60, sg: 'g' }, { id: ROW, sets: 3, reps: 8, weight: 40, sg: 'g' }, { id: CRUNCH, sets: 2, reps: 12 },
    ] }])
    const host = openSheet(['p'])
    expect(host.querySelector('h3').textContent).toBe('Push')
    const names = [...host.querySelectorAll('.item .tt')].map(e => e.textContent)
    expect(names).toEqual([BENCH, ROW, CRUNCH].map(id => exerciseNameFor(exOr(id))))
    expect([...host.querySelectorAll('.item .ss')].map(e => e.textContent)).toEqual(['3 × 5 · 60 kg', '3 × 8 · 40 kg', '2 × 12'])
    const ss = host.querySelectorAll('.preview-ss')
    expect(ss.length).toBe(1)
    expect(ss[0].querySelectorAll('.item').length).toBe(2)
    expect(ss[0].textContent).toContain('Superset')
    expect(host.textContent).toContain('3 exercises')
    expect(host.textContent).toContain('8 sets')
  })

  it('names a combined day the way the session will be named', () => {
    install([
      { id: 'a', name: 'Strength', prog: 'off', ex: [{ id: BENCH, sets: 3, reps: 5, weight: 60 }] },
      { id: 'b', name: 'Core', prog: 'off', ex: [{ id: CRUNCH, sets: 2, reps: 12 }] },
    ])
    expect(openSheet(['a', 'b']).querySelector('h3').textContent).toBe('Strength + Core')
  })

  it('Start hands over to the Start sheet with exactly those routines picked', () => {
    install([
      { id: 'a', name: 'Strength', prog: 'off', ex: [{ id: BENCH, sets: 3, reps: 5, weight: 60 }] },
      { id: 'b', name: 'Core', prog: 'off', ex: [{ id: CRUNCH, sets: 2, reps: 12 }] },
    ])
    const host = openSheet(['b'])
    const start = [...host.querySelectorAll('button')].find(b => b.textContent.trim() === 'Start workout')
    act(() => { start.click() })
    // the preview is gone and the Start sheet is the one open sheet, Core picked
    expect(useUI.getState().sheets.length).toBe(1)
    const next = renderTop()
    const go = [...next.querySelectorAll('.btn.primary')].at(-1)
    expect(go.textContent).toBe('Start Core')
    act(() => { go.click() })
    expect(S().active?.routineIds).toEqual(['b'])
    expect(S().active.entries.map(e => e.id)).toEqual([CRUNCH])
  })
})

// @vitest-environment happy-dom
// Progress (design audit, proposals 6 and 7): lift-first. "Your lifts" lists every exercise with
// its latest figure, its best and its trend, a row opening that exercise's page; Body holds the
// weight, measurements and photos together; the view last looked at comes back.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Stats, { PROGRESS_VIEW_KEY } from './Stats.jsx'
import { exOr } from '../lib/exercises.js'
import { exerciseNameFor } from '../lib/i18n.js'

const mocks = vi.hoisted(() => ({ S: null, nav: null }))
vi.mock('../store/useStore.js', () => ({ useStore: Object.assign(selector => selector({ S: mocks.S }), { getState: () => ({ update: () => {} }) }) }))
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.nav, useParams: () => ({}) }))
vi.mock('../sheets.jsx', () => ({
  bwSheet: () => {}, goalSheet: () => {}, calendarSheet: () => {}, workoutDetailSheet: () => {}, exerciseHistorySheet: () => {},
  exerciseDetailSheet: () => {}, dayOverrideSheet: () => {}, weighInsSheet: () => {},
  WorkoutRow: ({ w }) => React.createElement('div', { className: 'wrow' }, w.name), bwDeltaColor: () => 'inherit',
}))
vi.mock('../components/LineChart.jsx', () => ({ default: () => null }))
vi.mock('../components/Heatmap.jsx', () => ({ default: () => null }))
vi.mock('../components/BodyMap.jsx', () => ({ default: () => null, BodyMapLegend: () => null }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const BENCH = '0025', ROW = '0031'
const set = (w, r) => ({ w, r, done: true })
const session = (d, ...entries) => ({ id: d, d, start: Date.parse(d + 'T10:00:00Z'), end: Date.parse(d + 'T11:00:00Z'), name: 'Push', entries })
const entry = (id, ...sets) => ({ id, target: { mode: 'reps', sets: sets.length, reps: 5, weight: sets[0].w }, sets })

let root, host
beforeEach(() => {
  localStorage.clear()
  mocks.nav = vi.fn()
  mocks.S = {
    unit: 'kg', body: 'male', effort: 'none', targetW: null, bodyweight: [], routines: [], exWeights: {}, measurements: [],
    workouts: [
      session('2026-09-01', entry(BENCH, set(60, 5)), entry(ROW, set(50, 8))),
      session('2026-09-04', entry(BENCH, set(62.5, 5))),
    ],
  }
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })
const mount = () => act(() => root.render(<Stats />))
const rows = () => [...host.querySelectorAll('.lift-row')]

describe('Progress — Your lifts', () => {
  it('opens on the lifts, most recently trained first, each with its latest and best', () => {
    mount()
    expect(rows().map(r => r.querySelector('.tt').textContent)).toEqual([BENCH, ROW].map(id => exerciseNameFor(exOr(id))))
    expect(rows()[0].querySelector('.ss').textContent).toMatch(/^62\.5 kg · best yet · /)
    expect(rows()[0].querySelector('.lift-trend').getAttribute('aria-label')).toBe('Going up')
    expect(rows()[1].querySelector('.lift-trend').getAttribute('aria-label')).toBe('Holding steady')
  })

  it('a row opens that exercise\'s page', () => {
    mount()
    act(() => { rows()[0].click() })
    expect(mocks.nav).toHaveBeenCalledWith('/stats/ex/' + BENCH)
  })

  it('switches to Body and remembers it', () => {
    mount()
    act(() => { [...host.querySelectorAll('.progress-views button')].find(b => b.textContent === 'Body').click() })
    expect(rows()).toHaveLength(0)
    expect(host.textContent).toContain('Body measurements')
    expect(host.textContent).toContain('Progress photos')
    expect(localStorage.getItem(PROGRESS_VIEW_KEY)).toBe('body')
  })
})

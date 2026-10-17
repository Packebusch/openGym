// @vitest-environment happy-dom
// Home's Today card (design audit, proposals 1 and 3): what today's session holds, with the first
// lifts and the numbers they open at; Start opens the one Start sheet with today picked, never a
// session at once; the card's ⋯ holds the whole session, moving it and skipping it.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { useStore } from '../store/useStore.js'
import { startSheet, startFlow, sessionPreviewSheet, menuSheet, moveSessionSheet } from '../sheets.jsx'
import { todayISO, exerciseNameText } from '../lib/format.js'
import { exOr } from '../lib/exercises.js'
import Home from './Home.jsx'

const nav = vi.fn()
vi.mock('react-router-dom', () => ({ useNavigate: () => nav }))
vi.mock('../sheets.jsx', () => ({
  starterPlanSheet: vi.fn(), bwSheet: vi.fn(), goalSheet: vi.fn(), dayOverrideSheet: vi.fn(),
  calendarSheet: vi.fn(), startFlow: vi.fn(), startSheet: vi.fn(), bwDeltaColor: () => '',
  sessionPreviewSheet: vi.fn(), menuSheet: vi.fn(), moveSessionSheet: vi.fn(), openDaySheet: vi.fn(),
}))

const IDS = ['0025', '0031', '0047', '0050', '0054', '0060']
const name = id => exerciseNameText(exOr(id))
const every = id => ({ 0: [id], 1: [id], 2: [id], 3: [id], 4: [id], 5: [id], 6: [id] })

let host, root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  for (const f of [nav, startSheet, startFlow, sessionPreviewSheet, menuSheet, moveSessionSheet]) f.mockClear()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })

const setS = (routines, over = {}) => useStore.setState(s => ({
  S: { ...s.S, routines, week: every(routines[0]?.id), dayPlan: {}, workouts: [], active: null, queue: null, rotation: null, scheduleMode: null, weighIn: false, ...over },
  user: null,
}))
const mount = () => act(() => root.render(<Home />))
const hero = () => host.querySelector('.hero')
const lifts = () => [...host.querySelectorAll('.hero-lift .grow')].map(e => e.textContent)
const more = () => host.querySelector('.hero-lifts .small')?.textContent
const primary = () => hero()?.querySelector('.btn.primary')
const click = el => act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })) })

describe('Home — the Today card', () => {
  it('names the first four lifts and counts the rest', () => {
    setS([{ id: 'r1', name: 'Push', ex: IDS.map(id => ({ id })) }])
    mount()
    expect(lifts()).toEqual(IDS.slice(0, 4).map(name))
    expect(more()).toBe('+2 more')
  })

  it('names a single leftover rather than counting it', () => {
    setS([{ id: 'r1', name: 'Push', ex: IDS.slice(0, 5).map(id => ({ id })) }])
    mount()
    expect(lifts()).toEqual(IDS.slice(0, 5).map(name))
    expect(more()).toBeUndefined()
  })

  it('Start opens the Start sheet with today picked, and starts nothing by itself', () => {
    setS([{ id: 'r1', name: 'Push', ex: [{ id: IDS[0] }] }])
    mount()
    expect(primary().textContent).toBe('Start Push')
    click(primary())
    expect(startSheet).toHaveBeenCalledWith(['r1'])
    expect(startFlow).not.toHaveBeenCalled()
  })

  it('a tap on the lifts opens the whole session', () => {
    setS([{ id: 'r1', name: 'Push', ex: [{ id: IDS[0] }] }])
    mount()
    click(host.querySelector('.hero-lifts'))
    expect(sessionPreviewSheet).toHaveBeenCalledWith(['r1'])
  })

  it('⋯ offers moving the session on a fixed week', () => {
    setS([{ id: 'r1', name: 'Push', ex: [{ id: IDS[0] }] }])
    mount()
    click(hero().querySelector('.iconbtn'))
    const labels = menuSheet.mock.calls[0][0].items.filter(Boolean).map(i => i.label)
    expect(labels).toEqual(['See all exercises', 'Move to another day', 'Train something else today', 'Skip today'])
  })

  it('a rest day says when you train next and still offers a workout', () => {
    setS([{ id: 'r1', name: 'Push', ex: [{ id: IDS[0] }] }], { week: { [(new Date().getDay() + 1) % 7]: ['r1'] } })
    mount()
    expect(hero().querySelector('.hero-name').textContent).toBe('Rest day')
    expect(hero().querySelector('.ss').textContent).toMatch(/^Next session: \w+, Push$/)
    const anyway = [...hero().querySelectorAll('button')].find(b => b.textContent === 'Start a workout anyway')
    click(anyway)
    expect(startSheet).toHaveBeenCalledWith()
  })

  it('once today\'s session is logged, it reads as done and offers another', () => {
    setS([{ id: 'r1', name: 'Push', ex: [{ id: IDS[0] }] }], {
      workouts: [{ id: 'w', d: todayISO(), start: Date.now() - 3600000, end: Date.now(), routineIds: ['r1'], routineId: 'r1', name: 'Push', entries: [] }],
    })
    mount()
    expect(hero().classList.contains('done')).toBe(true)
    expect(hero().querySelector('.hero-name').textContent).toBe('Push (done)')
    expect(lifts()).toEqual([])
  })

  it('a session in progress resumes', () => {
    setS([{ id: 'r1', name: 'Push', ex: [{ id: IDS[0] }] }], { active: { id: 'a', name: 'Push', start: Date.now(), cur: 0, entries: [] } })
    mount()
    expect(hero().querySelector('.hero-name').textContent).toBe('Push')
    click(primary())
    expect(nav).toHaveBeenCalledWith('/workout')
    expect(startSheet).not.toHaveBeenCalled()
  })

  it('reads an open editor on a saved workout as an edit', () => {
    setS([{ id: 'r1', name: 'Push', ex: [{ id: IDS[0] }] }], { active: { id: 'w', name: 'Push', start: 1000, cur: 0, entries: [], editingWorkoutId: 'w' } })
    mount()
    expect(hero().querySelector('.lbl2').textContent).toBe('Editing')
    expect(primary().textContent).toBe('Edit')
  })
})

// @vitest-environment happy-dom
// Home's today row says what the session holds, not just its name: the first few exercises under
// the title, a tap on the row opening the preview sheet, and the Start pill starting at once.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { useStore } from '../store/useStore.js'
import { startFlow, sessionPreviewSheet } from '../sheets.jsx'
import { todayISO } from '../lib/format.js'
import { exOr } from '../lib/exercises.js'
import { exerciseNameText } from '../lib/format.js'
import Home from './Home.jsx'

vi.mock('react-router-dom', () => ({ useNavigate: () => () => {} }))
vi.mock('../sheets.jsx', () => ({
  starterPlanSheet: vi.fn(), bwSheet: vi.fn(), goalSheet: vi.fn(), dayOverrideSheet: vi.fn(),
  calendarSheet: vi.fn(), startFlow: vi.fn(), bwDeltaColor: () => '', weighInsSheet: vi.fn(), sessionPreviewSheet: vi.fn(),
}))

const IDS = ['0025', '0031', '0047', '0050', '0054']
const name = id => exerciseNameText(exOr(id))
const every = id => ({ 0: [id], 1: [id], 2: [id], 3: [id], 4: [id], 5: [id], 6: [id] })

let host, root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  startFlow.mockClear(); sessionPreviewSheet.mockClear()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })

const setS = (routines, over = {}) => useStore.setState(s => ({
  S: { ...s.S, routines, week: every(routines[0].id), dayPlan: {}, workouts: [], active: null, queue: null, rotation: null, scheduleMode: null, ...over },
  user: null,
}))
const mount = () => act(() => root.render(<Home />))
const row = () => host.querySelector('.today-row')
const exline = () => host.querySelector('.today-row .exline')?.textContent
const click = el => act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })) })

describe('Home — what today\'s session holds', () => {
  it('names the first three exercises and counts the rest', () => {
    setS([{ id: 'r1', name: 'Push', ex: IDS.map(id => ({ id })) }])
    mount()
    expect(exline()).toBe([name(IDS[0]), name(IDS[1]), name(IDS[2]), '+2 more'].join(' · '))
  })

  it('names a single leftover rather than counting it', () => {
    setS([{ id: 'r1', name: 'Push', ex: IDS.slice(0, 4).map(id => ({ id })) }])
    mount()
    expect(exline()).toBe(IDS.slice(0, 4).map(name).join(' · '))
  })

  it('a tap on the row opens the preview and starts nothing', () => {
    setS([{ id: 'r1', name: 'Push', ex: [{ id: IDS[0] }] }])
    mount()
    click(row())
    expect(sessionPreviewSheet).toHaveBeenCalledWith(['r1'])
    expect(startFlow).not.toHaveBeenCalled()
  })

  it('Enter on the row opens the preview too', () => {
    setS([{ id: 'r1', name: 'Push', ex: [{ id: IDS[0] }] }])
    mount()
    act(() => { row().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })
    expect(sessionPreviewSheet).toHaveBeenCalledWith(['r1'])
  })

  it('the Start pill starts the session at once, without the preview', () => {
    setS([{ id: 'r1', name: 'Push', ex: [{ id: IDS[0] }] }])
    mount()
    const start = row().querySelector('button.today-start')
    expect(start.textContent).toBe('Start')
    click(start)
    expect(startFlow).toHaveBeenCalledWith(['r1'])
    expect(sessionPreviewSheet).not.toHaveBeenCalled()
  })

  it('drops the line once today\'s session is done, and on a rest day', () => {
    const today = todayISO()
    setS([{ id: 'r1', name: 'Push', ex: [{ id: IDS[0] }] }], {
      workouts: [{ id: 'w', d: today, start: Date.now() - 3600000, end: Date.now(), routineIds: ['r1'], routineId: 'r1', name: 'Push', entries: [] }],
    })
    mount()
    expect(exline()).toBeUndefined()
    act(() => setS([{ id: 'r1', name: 'Push', ex: [{ id: IDS[0] }] }], { week: {} }))
    expect(exline()).toBeUndefined()
  })

  it('a session in progress resumes, as before', () => {
    setS([{ id: 'r1', name: 'Push', ex: [{ id: IDS[0] }] }], { active: { id: 'a', name: 'Push', start: Date.now(), cur: 0, entries: [] } })
    mount()
    expect(exline()).toBeUndefined()
    click(row())
    expect(sessionPreviewSheet).not.toHaveBeenCalled()
  })
})

// @vitest-environment happy-dom
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { useStore } from '../store/useStore.js'
import Home from './Home.jsx'

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('../sheets.jsx', () => ({
  starterPlanSheet: vi.fn(), bwSheet: vi.fn(), goalSheet: vi.fn(), dayOverrideSheet: vi.fn(),
  calendarSheet: vi.fn(), startFlow: vi.fn(), startSheet: vi.fn(), bwDeltaColor: () => '', openDaySheet: vi.fn(), weighInsSheet: vi.fn(),
  menuSheet: vi.fn(), moveSessionSheet: vi.fn(), sessionPreviewSheet: vi.fn(),
}))

let host, root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })

// The card shows up once there is a curve to draw: two weigh-ins (design audit, proposal 3).
const TWO = [{ d: '2026-01-01', w: 80, t: 1 }, { d: '2026-01-02', w: 79, t: 2 }]
const mountWith = (showWeightCard, bodyweight = TWO) => {
  useStore.setState(s => ({
    S: { ...s.S, routines: [], workouts: [], bodyweight, dayPlan: {}, week: {}, active: null, showWeightCard },
    user: null,
  }))
  act(() => root.render(<Home />))
}
const weightHeading = () => [...host.querySelectorAll('h2')].find(el => el.textContent === 'Body weight')

describe('Home body-weight card preference', () => {
  it('shows the card for legacy profiles without the preference', () => {
    mountWith(undefined)
    expect(weightHeading()).toBeTruthy()
  })

  it('shows the card when enabled', () => {
    mountWith(true)
    expect(weightHeading()).toBeTruthy()
  })

  it('hides only the Home card when disabled', () => {
    mountWith(false)
    expect(weightHeading()).toBeFalsy()
  })

  it('waits for a second weigh-in: one point is not a curve', () => {
    mountWith(true, [])
    expect(weightHeading()).toBeFalsy()
    act(() => root.unmount()); root = createRoot(host)
    mountWith(true, TWO.slice(0, 1))
    expect(weightHeading()).toBeFalsy()
  })
})
describe('Home body-weight card delta', () => {
  const mountBW = startW => {
    useStore.setState(s => ({
      S: { ...s.S, routines: [], workouts: [], dayPlan: {}, week: {}, active: null, showWeightCard: true, unit: 'kg', startW,
        bodyweight: [{ d: '2026-01-01', w: 80, t: 1 }, { d: '2026-01-02', w: 79, t: 2 }, { d: '2026-01-03', w: 81, t: 3 }] },
      user: null,
    }))
    act(() => root.render(<Home />))
  }
  const deltaText = () => weightHeading().closest('.card').querySelector('.big').parentElement.textContent

  it('measures from the weigh-in before without a starting weight', () => {
    mountBW(null)
    expect(deltaText()).toContain('2')
    expect(deltaText()).not.toContain('since start')
  })

  it('measures from the starting weight once one is set', () => {
    mountBW(84)
    expect(deltaText()).toContain('3 since start')
  })
})

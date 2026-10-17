// @vitest-environment happy-dom
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { todayISO } from '../lib/format.js'
import Home from './Home.jsx'

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))

const mounted = []
const mount = el => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted.push(root)
  act(() => root.render(el))
  return host
}
const renderTop = () => {
  const sheet = useUI.getState().sheets.at(-1)
  return mount(sheet.render(() => useUI.getState().closeSheet(sheet.id)))
}
const workout = (id, name, day, hour) => {
  const start = new Date(day + 'T' + String(hour).padStart(2, '0') + ':00:00').getTime()
  return { id, d: day, start, end: start + 45 * 60000, name, vol: 1000, entries: [] }
}

describe('Home week strip', () => {
  let original
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    original = useStore.getState().S
    useUI.setState({ sheets: [] })
    document.body.innerHTML = ''
  })
  afterEach(() => {
    act(() => { mounted.splice(0).forEach(root => root.unmount()) })
    useStore.setState({ S: original })
  })

  const tapToday = workouts => {
    useStore.setState(s => ({ S: { ...original, routines: [], dayPlan: {}, week: {}, active: null, workouts }, user: null }))
    const home = mount(<Home />)
    act(() => home.querySelector('.wday.today').click())
    return renderTop()
  }

  it('opens the workout on a trained day, not the plan sheet', () => {
    const sheet = tapToday([workout('a', 'Push Day', todayISO(), 9)])
    expect(sheet.textContent).toContain('Push Day')
    expect(useUI.getState().sheets).toHaveLength(1)
  })

  it('lists every workout on a day with several', () => {
    const sheet = tapToday([workout('a', 'Push Day', todayISO(), 9), workout('b', 'Pull Day', todayISO(), 18)])
    expect(sheet.textContent).toContain('Push Day')
    expect(sheet.textContent).toContain('Pull Day')
  })

  it('still opens the plan sheet on a day without a workout', () => {
    const planned = tapToday([])
    const trained = tapToday([workout('a', 'Push Day', todayISO(), 9)])
    expect(planned.textContent).not.toContain('Push Day')
    expect(planned.innerHTML).not.toBe(trained.innerHTML)
  })
})

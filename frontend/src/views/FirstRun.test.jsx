// @vitest-environment happy-dom
// The first run (design audit, proposal 10): three steps, nothing written until Done, Skip ends it
// for good.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { DEF, useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import FirstRun from './FirstRun.jsx'

const S = () => useStore.getState().S
let host, root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  useUI.setState({ sheets: [], toasts: [] })
  useStore.setState({ S: { ...JSON.parse(JSON.stringify(DEF)), routines: [], workouts: [], unit: 'kg', weekStart: 1 }, user: null })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(<FirstRun />))
})
afterEach(() => { act(() => root.unmount()); host.remove() })

const button = text => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === text)
const click = el => act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
const choose = title => click([...host.querySelectorAll('[role="radio"]')].find(r => r.querySelector('.tt').textContent.startsWith(title)))
const next = () => click(button('Next'))

describe('the first run', () => {
  it('Skip ends it and writes nothing else', () => {
    click(button('Skip'))
    expect(S().setupDone).toBe(true)
    expect(S().routines).toEqual([])
  })

  it('recommends a plan from the answers and loads it on Done', () => {
    click(button('4'))
    next()
    const picked = [...host.querySelectorAll('[role="radio"]')].find(r => r.getAttribute('aria-checked') === 'true')
    expect(picked.querySelector('.tt').textContent).toBe('Upper / LowerRecommended')
    expect(S().routines).toEqual([])   // nothing until Done
    next()
    click(button('Done'))
    expect(S().setupDone).toBe(true)
    expect(S().routines.map(r => r.name)).toEqual(['Upper A', 'Lower A', 'Upper B', 'Lower B'])
    expect(S().equipFilterOn).toBe(false)
  })

  it('a home gym becomes an equipment profile the plan is fitted to', () => {
    next(); next()
    choose('At home')
    click(button('Sunday'))
    click(button('Done'))
    expect(S().weekStart).toBe(0)
    expect(S().equipFilterOn).toBe(true)
    const profile = S().equipProfiles.find(p => p.id === S().activeEquipId)
    expect(profile.equipment).toEqual(['dumbbell', 'body weight', 'bench'])
    expect(S().routines.length).toBeGreaterThan(0)
  })

  it('“I’ll build my own” leaves the plan empty', () => {
    next()
    choose('I’ll build my own')
    next()
    click(button('Done'))
    expect(S().setupDone).toBe(true)
    expect(S().routines).toEqual([])
  })

  it('the unit chosen is a label, nothing to convert', () => {
    next(); next()
    click(button('lb'))
    click(button('Done'))
    expect(S().unit).toBe('lb')
  })
})

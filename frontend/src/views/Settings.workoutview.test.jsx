// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Settings from './Settings.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const mocks = vi.hoisted(() => {
  const state = { S: null }
  state.snapshot = () => ({
    S: state.S,
    user: null,
    update: mut => {
      const next = structuredClone(state.S)
      mut(next)
      state.S = next
    },
    replaceState: vi.fn(), setUser: vi.fn(), pullState: vi.fn(), pushState: vi.fn(),
    signOut: vi.fn(), signOutAll: vi.fn(), resetDemo: vi.fn(), disconnectServer: vi.fn(),
  })
  return state
})
vi.mock('../store/useStore.js', () => {
  const useStore = selector => selector ? selector(mocks.snapshot()) : mocks.snapshot()
  useStore.getState = mocks.snapshot
  return { useStore, DEF: { reminder: { time: '17:30' } }, hasData: () => false }
})
vi.mock('../store/useUI.js', () => {
  const snap = () => ({ toast: vi.fn(), openSheet: vi.fn() })
  const useUI = selector => selector ? selector(snap()) : snap()
  useUI.getState = snap
  return { useUI }
})
vi.mock('react-router-dom', () => ({ useNavigate: () => () => {} }))
vi.mock('../lib/api.js', () => ({
  api: vi.fn(), webauthnOK: () => false, passkeyLogin: vi.fn(), passkeyRegister: vi.fn(), IS_ANDROID: false,
}))
vi.mock('../lib/push.js', () => ({ pushSupported: () => false, enablePush: vi.fn(), disablePush: vi.fn(), sendTestPush: vi.fn() }))
vi.mock('../lib/wakelock.js', () => ({ wakeLockSupported: () => false }))
vi.mock('../lib/mobile.js', () => ({ MOBILE: false, isAndroid: () => Promise.resolve(false), shareExport: vi.fn(), syncReminder: vi.fn() }))
vi.mock('./MobileOnboarding.jsx', () => ({ ConnectSheet: () => null }))
vi.mock('../sheets.jsx', () => ({
  loadStarterPlan: vi.fn(), starterPlanSheet: vi.fn(), confirmSheet: vi.fn(), importFromApp: vi.fn(),
  importFromHevy: vi.fn(), equipmentProfileSheet: vi.fn(),
}))

// The Settings view reads the build-time version constant at render time.
globalThis.__APP_VERSION__ ??= 'test'

let host, root
beforeEach(() => {
  mocks.S = {
    unit: 'kg', restSec: 90, restPauseSec: 15, sound: false, effort: 'none',
    gifSize: 'full', workouts: [], routines: [], exWeights: {},
  }
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const mount = () => act(() => root.render(<Settings page="workout" />))
const segButton = label => [...host.querySelectorAll('.seg button')].find(b => b.textContent === label)

// Two layouts (design audit, proposal 4): Focus and Overview; Overview's compact rows are a switch
// of their own, stored as the old 'compact' value so a profile keeps what it had.
describe('Settings — workout view', () => {
  const sw = title => [...host.querySelectorAll('[role="switch"], button[aria-label]')].find(b => b.getAttribute('aria-label') === title)

  it('offers Focus / Overview and writes workoutView to the store', () => {
    mount()
    expect(segButton('Focus').getAttribute('aria-pressed')).toBe('true')
    expect(segButton('Cards')).toBeUndefined()
    act(() => { segButton('Overview').click() })
    expect(mocks.S.workoutView).toBe('list')
    mount()
    expect(segButton('Overview').getAttribute('aria-pressed')).toBe('true')
    act(() => { segButton('Focus').click() })
    expect(mocks.S.workoutView).toBe('cards')
  })

  it('Compact rows shows only under Overview, and is the old compact view', () => {
    mount()
    expect(host.textContent).not.toContain('Compact rows')
    mocks.S.workoutView = 'compact'
    mount()
    expect(segButton('Overview').getAttribute('aria-pressed')).toBe('true')
    expect(host.textContent).toContain('Compact rows')
  })

  it('shows the old Focus view, and a legacy or absent value, as Focus', () => {
    for (const v of ['focus', 'grid', undefined]) {
      mocks.S.workoutView = v
      mount()
      expect(segButton('Focus').getAttribute('aria-pressed')).toBe('true')
    }
  })
})

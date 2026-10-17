import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { MOBILE } from './lib/mobile.js'
import { useStore } from './store/useStore.js'
import { startMediaSync } from './lib/media-sync.js'
import { startNativeKeyboard } from './lib/native-keyboard.js'
import './index.css'

// App.jsx restores per-route scroll itself; the browser's own attempt races it.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>
)

// The photos and videos of custom exercises, in every build (the phone and the demo included):
// uploads of what the server lacks, the local clean-up, and the plan's files kept offline.
startMediaSync(useStore)

// Android 15 does not resize the page for the soft keyboard; the app says how much it covers and
// this keeps the focused field above it. Idle everywhere else.
startNativeKeyboard()

// Not in the mobile build: the native shell already serves everything from disk.
if (!MOBILE && 'serviceWorker' in navigator && location.protocol === 'https:') {
  // An app on the home screen is resumed, not reloaded, so it would keep running the build it
  // started with: the worker is asked for an update every time the app comes to the front.
  navigator.serviceWorker.register('sw.js').then(reg => {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {})
    })
  }).catch(() => {})
  // A new deploy's worker takes over at once (skipWaiting + clients.claim), but the page still
  // runs the old bundle until it reloads. Reload onto the new build then, unless a workout is
  // running: that waits for the next time the app is brought back. The first install (no
  // controller yet) is not an update and reloads nothing.
  const hadController = !!navigator.serviceWorker.controller
  let pending = false
  const reloadNow = () => { pending = false; location.reload() }
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || pending) return
    pending = true
    if (!useStore.getState().S?.active || document.visibilityState === 'hidden') reloadNow()
  })
  document.addEventListener('visibilitychange', () => {
    if (pending && document.visibilityState === 'visible') reloadNow()
  })
  // The plan's exercise media, kept by the worker for a workout opened without a network (#281).
  // It only fetches ahead while the page runs as the installed app; a tab keeps what it has shown.
  import('./lib/media-prefetch.js').then(m => m.startMediaPrefetch(useStore)).catch(() => {})
}

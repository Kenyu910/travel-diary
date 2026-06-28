import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(<App />)

// Register the offline app-shell service worker (PWA / poor-connection support)
if ('serviceWorker' in navigator) {
  // Auto-reload once when a NEW service worker takes control, so a fresh deploy
  // applies immediately instead of lagging a launch behind.
  // Guard against the first-ever install: clients.claim() fires controllerchange
  // even when there was no previous controller — reloading then causes a
  // spurious flash/reload on the very first visit (and drops any in-progress
  // input). Only reload when a controller already existed (i.e. a real update).
  const hadController = !!navigator.serviceWorker.controller
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded || !hadController) return
    reloaded = true
    window.location.reload()
  })
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {/* offline support is best-effort */})
  })
}

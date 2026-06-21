import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(<App />)

// Register the offline app-shell service worker (PWA / poor-connection support)
if ('serviceWorker' in navigator) {
  // Auto-reload once when a new service worker takes control, so a fresh deploy
  // applies immediately instead of lagging a launch behind.
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return
    reloaded = true
    window.location.reload()
  })
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {/* offline support is best-effort */})
  })
}

import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Drive the app height from the real viewport. iOS sometimes reports 100dvh
// too short on cold launch, leaving an empty strip below the bottom nav until
// the user scrolls/swipes (which triggers a reflow). The visual viewport /
// innerHeight is reliable, so size #root from it and re-apply on every event
// that can change it — plus a few delayed ticks to catch the launch settle.
function setAppHeight() {
  // Use innerHeight (stable across keyboard show/hide) rather than
  // visualViewport.height (which shrinks with the keyboard).
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
}
setAppHeight()
;[0, 60, 150, 300, 600, 1000].forEach(t => setTimeout(setAppHeight, t))
window.addEventListener('resize', setAppHeight)
window.addEventListener('orientationchange', () => setTimeout(setAppHeight, 200))
window.addEventListener('pageshow', setAppHeight)
window.addEventListener('load', setAppHeight)
window.visualViewport?.addEventListener('resize', setAppHeight)

createRoot(document.getElementById('root')!).render(<App />)

// Register the offline app-shell service worker (PWA / poor-connection support)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {/* offline support is best-effort */})
  })
}

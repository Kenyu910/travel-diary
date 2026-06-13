import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Drive the app height from the real viewport. iOS sometimes reports 100dvh
// too short on cold launch, leaving an empty strip below the bottom nav until
// the user scrolls/swipes (which triggers a reflow). window.innerHeight is
// reliable, so use it to size #root and update it on viewport changes.
function setAppHeight() {
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
}
setAppHeight()
window.addEventListener('resize', setAppHeight)
window.addEventListener('orientationchange', () => setTimeout(setAppHeight, 200))
window.addEventListener('pageshow', setAppHeight)

createRoot(document.getElementById('root')!).render(<App />)

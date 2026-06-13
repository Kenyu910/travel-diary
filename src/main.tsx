import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(<App />)

/**
 * iOS standalone PWA fix: on cold launch the safe-area insets are sometimes
 * 0 until the first reflow, so the header renders tucked under the status bar
 * / dynamic island and only corrects once the user swipes. Force a reflow a
 * couple of times right after launch so env(safe-area-inset-*) is applied
 * without any user interaction.
 */
function forceSafeAreaReflow() {
  const root = document.getElementById('root')
  if (!root) return
  const prev = root.style.transform
  root.style.transform = 'translateZ(0)'
  void root.offsetHeight // trigger layout
  root.style.transform = prev
  window.scrollTo(0, 0)
}
window.addEventListener('load', () => {
  forceSafeAreaReflow()
  setTimeout(forceSafeAreaReflow, 120)
  setTimeout(forceSafeAreaReflow, 400)
})
window.addEventListener('pageshow', () => setTimeout(forceSafeAreaReflow, 0))
window.addEventListener('orientationchange', () => setTimeout(forceSafeAreaReflow, 200))

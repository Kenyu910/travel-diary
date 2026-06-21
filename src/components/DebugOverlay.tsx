import { useEffect, useState } from 'react'

/**
 * TEMPORARY diagnostic overlay — shows the real viewport / safe-area values on
 * the device so we can fix the standalone-PWA layout with data instead of
 * guesses. Remove once the layout bugs are resolved.
 */
export function DebugOverlay() {
  const [info, setInfo] = useState<Record<string, string>>({})

  useEffect(() => {
    const probe = document.createElement('div')
    probe.style.cssText =
      'position:fixed;top:0;left:0;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);visibility:hidden;pointer-events:none;'
    document.body.appendChild(probe)

    const read = () => {
      const cs = getComputedStyle(probe)
      const root = document.getElementById('root')
      const rootRect = root?.getBoundingClientRect()
      const bodyRect = document.body.getBoundingClientRect()
      setInfo({
        standalone: String((navigator as any).standalone),
        innerH: String(window.innerHeight),
        screenH: String(window.screen.height),
        bodyH: `${Math.round(bodyRect.height)} (bot ${Math.round(bodyRect.bottom)})`,
        safeTop: cs.paddingTop,
        safeBottom: cs.paddingBottom,
        rootH: rootRect ? `${Math.round(rootRect.height)} (bot ${Math.round(rootRect.bottom)})` : '?',
        bodyPos: getComputedStyle(document.body).position,
      })
    }
    read()
    const id = setInterval(read, 500)
    return () => { clearInterval(id); probe.remove() }
  }, [])

  return (
    <div style={{
      position: 'fixed', top: '50%', left: 8, right: 8, transform: 'translateY(-50%)',
      zIndex: 99999, background: 'rgba(0,0,0,0.85)', color: '#22ff88',
      fontSize: 13, fontFamily: 'monospace', padding: 14, borderRadius: 10,
      lineHeight: 1.7, pointerEvents: 'none',
    }}>
      <div style={{ color: '#fff', fontWeight: 700, marginBottom: 6 }}>DEBUG v2.3.4</div>
      {Object.entries(info).map(([k, v]) => <div key={k}>{k}: {v}</div>)}
    </div>
  )
}

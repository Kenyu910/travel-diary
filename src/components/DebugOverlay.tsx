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

    // Probes to discover which CSS unit reports the FULL screen height (874).
    const mkUnit = (h: string) => {
      const d = document.createElement('div')
      d.style.cssText = `position:fixed;top:0;left:0;width:1px;height:${h};visibility:hidden;pointer-events:none;`
      document.body.appendChild(d)
      return d
    }
    const pVh = mkUnit('100vh')
    const pDvh = mkUnit('100dvh')
    const pLvh = mkUnit('100lvh')
    const pSvh = mkUnit('100svh')

    const read = () => {
      const cs = getComputedStyle(probe)
      const root = document.getElementById('root')
      const rootRect = root?.getBoundingClientRect()
      const bodyRect = document.body.getBoundingClientRect()
      const nav = document.querySelector('nav')
      const navRect = nav?.getBoundingClientRect()
      const label = nav?.querySelector('span')
      const labelRect = label?.getBoundingClientRect()
      setInfo({
        screenH: String(window.screen.height),
        bodyH: `${Math.round(bodyRect.height)}`,
        rootH: rootRect ? `${Math.round(rootRect.height)}` : '?',
        safeBottom: cs.paddingBottom,
        vh: String(Math.round(pVh.getBoundingClientRect().height)),
        navH: navRect ? `${Math.round(navRect.height)}` : '?',
        navTopBot: navRect ? `${Math.round(navRect.top)}-${Math.round(navRect.bottom)}` : '?',
        labelY: labelRect ? `${Math.round(labelRect.top)}-${Math.round(labelRect.bottom)}` : 'NO LABEL',
        labelTxt: label?.textContent || '(none)',
      })
    }
    read()
    const id = setInterval(read, 500)
    return () => {
      clearInterval(id)
      ;[probe, pVh, pDvh, pLvh, pSvh].forEach(el => el.remove())
    }
  }, [])

  return (
    <div style={{
      position: 'fixed', top: '50%', left: 8, right: 8, transform: 'translateY(-50%)',
      zIndex: 99999, background: 'rgba(0,0,0,0.85)', color: '#22ff88',
      fontSize: 13, fontFamily: 'monospace', padding: 14, borderRadius: 10,
      lineHeight: 1.7, pointerEvents: 'none',
    }}>
      <div style={{ color: '#fff', fontWeight: 700, marginBottom: 6 }}>DEBUG v2.3.1e</div>
      {Object.entries(info).map(([k, v]) => <div key={k}>{k}: {v}</div>)}
    </div>
  )
}

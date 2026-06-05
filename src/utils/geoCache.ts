/**
 * Caches the user's geolocation for 5 minutes so iOS doesn't repeatedly
 * show the "Allow location access?" permission popup on every page interaction.
 */
const CACHE_KEY = 'travel-diary-geocache'
const TTL_MS = 5 * 60 * 1000

type Cached = { lat: number; lng: number; ts: number }

export function getCachedGeo(): { lat: number; lng: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const c: Cached = JSON.parse(raw)
    if (Date.now() - c.ts > TTL_MS) return null
    return { lat: c.lat, lng: c.lng }
  } catch { return null }
}

export function setCachedGeo(lat: number, lng: number): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ lat, lng, ts: Date.now() }))
  } catch {}
}

/** getCurrentPosition with 5-min cache to reduce iOS permission prompts */
export function getPositionCached(
  onSuccess: (lat: number, lng: number) => void,
  onError?: () => void,
): void {
  const cached = getCachedGeo()
  if (cached) { onSuccess(cached.lat, cached.lng); return }
  if (!navigator.geolocation) { onError?.(); return }
  navigator.geolocation.getCurrentPosition(
    pos => {
      setCachedGeo(pos.coords.latitude, pos.coords.longitude)
      onSuccess(pos.coords.latitude, pos.coords.longitude)
    },
    () => onError?.(),
    { maximumAge: 300_000, timeout: 10_000 },
  )
}

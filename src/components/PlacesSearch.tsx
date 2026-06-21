import { useEffect, useRef, useState, useCallback } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { Search, X, MapPin, LocateFixed } from 'lucide-react'
import { getCachedGeo } from '../utils/geoCache'

type NearbyResult = {
  placeId: string
  name: string
  lat: number
  lng: number
  vicinity: string
}

type Props = {
  onPlaceSelected: (lat: number, lng: number, name: string) => void
  /** Pass mapRef so we can bias searches toward the current map center */
  mapRef?: React.MutableRefObject<any>
}

export function PlacesSearch({ onPlaceSelected, mapRef }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const serviceDivRef = useRef<HTMLDivElement | null>(null)
  const placesLib = useMapsLibrary('places')
  const [value, setValue] = useState('')
  const [nearbyResults, setNearbyResults] = useState<NearbyResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  // Setup Places Autocomplete for specific place name searches
  useEffect(() => {
    if (!placesLib || !inputRef.current) return

    const win = window as any
    const G = win.google?.maps

    // Single Autocomplete instance — creating a second one on the same input
    // (the old pattern) attached two widgets, each with its own dropdown
    const ac = new placesLib.Autocomplete(inputRef.current, {
      fields: ['geometry', 'name', 'formatted_address'],
      componentRestrictions: { country: 'jp' },
    })
    const listener = ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      const loc = place.geometry?.location
      if (loc) {
        const name = place.name || place.formatted_address || ''
        setValue(name)
        setShowDropdown(false)
        setNearbyResults([])
        inputRef.current?.blur()
        onPlaceSelected(loc.lat(), loc.lng(), name)
      }
    })

    const cleanups: Array<() => void> = [() => {
      try { G?.event?.removeListener(listener) } catch {}
    }]

    // Bias the autocomplete using ONLY the cached location, so simply opening
    // the map never triggers a geolocation permission prompt.
    const cachedBias = getCachedGeo()
    if (cachedBias && G) {
      const d = 0.05
      ac.setBounds(new G.LatLngBounds(
        new G.LatLng(cachedBias.lat - d, cachedBias.lng - d),
        new G.LatLng(cachedBias.lat + d, cachedBias.lng + d),
      ))
    }

    return () => {
      cleanups.forEach(c => c())
      cleanups.length = 0
    }
  }, [placesLib, onPlaceSelected])

  /** Text search for keyword like "ラーメン" — shows nearby results list */
  const handleNearbySearch = useCallback(() => {
    if (!value.trim() || !placesLib || !serviceDivRef.current) return
    setSearching(true)
    setShowDropdown(true)
    setNearbyResults([])

    const service = new placesLib.PlacesService(serviceDivRef.current)

    const doSearch = (location?: { lat: number; lng: number }) => {
      const req: any = { query: value.trim() }
      // Prioritize map center location over cached position
      const mapCenter = mapRef?.current?.getCenter?.()
      if (mapCenter) {
        req.location = { lat: mapCenter.lat(), lng: mapCenter.lng() }
        req.radius = 2000
      } else if (location) {
        // Fallback to cached position if map center unavailable
        req.location = location
        req.radius = 2000
      }
      service.textSearch(req, (results: any, status: any) => {
        setSearching(false)
        if (status === 'OK' && results) {
          setNearbyResults(results.slice(0, 12).map((p: any) => ({
            placeId: p.place_id,
            name: p.name,
            lat: p.geometry.location.lat(),
            lng: p.geometry.location.lng(),
            vicinity: p.formatted_address || p.vicinity || '',
          })))
        } else {
          setNearbyResults([])
        }
      })
    }

    // Map center is the primary bias (handled in doSearch). Only fall back to a
    // cached location — never request live GPS here, so search won't prompt.
    const cached = getCachedGeo()
    doSearch(cached ?? undefined)
  }, [value, placesLib, mapRef])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleNearbySearch()
    }
    if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  const handleClear = useCallback(() => {
    setValue('')
    setNearbyResults([])
    setShowDropdown(false)
    inputRef.current?.blur()
  }, [])

  const handleSelectResult = (r: NearbyResult) => {
    setValue(r.name)
    setShowDropdown(false)
    setNearbyResults([])
    onPlaceSelected(r.lat, r.lng, r.name)
  }

  return (
    <div className="relative">
      {/* Hidden div for PlacesService attribution (required by Google Maps ToS) */}
      <div ref={serviceDivRef} style={{ display: 'none' }} />

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
        <input
          ref={inputRef}
          value={value}
          onChange={e => {
            setValue(e.target.value)
            if (!e.target.value) { setShowDropdown(false); setNearbyResults([]) }
          }}
          onKeyDown={handleKeyDown}
          placeholder="場所・ラーメンなどキーワード検索..."
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="w-full bg-white/95 backdrop-blur-sm border border-gray-200/70 rounded-2xl pl-8 pr-16 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 shadow-sm"
        />
        {value && (
          <>
            {/* Nearby search button */}
            <button
              onPointerDown={e => { e.preventDefault(); handleNearbySearch() }}
              className="absolute right-8 top-1/2 -translate-y-1/2 text-pink-400 z-10 p-0.5"
              title="周辺を検索"
            >
              <LocateFixed size={15} />
            </button>
            {/* Clear button */}
            <button
              onPointerDown={e => { e.preventDefault(); handleClear() }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 z-10"
            >
              <X size={14} />
            </button>
          </>
        )}
      </div>

      {/* Nearby results dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden max-h-72 overflow-y-auto">
          {searching ? (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-400">
              <div className="w-4 h-4 border-2 border-pink-300 border-t-transparent rounded-full animate-spin" />
              検索中...
            </div>
          ) : nearbyResults.length === 0 ? (
            <div className="py-4 text-sm text-gray-400 text-center">
              見つかりませんでした
            </div>
          ) : (
            <>
              <p className="text-[10px] font-semibold text-gray-400 px-3 pt-2.5 pb-1 uppercase tracking-wider">
                周辺の検索結果
              </p>
              {nearbyResults.map(r => (
                <button
                  key={r.placeId}
                  onPointerDown={e => { e.preventDefault(); handleSelectResult(r) }}
                  onClick={() => handleSelectResult(r)}
                  className="w-full text-left flex items-start gap-2.5 px-3 py-2.5 border-b border-gray-50 last:border-0 active:bg-pink-50 transition-colors"
                >
                  <MapPin size={13} className="text-pink-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
                    <p className="text-xs text-gray-400 truncate leading-relaxed">{r.vicinity}</p>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

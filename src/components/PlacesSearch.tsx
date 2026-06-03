import { useEffect, useRef, useState, useCallback } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { Search, X } from 'lucide-react'

type Props = {
  onPlaceSelected: (lat: number, lng: number, name: string) => void
}

export function PlacesSearch({ onPlaceSelected }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const placesLib = useMapsLibrary('places')
  const [value, setValue] = useState('')

  useEffect(() => {
    if (!placesLib || !inputRef.current) return

    const win = window as any
    const G = win.google?.maps

    const createAutoComplete = (bounds?: any) => {
      if (!inputRef.current) return () => {}
      const opts: any = {
        fields: ['geometry', 'name', 'formatted_address'],
        componentRestrictions: { country: 'jp' },
      }
      if (bounds) opts.bounds = bounds

      const autocomplete = new placesLib.Autocomplete(inputRef.current, opts)
      const listener = autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        const loc = place.geometry?.location
        if (loc) {
          const name = place.name || place.formatted_address || ''
          setValue(name)
          inputRef.current?.blur()
          onPlaceSelected(loc.lat(), loc.lng(), name)
        }
      })
      return () => {
        try { G?.event?.removeListener(listener) } catch { /* ignore */ }
      }
    }

    // Bias toward current location (within ~5km radius)
    if (navigator.geolocation && G) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const { latitude: lat, longitude: lng } = pos.coords
          const d = 0.05 // ~5km
          const bounds = new G.LatLngBounds(
            new G.LatLng(lat - d, lng - d),
            new G.LatLng(lat + d, lng + d)
          )
          return createAutoComplete(bounds)
        },
        () => createAutoComplete()
      )
    } else {
      return createAutoComplete()
    }
  }, [placesLib, onPlaceSelected])

  const handleClear = useCallback(() => {
    setValue('')
    inputRef.current?.blur()
  }, [])

  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="場所を検索..."
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="w-full bg-white/92 backdrop-blur-sm border border-gray-200/70 rounded-2xl pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 shadow-sm"
      />
      {value && (
        <button
          onMouseDown={e => { e.preventDefault(); handleClear() }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 z-10"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

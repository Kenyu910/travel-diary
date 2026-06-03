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
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!placesLib || !inputRef.current) return

    const autocomplete = new placesLib.Autocomplete(inputRef.current, {
      fields: ['geometry', 'name', 'formatted_address'],
      // Bias toward Japan
      componentRestrictions: { country: 'jp' },
    })

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      const loc = place.geometry?.location
      if (loc) {
        const name = place.name || place.formatted_address || ''
        setValue(name)
        setFocused(false)
        inputRef.current?.blur()
        onPlaceSelected(loc.lat(), loc.lng(), name)
      }
    })

    return () => {
      // Clean up listener
      try {
        (window as any).google?.maps?.event?.removeListener(listener)
      } catch { /* ignore cleanup errors */ }
    }
  }, [placesLib, onPlaceSelected])

  const handleClear = useCallback(() => {
    setValue('')
    setFocused(false)
    inputRef.current?.blur()
  }, [])

  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 200)}
        placeholder="場所を検索..."
        className="w-full bg-white/92 backdrop-blur-sm border border-gray-200/70 rounded-2xl pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 shadow-sm"
      />
      {(value || focused) && (
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

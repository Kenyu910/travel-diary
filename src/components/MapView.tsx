import { useEffect, useMemo, useState } from 'react'
import {
  Map, AdvancedMarker, Pin, InfoWindow, useMap, useMapsLibrary,
} from '@vis.gl/react-google-maps'
import { Utensils, MapPin, EyeOff } from 'lucide-react'
import type { Entry } from '../types'
import type { AppSettings } from '../settings'
import { MAP_STYLES } from '../settings'

type FoodPlace = {
  placeId: string
  name: string
  lat: number
  lng: number
  vicinity: string
  rating?: number
  hasEntry?: boolean
}

type Props = {
  entries: Entry[]
  selectedEntryId: string | null
  onSelectEntry: (entry: Entry) => void
  onMapClick: (lat: number, lng: number) => void
  onPoiClick: (lat: number, lng: number, name: string) => void
  settings: AppSettings
  filterTag: string | null
  searchQuery: string
  mapRef: React.MutableRefObject<ReturnType<typeof useMap>>
}

function MapRefSetter({ mapRef }: { mapRef: React.MutableRefObject<ReturnType<typeof useMap>> }) {
  const map = useMap()
  useEffect(() => {
    mapRef.current = map
    return () => { mapRef.current = null }
  }, [map, mapRef])
  return null
}

export function MapView({
  entries, selectedEntryId, onSelectEntry, onMapClick, onPoiClick,
  settings, filterTag, searchQuery, mapRef,
}: Props) {
  const map = useMap()
  const placesLib = useMapsLibrary('places')
  const mapStyle = MAP_STYLES[settings.mapStyle]

  const [showDiaryPins, setShowDiaryPins] = useState(true)
  const [foodMode, setFoodMode] = useState(false)
  const [foodPlaces, setFoodPlaces] = useState<FoodPlace[]>([])
  const [selectedFood, setSelectedFood] = useState<FoodPlace | null>(null)
  const [loadingFood, setLoadingFood] = useState(false)

  const placesService = useMemo(
    () => placesLib && map ? new placesLib.PlacesService(map) : null,
    [placesLib, map]
  )

  // Entry IDs that have locations recorded
  const entryLocationSet = useMemo(
    () => new Set(entries.map(e => e.placeName?.toLowerCase())),
    [entries]
  )

  // Toggle food mode — search nearby restaurants
  const toggleFoodMode = () => {
    if (foodMode) {
      setFoodMode(false)
      setFoodPlaces([])
      setSelectedFood(null)
      return
    }
    if (!placesService || !map) return
    setFoodMode(true)
    setLoadingFood(true)

    const center = map.getCenter()
    if (!center) { setLoadingFood(false); return }

    placesService.nearbySearch(
      {
        location: { lat: center.lat(), lng: center.lng() },
        radius: 1000,
        type: 'restaurant',
      },
      (results: any, status: any) => {
        setLoadingFood(false)
        if (status === 'OK' && results) {
          const places: FoodPlace[] = results.slice(0, 30).map((p: any) => ({
            placeId: p.place_id,
            name: p.name,
            lat: p.geometry.location.lat(),
            lng: p.geometry.location.lng(),
            vicinity: p.vicinity || '',
            rating: p.rating,
          }))
          setFoodPlaces(places)
        }
      }
    )
  }

  const visibleEntries = useMemo(() => entries.filter(e => {
    if (filterTag && !e.tags.includes(filterTag)) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return e.title.toLowerCase().includes(q) ||
        e.placeName.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q))
    }
    return true
  }), [entries, filterTag, searchQuery])

  const selectedEntry = entries.find(e => e.id === selectedEntryId) ?? null

  return (
    <Map
      defaultCenter={{ lat: settings.defaultLat, lng: settings.defaultLng }}
      defaultZoom={settings.defaultZoom}
      mapTypeId={mapStyle.mapTypeId}
      mapId="DEMO_MAP_ID"
      disableDefaultUI={true}
      zoomControl={true}
      gestureHandling="greedy"
      className="w-full h-full"
      onClick={e => {
        const lat = e.detail.latLng?.lat
        const lng = e.detail.latLng?.lng
        if (lat !== undefined && lng !== undefined) {
          setSelectedFood(null)
          onMapClick(lat, lng)
        }
      }}
    >
      <MapRefSetter mapRef={mapRef} />

      {/* Diary entry pins */}
      {showDiaryPins && visibleEntries.map(entry => (
        <AdvancedMarker
          key={entry.id}
          position={{ lat: entry.lat, lng: entry.lng }}
          onClick={() => { setSelectedFood(null); onSelectEntry(entry) }}
        >
          <Pin
            background={entry.id === selectedEntryId ? '#ef4444' : '#ec4899'}
            borderColor={entry.id === selectedEntryId ? '#dc2626' : '#db2777'}
            glyphColor="white"
            scale={entry.id === selectedEntryId ? 1.2 : 1.0}
          />
        </AdvancedMarker>
      ))}

      {/* Food mode markers */}
      {foodMode && foodPlaces.map(place => {
        const hasEntry = entryLocationSet.has(place.name.toLowerCase())
        return (
          <AdvancedMarker
            key={place.placeId}
            position={{ lat: place.lat, lng: place.lng }}
            onClick={() => setSelectedFood(place)}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md border-2 ${
              hasEntry
                ? 'bg-pink-500 border-pink-700'
                : 'bg-orange-400 border-orange-600'
            }`}>
              <Utensils size={14} className="text-white" />
            </div>
          </AdvancedMarker>
        )
      })}

      {/* Selected diary entry InfoWindow */}
      {selectedEntry && (
        <InfoWindow
          position={{ lat: selectedEntry.lat, lng: selectedEntry.lng }}
          pixelOffset={[0, -40]}
          onClose={() => {}}
        >
          <div className="min-w-[140px] max-w-[200px]">
            <p className="font-semibold text-sm text-gray-800">{selectedEntry.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{selectedEntry.date}</p>
            {selectedEntry.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {selectedEntry.tags.map(tag => (
                  <span key={tag} className="text-[11px] bg-pink-50 text-pink-500 px-1.5 py-0.5 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </InfoWindow>
      )}

      {/* Selected food place InfoWindow */}
      {selectedFood && (
        <InfoWindow
          position={{ lat: selectedFood.lat, lng: selectedFood.lng }}
          pixelOffset={[0, -20]}
          onClose={() => setSelectedFood(null)}
        >
          <div className="min-w-[160px]">
            <p className="font-semibold text-sm text-gray-800">{selectedFood.name}</p>
            <p className="text-xs text-gray-400">{selectedFood.vicinity}</p>
            {selectedFood.rating && (
              <p className="text-xs text-amber-500 mt-0.5">★ {selectedFood.rating}</p>
            )}
            <button
              onClick={() => {
                setSelectedFood(null)
                onPoiClick(selectedFood.lat, selectedFood.lng, selectedFood.name)
              }}
              className="mt-2 w-full py-1.5 bg-pink-400 text-white text-xs rounded-full font-medium"
            >
              📖 日記を書く
            </button>
          </div>
        </InfoWindow>
      )}

      {/* Map overlay controls */}
      <div style={{ position: 'absolute', bottom: 80, left: 12, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }}>
        {/* Food mode toggle */}
        <button
          onClick={toggleFoodMode}
          title="グルメモード"
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: foodMode ? '#fb923c' : 'white',
            border: foodMode ? '2px solid #ea580c' : '1px solid #e5e7eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {loadingFood
            ? <div style={{ width: 18, height: 18, border: '2px solid #fb923c', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            : <Utensils size={18} color={foodMode ? 'white' : '#fb923c'} />
          }
        </button>

        {/* Diary pins toggle */}
        <button
          onClick={() => setShowDiaryPins(v => !v)}
          title={showDiaryPins ? '記録を非表示' : '記録を表示'}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: showDiaryPins ? 'white' : '#f9a8d4',
            border: showDiaryPins ? '1px solid #e5e7eb' : '2px solid #ec4899',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          }}
        >
          {showDiaryPins
            ? <MapPin size={18} color="#ec4899" />
            : <EyeOff size={18} color="#ec4899" />
          }
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </Map>
  )
}

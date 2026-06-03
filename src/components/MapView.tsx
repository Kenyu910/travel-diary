import { useEffect, useMemo, useState } from 'react'
import {
  Map, AdvancedMarker, Pin, InfoWindow, useMap, useMapsLibrary,
} from '@vis.gl/react-google-maps'
import { Utensils, MapPin, EyeOff, Coffee } from 'lucide-react'
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
}

type SearchPin = { lat: number; lng: number; name: string }

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
  searchPin: SearchPin | null          // temporary marker from search
  onSearchPinClick: () => void         // confirm → open form
  onClearSearchPin: () => void
}

function MapRefSetter({ mapRef }: { mapRef: React.MutableRefObject<ReturnType<typeof useMap>> }) {
  const map = useMap()
  useEffect(() => { mapRef.current = map; return () => { mapRef.current = null } }, [map, mapRef])
  return null
}

function CurrentLocationDot({ lat, lng }: { lat: number; lng: number }) {
  return (
    <AdvancedMarker position={{ lat, lng }} zIndex={999}>
      {/* Blue pulsing circle — clearly distinct from pink diary teardrops */}
      <div style={{ position: 'relative', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Outer pulse ring */}
        <div style={{
          position: 'absolute', width: 40, height: 40,
          borderRadius: '50%', background: 'rgba(66,133,244,0.2)',
          animation: 'locPulse 1.8s ease-out infinite',
        }} />
        {/* Middle ring */}
        <div style={{
          position: 'absolute', width: 28, height: 28,
          borderRadius: '50%', background: 'rgba(66,133,244,0.15)',
          border: '1px solid rgba(66,133,244,0.4)',
        }} />
        {/* Blue dot */}
        <div style={{
          width: 16, height: 16, borderRadius: '50%',
          background: '#4285F4',
          border: '2.5px solid white',
          boxShadow: '0 1px 4px rgba(66,133,244,0.6)',
          position: 'relative', zIndex: 1,
        }} />
      </div>
    </AdvancedMarker>
  )
}

export function MapView({
  entries, selectedEntryId, onSelectEntry, onMapClick, onPoiClick,
  settings, filterTag, searchQuery, mapRef,
  searchPin, onSearchPinClick, onClearSearchPin,
}: Props) {
  const map = useMap()
  const placesLib = useMapsLibrary('places')
  const mapStyle = MAP_STYLES[settings.mapStyle]

  const [showDiaryPins, setShowDiaryPins] = useState(true)
  const [foodMode, setFoodMode] = useState<'none' | 'restaurant' | 'cafe'>('none')
  const [foodPlaces, setFoodPlaces] = useState<FoodPlace[]>([])
  const [selectedFood, setSelectedFood] = useState<FoodPlace | null>(null)
  const [loadingFood, setLoadingFood] = useState(false)
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null)

  const placesService = useMemo(
    () => placesLib && map ? new placesLib.PlacesService(map) : null,
    [placesLib, map]
  )

  // Watch current location
  useEffect(() => {
    if (!navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      pos => setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}, { enableHighAccuracy: true, maximumAge: 10000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  const searchNearby = (type: 'restaurant' | 'cafe') => {
    if (foodMode === type) {
      setFoodMode('none'); setFoodPlaces([]); setSelectedFood(null); return
    }
    if (!placesService || !map) return
    setFoodMode(type); setLoadingFood(true)
    const center = map.getCenter()
    if (!center) { setLoadingFood(false); return }
    placesService.nearbySearch(
      { location: { lat: center.lat(), lng: center.lng() }, radius: 800, type },
      (results: any, status: any) => {
        setLoadingFood(false)
        if (status === 'OK' && results) {
          setFoodPlaces(results.slice(0, 30).map((p: any) => ({
            placeId: p.place_id,
            name: p.name,
            lat: p.geometry.location.lat(),
            lng: p.geometry.location.lng(),
            vicinity: p.vicinity || '',
            rating: p.rating,
          })))
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

  const fabStyle = (active: boolean, color: string): React.CSSProperties => ({
    width: 44, height: 44, borderRadius: '50%',
    background: active ? color : 'white',
    border: active ? `2px solid ${color}` : '1px solid #e5e7eb',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  })

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
          onClearSearchPin()
          onMapClick(lat, lng)
        }
      }}
    >
      <MapRefSetter mapRef={mapRef} />

      {/* Current location — blue dot */}
      {currentPos && <CurrentLocationDot lat={currentPos.lat} lng={currentPos.lng} />}

      {/* Search result pin — purple, tap to confirm */}
      {searchPin && (
        <AdvancedMarker
          position={{ lat: searchPin.lat, lng: searchPin.lng }}
          onClick={onSearchPinClick}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              background: '#7c3aed', color: 'white', borderRadius: 12,
              padding: '4px 10px', fontSize: 12, fontWeight: 600,
              marginBottom: 4, whiteSpace: 'nowrap', maxWidth: 160,
              overflow: 'hidden', textOverflow: 'ellipsis',
              boxShadow: '0 2px 8px rgba(124,58,237,0.4)',
            }}>
              📍 ここに記録する
            </div>
            <div style={{
              width: 20, height: 20, background: '#7c3aed',
              borderRadius: '50%', border: '3px solid white',
              boxShadow: '0 2px 6px rgba(124,58,237,0.4)',
            }} />
          </div>
        </AdvancedMarker>
      )}

      {/* Diary entry pins — pink */}
      {showDiaryPins && visibleEntries.map(entry => (
        <AdvancedMarker
          key={entry.id}
          position={{ lat: entry.lat, lng: entry.lng }}
          onClick={() => { setSelectedFood(null); onClearSearchPin(); onSelectEntry(entry) }}
        >
          <Pin
            background={entry.id === selectedEntryId ? '#ef4444' : '#ec4899'}
            borderColor={entry.id === selectedEntryId ? '#dc2626' : '#db2777'}
            glyphColor="white"
            scale={entry.id === selectedEntryId ? 1.2 : 1.0}
          />
        </AdvancedMarker>
      ))}

      {/* Food/cafe markers — orange or brown */}
      {foodMode !== 'none' && foodPlaces.map(place => (
        <AdvancedMarker
          key={place.placeId}
          position={{ lat: place.lat, lng: place.lng }}
          onClick={() => setSelectedFood(place)}
        >
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: foodMode === 'cafe' ? '#7c3aed' : '#ea580c',
            border: '2px solid white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}>
            {foodMode === 'cafe'
              ? <Coffee size={14} color="white" />
              : <Utensils size={14} color="white" />
            }
          </div>
        </AdvancedMarker>
      ))}

      {/* Selected diary InfoWindow */}
      {selectedEntry && (
        <InfoWindow
          position={{ lat: selectedEntry.lat, lng: selectedEntry.lng }}
          pixelOffset={[0, -40]}
          onClose={() => {}}
        >
          <div className="min-w-[140px] max-w-[200px]">
            {selectedEntry.placeName && (
              <p className="text-xs font-semibold text-pink-500 mb-0.5">📍 {selectedEntry.placeName}</p>
            )}
            <p className="font-semibold text-sm text-gray-800">{selectedEntry.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{selectedEntry.date}</p>
          </div>
        </InfoWindow>
      )}

      {/* Food POI InfoWindow */}
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
              onClick={() => { setSelectedFood(null); onPoiClick(selectedFood.lat, selectedFood.lng, selectedFood.name) }}
              className="mt-2 w-full py-1.5 bg-pink-400 text-white text-xs rounded-full font-medium"
            >
              📖 日記を書く
            </button>
          </div>
        </InfoWindow>
      )}

      {/* Left-side overlay controls */}
      <div style={{ position: 'absolute', bottom: 90, left: 12, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }}>
        {/* Restaurant toggle */}
        <button onClick={() => searchNearby('restaurant')} style={fabStyle(foodMode === 'restaurant', '#ea580c')} title="レストラン">
          {loadingFood && foodMode === 'restaurant'
            ? <div style={{ width: 18, height: 18, border: '2px solid #ea580c', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            : <Utensils size={18} color={foodMode === 'restaurant' ? 'white' : '#ea580c'} />
          }
        </button>
        {/* Cafe toggle */}
        <button onClick={() => searchNearby('cafe')} style={fabStyle(foodMode === 'cafe', '#7c3aed')} title="カフェ">
          {loadingFood && foodMode === 'cafe'
            ? <div style={{ width: 18, height: 18, border: '2px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            : <Coffee size={18} color={foodMode === 'cafe' ? 'white' : '#7c3aed'} />
          }
        </button>
        {/* Diary pins toggle */}
        <button onClick={() => setShowDiaryPins(v => !v)} style={fabStyle(false, '#ec4899')} title="記録ピン切替">
          {showDiaryPins
            ? <MapPin size={18} color="#ec4899" />
            : <EyeOff size={18} color="#ec4899" />
          }
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes locPulse {
          0%   { transform: scale(0.8); opacity: 0.8 }
          70%  { transform: scale(1.6); opacity: 0.2 }
          100% { transform: scale(1.8); opacity: 0 }
        }
      `}</style>
    </Map>
  )
}

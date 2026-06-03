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

type NativePoi = {
  placeId: string
  name: string
  lat: number
  lng: number
  address: string
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
  searchPin: SearchPin | null
  onSearchPinClick: () => void
  onClearSearchPin: () => void
}

function MapRefSetter({ mapRef }: { mapRef: React.MutableRefObject<ReturnType<typeof useMap>> }) {
  const map = useMap()
  useEffect(() => { mapRef.current = map; return () => { mapRef.current = null } }, [map, mapRef])
  return null
}

/** Blue pulsing dot for current location — clearly distinct from pink diary pins */
function CurrentLocationDot({ lat, lng }: { lat: number; lng: number }) {
  return (
    <AdvancedMarker position={{ lat, lng }} zIndex={9999}>
      <div style={{ position: 'relative', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Pulsing outer ring */}
        <div style={{
          position: 'absolute', width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(66,133,244,0.2)', border: '1px solid rgba(66,133,244,0.4)',
          animation: 'locPulse 2s ease-out infinite',
        }} />
        {/* White border ring */}
        <div style={{
          position: 'absolute', width: 20, height: 20, borderRadius: '50%',
          background: 'white', boxShadow: '0 0 0 2px rgba(66,133,244,0.3)',
        }} />
        {/* Blue core dot */}
        <div style={{
          position: 'absolute', width: 14, height: 14, borderRadius: '50%',
          background: '#4285F4',
          boxShadow: '0 2px 6px rgba(66,133,244,0.7)',
        }} />
      </div>
    </AdvancedMarker>
  )
}

function openInGoogleMaps(lat: number, lng: number, placeId?: string) {
  const url = placeId
    ? `https://www.google.com/maps/place/?q=place_id:${placeId}`
    : `https://www.google.com/maps/@${lat},${lng},17z`
  window.open(url, '_blank')
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
  const [nativePoi, setNativePoi] = useState<NativePoi | null>(null)
  const [loadingPoi, setLoadingPoi] = useState(false)

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
        const placeId = e.detail.placeId

        // Native Google Maps POI tapped (shop, restaurant, etc.)
        if (placeId && placesService) {
          setSelectedFood(null)
          onClearSearchPin()
          setLoadingPoi(true)
          placesService.getDetails(
            { placeId, fields: ['name', 'geometry', 'formatted_address', 'rating'] },
            (place: any, status: any) => {
              setLoadingPoi(false)
              if (status === 'OK' && place) {
                setNativePoi({
                  placeId,
                  name: place.name || '',
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng(),
                  address: place.formatted_address || '',
                })
              }
            }
          )
          return
        }

        // Regular map tap
        if (lat !== undefined && lng !== undefined) {
          setSelectedFood(null)
          setNativePoi(null)
          onClearSearchPin()
          onMapClick(lat, lng)
        }
      }}
    >
      <MapRefSetter mapRef={mapRef} />

      {/* Current location — blue pulsing dot */}
      {currentPos && <CurrentLocationDot lat={currentPos.lat} lng={currentPos.lng} />}

      {/* Search result pin — purple */}
      {searchPin && (
        <AdvancedMarker position={{ lat: searchPin.lat, lng: searchPin.lng }} onClick={onSearchPinClick}>
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

      {/* Diary entry pins — pink teardrop */}
      {showDiaryPins && visibleEntries.map(entry => (
        <AdvancedMarker
          key={entry.id}
          position={{ lat: entry.lat, lng: entry.lng }}
          onClick={() => { setSelectedFood(null); setNativePoi(null); onClearSearchPin(); onSelectEntry(entry) }}
        >
          <Pin
            background={entry.id === selectedEntryId ? '#ef4444' : '#ec4899'}
            borderColor={entry.id === selectedEntryId ? '#dc2626' : '#db2777'}
            glyphColor="white"
            scale={entry.id === selectedEntryId ? 1.2 : 1.0}
          />
        </AdvancedMarker>
      ))}

      {/* Food/cafe markers */}
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

      {/* Selected diary entry InfoWindow */}
      {selectedEntry && (
        <InfoWindow
          position={{ lat: selectedEntry.lat, lng: selectedEntry.lng }}
          pixelOffset={[0, -40]}
          onClose={() => {}}
        >
          <div style={{ minWidth: 140, maxWidth: 200 }}>
            {selectedEntry.placeName && (
              <p style={{ fontSize: 11, fontWeight: 600, color: '#ec4899', marginBottom: 2 }}>
                📍 {selectedEntry.placeName}
              </p>
            )}
            <p style={{ fontWeight: 600, fontSize: 13, color: '#1f2937' }}>{selectedEntry.title}</p>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{selectedEntry.date}</p>
          </div>
        </InfoWindow>
      )}

      {/* Food POI InfoWindow — 日記を書く + Google Mapsで見る */}
      {selectedFood && (
        <InfoWindow
          position={{ lat: selectedFood.lat, lng: selectedFood.lng }}
          pixelOffset={[0, -20]}
          onClose={() => setSelectedFood(null)}
        >
          <div style={{ minWidth: 160 }}>
            <p style={{ fontWeight: 600, fontSize: 13, color: '#1f2937' }}>{selectedFood.name}</p>
            <p style={{ fontSize: 11, color: '#6b7280' }}>{selectedFood.vicinity}</p>
            {selectedFood.rating && (
              <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>★ {selectedFood.rating}</p>
            )}
            <button
              onClick={() => { setSelectedFood(null); onPoiClick(selectedFood.lat, selectedFood.lng, selectedFood.name) }}
              style={{ marginTop: 8, width: '100%', padding: '6px 0', background: '#ec4899', color: 'white', fontSize: 12, borderRadius: 20, fontWeight: 600, border: 'none', cursor: 'pointer' }}
            >
              📖 日記を書く
            </button>
            <button
              onClick={() => openInGoogleMaps(selectedFood.lat, selectedFood.lng, selectedFood.placeId)}
              style={{ marginTop: 4, width: '100%', padding: '5px 0', background: '#f9fafb', color: '#4285F4', fontSize: 11, borderRadius: 20, fontWeight: 500, border: '1px solid #e5e7eb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
            >
              <span>Google Mapsで見る</span>
            </button>
          </div>
        </InfoWindow>
      )}

      {/* Native Google Maps POI InfoWindow */}
      {nativePoi && (
        <InfoWindow
          position={{ lat: nativePoi.lat, lng: nativePoi.lng }}
          pixelOffset={[0, -10]}
          onClose={() => setNativePoi(null)}
        >
          <div style={{ minWidth: 160 }}>
            {loadingPoi
              ? <p style={{ fontSize: 12, color: '#9ca3af' }}>読み込み中...</p>
              : <>
                  <p style={{ fontWeight: 600, fontSize: 13, color: '#1f2937' }}>{nativePoi.name}</p>
                  {nativePoi.address && (
                    <p style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{nativePoi.address}</p>
                  )}
                  <button
                    onClick={() => { setNativePoi(null); onPoiClick(nativePoi.lat, nativePoi.lng, nativePoi.name) }}
                    style={{ marginTop: 8, width: '100%', padding: '6px 0', background: '#ec4899', color: 'white', fontSize: 12, borderRadius: 20, fontWeight: 600, border: 'none', cursor: 'pointer' }}
                  >
                    📖 日記を書く
                  </button>
                  <button
                    onClick={() => openInGoogleMaps(nativePoi.lat, nativePoi.lng, nativePoi.placeId)}
                    style={{ marginTop: 4, width: '100%', padding: '5px 0', background: '#f9fafb', color: '#4285F4', fontSize: 11, borderRadius: 20, fontWeight: 500, border: '1px solid #e5e7eb', cursor: 'pointer' }}
                  >
                    Google Mapsで見る
                  </button>
                </>
            }
          </div>
        </InfoWindow>
      )}

      {/* Left overlay controls */}
      <div style={{ position: 'absolute', bottom: 90, left: 12, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }}>
        <button onClick={() => searchNearby('restaurant')} style={fabStyle(foodMode === 'restaurant', '#ea580c')} title="レストラン">
          {loadingFood && foodMode === 'restaurant'
            ? <div style={{ width: 18, height: 18, border: '2px solid #ea580c', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            : <Utensils size={18} color={foodMode === 'restaurant' ? 'white' : '#ea580c'} />
          }
        </button>
        <button onClick={() => searchNearby('cafe')} style={fabStyle(foodMode === 'cafe', '#7c3aed')} title="カフェ">
          {loadingFood && foodMode === 'cafe'
            ? <div style={{ width: 18, height: 18, border: '2px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            : <Coffee size={18} color={foodMode === 'cafe' ? 'white' : '#7c3aed'} />
          }
        </button>
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
          0%   { transform: scale(0.9); opacity: 0.9 }
          70%  { transform: scale(1.8); opacity: 0.15 }
          100% { transform: scale(2);   opacity: 0 }
        }
      `}</style>
    </Map>
  )
}

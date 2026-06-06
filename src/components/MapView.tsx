import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Map, AdvancedMarker, Pin, InfoWindow, useMap, useMapsLibrary,
} from '@vis.gl/react-google-maps'
import { Utensils, MapPin, EyeOff, Coffee, Star, Navigation2 } from 'lucide-react'
import type { Entry } from '../types'
import type { AppSettings } from '../settings'
import { MAP_STYLES } from '../settings'
import { getCachedGeo, setCachedGeo } from '../utils/geoCache'

type FoodPlace = { placeId: string; name: string; lat: number; lng: number; vicinity: string; rating?: number }
type NativePoi  = { placeId: string; name: string; lat: number; lng: number; address: string }
type SearchPin  = { lat: number; lng: number; name: string }

// ~33m threshold — tight enough to match "same building/restaurant" but won't
// accidentally catch other places 50m+ away on the same block.
const NEARBY_M = 0.0003

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
  sheetOpen: boolean
}

function MapSetup({ mapRef }: { mapRef: Props['mapRef'] }) {
  const map = useMap()
  useEffect(() => {
    mapRef.current = map
    if (map) map.setOptions({ keyboardShortcuts: false })
    return () => { mapRef.current = null }
  }, [map, mapRef])
  return null
}

/**
 * Keeps the base map type regardless of food mode.
 * Food mode shows search results without hiding Google Maps default POIs.
 */
function MapStylesController({ baseMapTypeId }: { baseMapTypeId: string }) {
  const map = useMap()

  useEffect(() => {
    if (!map) return
    // Always use the base map type (don't hide POIs during food mode)
    map.setMapTypeId(baseMapTypeId)
  }, [map, baseMapTypeId])

  return null
}

function CurrentLocationDot({ lat, lng }: { lat: number; lng: number }) {
  return (
    <AdvancedMarker position={{ lat, lng }} zIndex={9999}>
      <div style={{ position: 'relative', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', width: 36, height: 36, borderRadius: '50%', background: 'rgba(66,133,244,0.2)', border: '1px solid rgba(66,133,244,0.4)', animation: 'locPulse 2s ease-out infinite' }} />
        <div style={{ position: 'absolute', width: 20, height: 20, borderRadius: '50%', background: 'white', boxShadow: '0 0 0 2px rgba(66,133,244,0.3)' }} />
        <div style={{ position: 'absolute', width: 14, height: 14, borderRadius: '50%', background: '#4285F4', boxShadow: '0 2px 6px rgba(66,133,244,0.7)' }} />
      </div>
    </AdvancedMarker>
  )
}

/**
 * Open Google Maps at the given location.
 * Uses the Maps URL API format which works reliably on iOS (native Google Maps app).
 * The old @lat,lng,17z format causes "search not found" on mobile.
 */
function openInGoogleMaps(lat: number, lng: number, name?: string, placeId?: string) {
  let url: string
  if (placeId && name) {
    // With place ID + name: most reliable, shows the correct POI
    url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${placeId}`
  } else if (placeId) {
    url = `https://www.google.com/maps/search/?api=1&query_place_id=${placeId}`
  } else if (name) {
    // Coordinates + name: shows a labeled pin at the location
    url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}@${lat},${lng}`
  } else {
    // Coordinates only
    url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
  }
  window.open(url, '_blank')
}

const InfoBtn = ({ label, bg, color, onClick }: { label: string; bg: string; color: string; onClick: () => void }) => (
  <button onClick={onClick} style={{ marginTop: 6, width: '100%', padding: '6px 0', background: bg, color, fontSize: 12, borderRadius: 20, fontWeight: 600, border: color === '#4285F4' ? '1px solid #e5e7eb' : 'none', cursor: 'pointer' }}>
    {label}
  </button>
)

function getEntryPinColor(entry: Entry, tagColors: Record<string, string>): string {
  if (entry.wantToVisit) return '#7c3aed'
  for (const tag of entry.tags) {
    if (tagColors[tag]) return tagColors[tag]
  }
  return '#ec4899'
}

function darkenHex(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, ((n >> 16) & 0xff) - 40)
  const g = Math.max(0, ((n >> 8) & 0xff) - 40)
  const b = Math.max(0, (n & 0xff) - 40)
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}

/** Check if diary entries exist near a given location (~100m threshold) */
function hasNearbyDiaryEntry(entries: Entry[], lat: number, lng: number): boolean {
  return entries.some(e =>
    !e.wantToVisit &&
    Math.abs(e.lat - lat) < NEARBY_M &&
    Math.abs(e.lng - lng) < NEARBY_M
  )
}

export function MapView({ entries, selectedEntryId, onSelectEntry, onMapClick, onPoiClick, settings, filterTag, searchQuery, mapRef, searchPin, onSearchPinClick, onClearSearchPin, sheetOpen }: Props) {
  const map = useMap()
  const placesLib = useMapsLibrary('places')
  const mapStyle = MAP_STYLES[settings.mapStyle]

  const [userShowDiaryPins, setUserShowDiaryPins] = useState(true)
  const [foodMode, setFoodMode] = useState<'none' | 'restaurant' | 'cafe'>('none')
  const [foodPlaces, setFoodPlaces] = useState<FoodPlace[]>([])
  const [selectedFood, setSelectedFood] = useState<FoodPlace | null>(null)
  const [loadingFood, setLoadingFood] = useState(false)
  const [nativePoi, setNativePoi] = useState<NativePoi | null>(null)
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(() => getCachedGeo())
  const watchIdRef = useRef<number | null>(null)

  // Show diary pins when user hasn't manually hidden them (independent of food mode)
  const showDiaryPins = userShowDiaryPins

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [])

  const handleLocate = () => {
    if (!navigator.geolocation) return
    if (watchIdRef.current === null) {
      const id = navigator.geolocation.watchPosition(
        p => {
          const pos = { lat: p.coords.latitude, lng: p.coords.longitude }
          setCurrentPos(pos); setCachedGeo(pos.lat, pos.lng)
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000 },
      )
      watchIdRef.current = id
    }
    const cached = getCachedGeo()
    if (cached) map?.panTo(cached)
    else navigator.geolocation.getCurrentPosition(p => {
      const pos = { lat: p.coords.latitude, lng: p.coords.longitude }
      setCurrentPos(pos); setCachedGeo(pos.lat, pos.lng); map?.panTo(pos)
    })
  }

  const placesService = useMemo(() => placesLib && map ? new placesLib.PlacesService(map) : null, [placesLib, map])

  const searchNearby = (type: 'restaurant' | 'cafe') => {
    if (foodMode === type) {
      setFoodMode('none'); setFoodPlaces([]); setSelectedFood(null); setNativePoi(null); return
    }
    if (!placesService || !map) return
    setFoodMode(type); setLoadingFood(true); setFoodPlaces([]); setSelectedFood(null); setNativePoi(null)
    const center = map.getCenter()
    if (!center) { setLoadingFood(false); return }
    placesService.nearbySearch(
      { location: { lat: center.lat(), lng: center.lng() }, radius: 800, type },
      (results: any, status: any) => {
        setLoadingFood(false)
        if (status === 'OK' && results) {
          setFoodPlaces(results.slice(0, 30).map((p: any) => ({
            placeId: p.place_id, name: p.name,
            lat: p.geometry.location.lat(), lng: p.geometry.location.lng(),
            vicinity: p.vicinity || '', rating: p.rating,
          })))
        }
      },
    )
  }

  const visibleEntries = useMemo(() => entries.filter(e => {
    if (filterTag && !e.tags.includes(filterTag)) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return e.title.toLowerCase().includes(q) || e.placeName.toLowerCase().includes(q) || e.tags.some(t => t.toLowerCase().includes(q))
    }
    return true
  }), [entries, filterTag, searchQuery])

  const selectedEntry = entries.find(e => e.id === selectedEntryId) ?? null
  const diaryEntries = visibleEntries.filter(e => !e.wantToVisit)
  const wishlistEntries = visibleEntries.filter(e => e.wantToVisit)

  const fabStyle = (active: boolean, color: string): React.CSSProperties => ({
    width: 44, height: 44, borderRadius: '50%',
    background: active ? color : 'white',
    border: active ? `2px solid ${color}` : '1px solid #e5e7eb',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  })

  // Handle food/cafe marker tap:
  // - If the user has visited this place before → show history immediately (no InfoWindow step)
  // - Otherwise → show the InfoWindow with restaurant details
  const handleFoodMarkerTap = (place: FoodPlace) => {
    if (hasNearbyDiaryEntry(entries, place.lat, place.lng)) {
      setSelectedFood(null)
      onPoiClick(place.lat, place.lng, place.name)
    } else {
      setSelectedFood(place)
    }
  }

  return (
    <Map
      defaultCenter={{ lat: settings.defaultLat, lng: settings.defaultLng }}
      defaultZoom={settings.defaultZoom}
      mapTypeId={mapStyle.mapTypeId}
      mapId="DEMO_MAP_ID"
      disableDefaultUI={true}
      zoomControl={false}
      gestureHandling={sheetOpen ? 'none' : 'greedy'}
      className="w-full h-full"
      {...({ keyboardShortcuts: false } as any)}
      onClick={e => {
        const lat = e.detail.latLng?.lat
        const lng = e.detail.latLng?.lng
        const placeId = e.detail.placeId

        if (placeId && placesService) {
          // Tapped a Google Maps native POI (restaurant, cafe, etc.)
          e.stop()
          setSelectedFood(null); onClearSearchPin()
          placesService.getDetails(
            { placeId, fields: ['name', 'geometry', 'formatted_address', 'rating'] },
            (place: any, status: any) => {
              if (status === 'OK' && place) {
                const poiLat = place.geometry.location.lat()
                const poiLng = place.geometry.location.lng()
                const poiName = place.name || ''
                // Bug fix: check history immediately on tap, not after InfoWindow button press
                if (hasNearbyDiaryEntry(entries, poiLat, poiLng)) {
                  onPoiClick(poiLat, poiLng, poiName)
                } else {
                  setNativePoi({ placeId, name: poiName, lat: poiLat, lng: poiLng, address: place.formatted_address || '' })
                }
              }
            },
          )
          return
        }
        if (lat !== undefined && lng !== undefined) {
          setSelectedFood(null); setNativePoi(null); onClearSearchPin()
          onMapClick(lat, lng)
        }
      }}
    >
      <MapSetup mapRef={mapRef} />
      <MapStylesController baseMapTypeId={mapStyle.mapTypeId} />

      {currentPos && <CurrentLocationDot lat={currentPos.lat} lng={currentPos.lng} />}

      {searchPin && (
        <AdvancedMarker position={{ lat: searchPin.lat, lng: searchPin.lng }} onClick={onSearchPinClick}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ background: '#7c3aed', color: 'white', borderRadius: 12, padding: '4px 10px', fontSize: 12, fontWeight: 600, marginBottom: 4, whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', boxShadow: '0 2px 8px rgba(124,58,237,0.4)' }}>
              ここに記録する
            </div>
            <div style={{ width: 20, height: 20, background: '#7c3aed', borderRadius: '50%', border: '3px solid white', boxShadow: '0 2px 6px rgba(124,58,237,0.4)' }} />
          </div>
        </AdvancedMarker>
      )}

      {showDiaryPins && diaryEntries.map(entry => {
        const color = getEntryPinColor(entry, settings.tagColors)
        const border = darkenHex(color)
        // Count how many entries are at this location (for multi-visit badge)
        const sameLocationCount = diaryEntries.filter(e =>
          Math.abs(e.lat - entry.lat) < NEARBY_M && Math.abs(e.lng - entry.lng) < NEARBY_M
        ).length
        return (
          <AdvancedMarker key={entry.id} position={{ lat: entry.lat, lng: entry.lng }}
            onClick={() => {
              setSelectedFood(null); setNativePoi(null); onClearSearchPin()
              // Bug fix: pink pin tap → show history (same as POI tap)
              // onPoiClick triggers openFormOrHistory in App.tsx which shows history sheet
              onPoiClick(entry.lat, entry.lng, entry.placeName || entry.title)
            }}>
            {sameLocationCount > 1 ? (
              // Multiple visits badge on the pin
              <div style={{ position: 'relative' }}>
                <Pin background={entry.id === selectedEntryId ? border : color} borderColor={border} glyphColor="white" scale={entry.id === selectedEntryId ? 1.2 : 1.0} />
                <div style={{ position: 'absolute', top: -4, right: -4, background: '#f59e0b', color: 'white', borderRadius: '50%', width: 16, height: 16, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                  {sameLocationCount}
                </div>
              </div>
            ) : (
              <Pin background={entry.id === selectedEntryId ? border : color} borderColor={border} glyphColor="white" scale={entry.id === selectedEntryId ? 1.2 : 1.0} />
            )}
          </AdvancedMarker>
        )
      })}

      {showDiaryPins && wishlistEntries.map(entry => (
        <AdvancedMarker key={entry.id} position={{ lat: entry.lat, lng: entry.lng }}
          onClick={() => {
            // Wishlist pins: show the entry detail directly (not history)
            setSelectedFood(null); setNativePoi(null); onClearSearchPin(); onSelectEntry(entry)
          }}>
          <Pin background="#7c3aed" borderColor="#6d28d9" glyphColor="white" glyph={<Star size={10} fill="white" color="white" />} />
        </AdvancedMarker>
      ))}

      {/* Food/cafe markers — tap immediately checks history */}
      {foodMode !== 'none' && foodPlaces.map(place => {
        const hasHistory = hasNearbyDiaryEntry(entries, place.lat, place.lng)
        return (
          <AdvancedMarker key={place.placeId} position={{ lat: place.lat, lng: place.lng }}
            onClick={() => handleFoodMarkerTap(place)}>
            <div style={{
              width: hasHistory ? 36 : 32,
              height: hasHistory ? 36 : 32,
              borderRadius: '50%',
              background: foodMode === 'cafe' ? '#7c3aed' : '#ea580c',
              border: hasHistory ? '3px solid #fbbf24' : '2px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: hasHistory ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 6px rgba(0,0,0,0.3)',
            }}>
              {foodMode === 'cafe' ? <Coffee size={14} color="white" /> : <Utensils size={14} color="white" />}
            </div>
          </AdvancedMarker>
        )
      })}

      {/* Diary entry InfoWindow */}
      {selectedEntry && (
        <InfoWindow position={{ lat: selectedEntry.lat, lng: selectedEntry.lng }} pixelOffset={[0, -40]} onClose={() => {}}>
          <div style={{ minWidth: 140, maxWidth: 200 }}>
            {selectedEntry.placeName && <p style={{ fontSize: 11, fontWeight: 600, color: '#ec4899', marginBottom: 2 }}>{selectedEntry.placeName}</p>}
            <p style={{ fontWeight: 600, fontSize: 13, color: '#1f2937' }}>{selectedEntry.title}</p>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{selectedEntry.date}</p>
          </div>
        </InfoWindow>
      )}

      {/* Food POI InfoWindow (only shown when NO nearby diary entries) */}
      {selectedFood && (
        <InfoWindow position={{ lat: selectedFood.lat, lng: selectedFood.lng }} pixelOffset={[0, -20]} onClose={() => setSelectedFood(null)}>
          <div style={{ minWidth: 160 }}>
            <p style={{ fontWeight: 600, fontSize: 13, color: '#1f2937' }}>{selectedFood.name}</p>
            <p style={{ fontSize: 11, color: '#6b7280' }}>{selectedFood.vicinity}</p>
            {selectedFood.rating && <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>★ {selectedFood.rating}</p>}
            <InfoBtn label="日記を書く" bg="#ec4899" color="white" onClick={() => { setSelectedFood(null); onPoiClick(selectedFood.lat, selectedFood.lng, selectedFood.name) }} />
            <InfoBtn label="Google Mapsで見る" bg="#f9fafb" color="#4285F4" onClick={() => openInGoogleMaps(selectedFood.lat, selectedFood.lng, selectedFood.name, selectedFood.placeId)} />
          </div>
        </InfoWindow>
      )}

      {/* Native POI InfoWindow (only shown when NO nearby diary entries) */}
      {nativePoi && (
        <InfoWindow position={{ lat: nativePoi.lat, lng: nativePoi.lng }} pixelOffset={[0, -10]} onClose={() => setNativePoi(null)}>
          <div style={{ minWidth: 160 }}>
            <p style={{ fontWeight: 600, fontSize: 13, color: '#1f2937' }}>{nativePoi.name}</p>
            {nativePoi.address && <p style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{nativePoi.address}</p>}
            <InfoBtn label="日記を書く" bg="#ec4899" color="white" onClick={() => { setNativePoi(null); onPoiClick(nativePoi.lat, nativePoi.lng, nativePoi.name) }} />
            <InfoBtn label="Google Mapsで見る" bg="#f9fafb" color="#4285F4" onClick={() => openInGoogleMaps(nativePoi.lat, nativePoi.lng, nativePoi.name, nativePoi.placeId)} />
          </div>
        </InfoWindow>
      )}

      {/* Left overlay controls */}
      <div style={{ position: 'absolute', bottom: 90, left: 12, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }}>
        <button onClick={() => searchNearby('restaurant')} style={fabStyle(foodMode === 'restaurant', '#ea580c')} title="レストラン">
          {loadingFood && foodMode === 'restaurant'
            ? <div style={{ width: 18, height: 18, border: '2px solid #ea580c', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            : <Utensils size={18} color={foodMode === 'restaurant' ? 'white' : '#ea580c'} />}
        </button>
        <button onClick={() => searchNearby('cafe')} style={fabStyle(foodMode === 'cafe', '#7c3aed')} title="カフェ">
          {loadingFood && foodMode === 'cafe'
            ? <div style={{ width: 18, height: 18, border: '2px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            : <Coffee size={18} color={foodMode === 'cafe' ? 'white' : '#7c3aed'} />}
        </button>
        <button onClick={() => setUserShowDiaryPins(v => !v)} style={fabStyle(false, '#ec4899')} title="記録ピン切替">
          {userShowDiaryPins ? <MapPin size={18} color="#ec4899" /> : <EyeOff size={18} color="#ec4899" />}
        </button>
        <button onClick={handleLocate} style={fabStyle(false, '#4285F4')} title="現在地">
          <Navigation2 size={18} color="#4285F4" />
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes locPulse { 0% { transform: scale(0.9); opacity: 0.9 } 70% { transform: scale(1.8); opacity: 0.15 } 100% { transform: scale(2); opacity: 0 } }
      `}</style>
    </Map>
  )
}

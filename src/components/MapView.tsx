import { useEffect, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Entry } from '../types'
import type { AppSettings } from '../settings'
import { MAP_TILES } from '../settings'

// Fix Leaflet default icon paths for Vite builds
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Bug fix: never pass icon={undefined} to Marker — it sets options.icon=undefined
// which makes Leaflet crash with "Cannot read properties of undefined (reading 'createIcon')"
const defaultIcon = new L.Icon.Default()

const selectedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
})

// Bug fix: skip initial mount so MapContainer's own center/zoom is used.
// Only call setView when settings CHANGE after mount.
function MapSettingsUpdater({ settings }: { settings: AppSettings }) {
  const map = useMap()
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    map.setView([settings.defaultLat, settings.defaultLng], settings.defaultZoom, { animate: false })
  }, [settings.defaultLat, settings.defaultLng, settings.defaultZoom, map])
  return null
}

function FlyTo({ entryId, entries }: { entryId: string | null; entries: Entry[] }) {
  const map = useMap()
  useEffect(() => {
    if (!entryId) return
    const entry = entries.find(e => e.id === entryId)
    if (entry) map.flyTo([entry.lat, entry.lng], 14, { duration: 1 })
  }, [entryId, entries, map])
  return null
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  const map = useMap()
  useEffect(() => {
    const handler = (e: L.LeafletMouseEvent) => onMapClick(e.latlng.lat, e.latlng.lng)
    map.on('click', handler)
    return () => { map.off('click', handler) }
  }, [map, onMapClick])
  return null
}

// Expose map ref so App.tsx can call locate() without putting the button inside MapContainer
function MapRefSetter({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap()
  useEffect(() => { mapRef.current = map; return () => { mapRef.current = null } }, [map, mapRef])
  return null
}

type Props = {
  entries: Entry[]
  selectedEntryId: string | null
  onSelectEntry: (entry: Entry) => void
  onMapClick: (lat: number, lng: number) => void
  settings: AppSettings
  filterTag: string | null
  searchQuery: string
  mapRef: React.MutableRefObject<L.Map | null>
}

export function MapView({ entries, selectedEntryId, onSelectEntry, onMapClick, settings, filterTag, searchQuery, mapRef }: Props) {
  const tile = MAP_TILES[settings.mapStyle]

  const visibleEntries = entries.filter(e => {
    if (filterTag && !e.tags.includes(filterTag)) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return e.title.toLowerCase().includes(q) ||
        e.placeName.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q))
    }
    return true
  })

  const handleMarkerClick = useCallback((e: L.LeafletMouseEvent, entry: Entry) => {
    e.originalEvent?.stopPropagation()
    onSelectEntry(entry)
  }, [onSelectEntry])

  return (
    <MapContainer
      center={[settings.defaultLat, settings.defaultLng]}
      zoom={settings.defaultZoom}
      className="w-full h-full"
      zoomControl={true}
    >
      <TileLayer attribution={tile.attribution} url={tile.url} />
      <MapSettingsUpdater settings={settings} />
      <FlyTo entryId={selectedEntryId} entries={entries} />
      <MapRefSetter mapRef={mapRef} />
      {visibleEntries.map(entry => (
        <Marker
          key={entry.id}
          position={[entry.lat, entry.lng]}
          icon={selectedEntryId === entry.id ? selectedIcon : defaultIcon}
          eventHandlers={{ click: e => handleMarkerClick(e, entry) }}
        >
          <Popup>
            <div className="min-w-[150px]">
              <p className="font-semibold text-sm text-gray-800">{entry.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{entry.date}</p>
              {entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {entry.tags.map(tag => (
                    <span key={tag} className="text-[11px] bg-pink-50 text-pink-500 px-1.5 py-0.5 rounded-full">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
      <MapClickHandler onMapClick={onMapClick} />
    </MapContainer>
  )
}

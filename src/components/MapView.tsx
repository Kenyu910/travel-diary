import { useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { LocateFixed } from 'lucide-react'
import type { Entry } from '../types'
import type { AppSettings } from '../settings'
import { MAP_TILES } from '../settings'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const selectedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
})

// Bug fix: update map view when settings change (MapContainer center/zoom are initial-only)
function MapSettingsUpdater({ settings }: { settings: AppSettings }) {
  const map = useMap()
  useEffect(() => {
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

function GeolocateButton() {
  const map = useMap()
  const locate = useCallback(() => {
    map.locate({ setView: true, maxZoom: 15 })
  }, [map])
  return (
    <div className="leaflet-bottom leaflet-right" style={{ marginBottom: 24 }}>
      <div className="leaflet-control">
        <button
          onClick={locate}
          title="現在地"
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'white', border: '1px solid #e5e7eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          }}
        >
          <LocateFixed size={16} color="#f472b6" />
        </button>
      </div>
    </div>
  )
}

type Props = {
  entries: Entry[]
  selectedEntryId: string | null
  onSelectEntry: (entry: Entry) => void
  onMapClick: (lat: number, lng: number) => void
  settings: AppSettings
  filterTag: string | null
  searchQuery: string
}

export function MapView({ entries, selectedEntryId, onSelectEntry, onMapClick, settings, filterTag, searchQuery }: Props) {
  const tile = MAP_TILES[settings.mapStyle]

  // Filter visible pins
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

  return (
    // key on mapStyle forces TileLayer remount when style changes
    <MapContainer
      key={settings.mapStyle}
      center={[settings.defaultLat, settings.defaultLng]}
      zoom={settings.defaultZoom}
      className="w-full h-full"
    >
      <TileLayer attribution={tile.attribution} url={tile.url} />
      <MapSettingsUpdater settings={settings} />
      <FlyTo entryId={selectedEntryId} entries={entries} />
      <GeolocateButton />
      {visibleEntries.map(entry => (
        <Marker
          key={entry.id}
          position={[entry.lat, entry.lng]}
          icon={selectedEntryId === entry.id ? selectedIcon : undefined}
          eventHandlers={{
            click: e => { L.DomEvent.stopPropagation(e); onSelectEntry(entry) },
          }}
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

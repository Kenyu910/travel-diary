import { useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
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
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

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
    <div className="leaflet-bottom leaflet-right" style={{ marginBottom: 30 }}>
      <div className="leaflet-control leaflet-bar">
        <button
          onClick={locate}
          title="現在地を表示"
          style={{
            width: 30, height: 30, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 16, cursor: 'pointer',
            background: 'white', border: 'none',
          }}
        >
          📍
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
}

export function MapView({ entries, selectedEntryId, onSelectEntry, onMapClick, settings }: Props) {
  const tile = MAP_TILES[settings.mapStyle]
  return (
    <MapContainer
      center={[settings.defaultLat, settings.defaultLng]}
      zoom={settings.defaultZoom}
      className="w-full h-full"
    >
      <TileLayer attribution={tile.attribution} url={tile.url} />
      <FlyTo entryId={selectedEntryId} entries={entries} />
      <GeolocateButton />
      {entries.map(entry => (
        <Marker
          key={entry.id}
          position={[entry.lat, entry.lng]}
          icon={selectedEntryId === entry.id ? selectedIcon : undefined}
          eventHandlers={{
            click: e => {
              L.DomEvent.stopPropagation(e)
              onSelectEntry(entry)
            },
          }}
        >
          <Popup>
            <div className="min-w-[160px]">
              <p className="font-semibold text-sm">{entry.title}</p>
              <p className="text-xs text-gray-500">{entry.date}</p>
              {entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {entry.tags.map(tag => (
                    <span key={tag} className="text-xs bg-pink-100 text-pink-600 px-1 rounded-full">
                      #{tag}
                    </span>
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

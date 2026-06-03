import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Entry } from '../types'

// Fix default marker icons
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

function FlyTo({ entry }: { entry: Entry | null }) {
  const map = useMap()
  useEffect(() => {
    if (entry) {
      map.flyTo([entry.lat, entry.lng], 14, { duration: 1 })
    }
  }, [entry, map])
  return null
}

type Props = {
  entries: Entry[]
  selectedEntry: Entry | null
  onSelectEntry: (entry: Entry) => void
  onMapClick: (lat: number, lng: number) => void
}

export function MapView({ entries, selectedEntry, onSelectEntry, onMapClick }: Props) {
  return (
    <MapContainer
      center={[35.6762, 139.6503]}
      zoom={10}
      className="w-full h-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyTo entry={selectedEntry} />
      {entries.map(entry => (
        <Marker
          key={entry.id}
          position={[entry.lat, entry.lng]}
          icon={selectedEntry?.id === entry.id ? selectedIcon : undefined}
          eventHandlers={{ click: () => onSelectEntry(entry) }}
        >
          <Popup>
            <div className="min-w-[160px]">
              <p className="font-semibold text-sm">{entry.title}</p>
              <p className="text-xs text-gray-500">{entry.date}</p>
              {entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {entry.tags.map(tag => (
                    <span key={tag} className="text-xs bg-blue-100 text-blue-700 px-1 rounded">
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

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  const map = useMap()
  useEffect(() => {
    const handler = (e: L.LeafletMouseEvent) => onMapClick(e.latlng.lat, e.latlng.lng)
    map.on('click', handler)
    return () => { map.off('click', handler) }
  }, [map, onMapClick])
  return null
}

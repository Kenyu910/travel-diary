import { useEffect } from 'react'
import {
  Map, AdvancedMarker, Pin, InfoWindow, useMap,
} from '@vis.gl/react-google-maps'
import type { Entry } from '../types'
import type { AppSettings } from '../settings'
import { MAP_STYLES } from '../settings'

type Props = {
  entries: Entry[]
  selectedEntryId: string | null
  onSelectEntry: (entry: Entry) => void
  onMapClick: (lat: number, lng: number) => void
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
  entries, selectedEntryId, onSelectEntry, onMapClick,
  settings, filterTag, searchQuery, mapRef,
}: Props) {
  const mapStyle = MAP_STYLES[settings.mapStyle]

  const visibleEntries = entries.filter(e => {
    if (filterTag && !e.tags.includes(filterTag)) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        e.title.toLowerCase().includes(q) ||
        e.placeName.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q))
      )
    }
    return true
  })

  const selectedEntry = entries.find(e => e.id === selectedEntryId) ?? null

  return (
    <Map
      defaultCenter={{ lat: settings.defaultLat, lng: settings.defaultLng }}
      defaultZoom={settings.defaultZoom}
      mapTypeId={mapStyle.mapTypeId}
      mapId="DEMO_MAP_ID"
      disableDefaultUI={false}
      gestureHandling="greedy"
      className="w-full h-full"
      onClick={e => {
        const lat = e.detail.latLng?.lat
        const lng = e.detail.latLng?.lng
        if (lat !== undefined && lng !== undefined) onMapClick(lat, lng)
      }}
    >
      <MapRefSetter mapRef={mapRef} />

      {visibleEntries.map(entry => {
        const isSelected = entry.id === selectedEntryId
        return (
          <AdvancedMarker
            key={entry.id}
            position={{ lat: entry.lat, lng: entry.lng }}
            onClick={() => onSelectEntry(entry)}
          >
            <Pin
              background={isSelected ? '#ef4444' : '#ec4899'}
              borderColor={isSelected ? '#dc2626' : '#db2777'}
              glyphColor="white"
              scale={isSelected ? 1.2 : 1.0}
            />
          </AdvancedMarker>
        )
      })}

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
    </Map>
  )
}

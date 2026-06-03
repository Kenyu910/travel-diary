import { useState, useCallback, useRef, useMemo } from 'react'
import { PlusCircle, Navigation2 } from 'lucide-react'
import { APIProvider, useMapsLibrary, useMap } from '@vis.gl/react-google-maps'
import { MapView } from './components/MapView'
import { MapErrorBoundary } from './components/MapErrorBoundary'
import { PlacesSearch } from './components/PlacesSearch'
import { BottomSheet } from './components/BottomSheet'
import { BottomNav } from './components/BottomNav'
import type { Tab } from './components/BottomNav'
import { DiaryList } from './components/DiaryList'
import { TagsView } from './components/TagsView'
import { CalendarView } from './components/CalendarView'
import { EntryForm } from './components/EntryForm'
import { EntryDetail } from './components/EntryDetail'
import { SettingsView } from './components/SettingsView'
import { useEntries } from './store'
import { useSettings } from './settings'
import type { Entry } from './types'

// Sheet is ONLY used for map interactions (form/detail/edit)
type Sheet = 'form' | 'detail' | 'edit' | null

const SHEET_TITLES: Record<NonNullable<Sheet>, string> = {
  form:  '新しい記録',
  edit:  '記録を編集',
  detail: '',
}

function AppContent() {
  const { entries, addEntry, updateEntry, deleteEntry, setEntries } = useEntries()
  const { settings, update: updateSettings } = useSettings()

  const [tab, setTab] = useState<Tab>('map')
  const [sheet, setSheet] = useState<Sheet>(null)
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [clickedPos, setClickedPos] = useState<{ lat: number; lng: number } | null>(null)
  const [clickedPlaceName, setClickedPlaceName] = useState('')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [searchPin, setSearchPin] = useState<{ lat: number; lng: number; name: string } | null>(null)

  const mapRef = useRef<ReturnType<typeof useMap> | null>(null)
  const sheetRef = useRef<Sheet>(null)
  sheetRef.current = sheet

  const geocodingLib = useMapsLibrary('geocoding')
  const geocoder = useMemo(
    () => geocodingLib ? new geocodingLib.Geocoder() : null,
    [geocodingLib]
  )

  const reverseGeocode = useCallback((lat: number, lng: number, cb: (name: string) => void) => {
    if (!geocoder) return
    geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
      if (status === 'OK' && results?.[0]) {
        const comps = results[0].address_components as any[]
        const find = (...types: string[]) => comps?.find((c: any) => types.some(t => c.types.includes(t)))?.long_name || ''
        const locality = find('sublocality_level_2') || find('sublocality_level_1') || find('locality')
        const subloc = find('premise') || find('route')
        cb(subloc ? `${locality} ${subloc}`.trim() : locality)
      }
    })
  }, [geocoder])

  const closeSheet = useCallback(() => {
    if (sheetRef.current === 'edit') { setSheet('detail'); return }
    setSheet(null)
    setSelectedEntry(null)
  }, [])

  const handleTabChange = (t: Tab) => {
    setTab(t)
    if (t === 'map') {
      // Closing non-map tab → back to map
    }
  }

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setSearchPin(null)
    setClickedPos({ lat, lng })
    setClickedPlaceName('')
    setSelectedEntry(null)
    setSheet('form')
    reverseGeocode(lat, lng, name => setClickedPlaceName(name))
  }, [reverseGeocode])

  // Search result → show pin on map, let user tap to confirm
  const handlePlaceSelected = useCallback((lat: number, lng: number, name: string) => {
    setSearchPin({ lat, lng, name })
    mapRef.current?.panTo({ lat, lng })
    mapRef.current?.setZoom(16)
  }, [])

  // User taps the search pin → open form
  const handleSearchPinClick = useCallback(() => {
    if (!searchPin) return
    setClickedPos({ lat: searchPin.lat, lng: searchPin.lng })
    setClickedPlaceName(searchPin.name)
    setSelectedEntry(null)
    setSheet('form')
    setSearchPin(null)
  }, [searchPin])

  const handlePoiClick = useCallback((lat: number, lng: number, name: string) => {
    setClickedPos({ lat, lng })
    setClickedPlaceName(name)
    setSelectedEntry(null)
    setSheet('form')
  }, [])

  const handleQuickAdd = () => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        setClickedPos({ lat, lng })
        setClickedPlaceName('')
        setSelectedEntry(null)
        setSheet('form')
        reverseGeocode(lat, lng, name => setClickedPlaceName(name))
      },
      () => alert('位置情報を取得できませんでした。')
    )
  }

  const handleLocate = () => {
    navigator.geolocation.getCurrentPosition(
      pos => mapRef.current?.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => alert('位置情報を取得できませんでした。')
    )
  }

  const handleSelectEntry = (entry: Entry) => {
    setSelectedEntry(entry)
    setTab('map')
    setSheet('detail')
  }

  const handleSave = (entry: Entry) => {
    if (sheetRef.current === 'edit') updateEntry(entry)
    else addEntry(entry)
    setSelectedEntry(entry)
    setSheet('detail')
  }

  const handleDelete = () => {
    if (!selectedEntry) return
    if (confirm(`「${selectedEntry.title}」を削除しますか？`)) {
      deleteEntry(selectedEntry.id)
      setSelectedEntry(null)
      setSheet(null)
    }
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `travel-diary-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (imported: Entry[]) => {
    const existingIds = new Set(entries.map(e => e.id))
    const newEntries = imported.filter(e => !existingIds.has(e.id))
    setEntries([...entries, ...newEntries].sort((a, b) => b.date.localeCompare(a.date)))
  }

  const handleClearAll = () => {
    setEntries([])
    setSelectedEntry(null)
    setSheet(null)
  }

  return (
    <div className="flex flex-col h-dvh bg-[#fdf6fb]">
      {/* Map layer (always mounted, hidden when other tab active) */}
      <div className={`absolute inset-0 bottom-[calc(env(safe-area-inset-bottom,0px)+56px)] ${tab !== 'map' ? 'invisible' : ''}`}>
        <MapErrorBoundary>
          <MapView
            entries={entries}
            selectedEntryId={selectedEntry?.id ?? null}
            onSelectEntry={handleSelectEntry}
            onMapClick={handleMapClick}
            onPoiClick={handlePoiClick}
            settings={settings}
            filterTag={filterTag}
            searchQuery=""
            mapRef={mapRef}
            searchPin={searchPin}
            onSearchPinClick={handleSearchPinClick}
            onClearSearchPin={() => setSearchPin(null)}
          />
        </MapErrorBoundary>

        {/* Map overlays — only on map tab */}
        {tab === 'map' && sheet === null && (
          <>
            {/* Title + search */}
            <div
              className="absolute left-0 right-0 z-10 px-4 flex flex-col gap-2"
              style={{ top: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
            >
              <div className="flex justify-center pointer-events-none">
                <div className="bg-white/85 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-sm border border-gray-100/50">
                  <span className="text-sm font-bold text-pink-500">旅日記</span>
                </div>
              </div>
              <div className="pl-14">
                <PlacesSearch onPlaceSelected={handlePlaceSelected} />
              </div>
            </div>

            {/* Search pin hint */}
            {searchPin && (
              <div className="absolute top-28 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                <div className="bg-purple-500 text-white px-4 py-2 rounded-full text-xs shadow-lg">
                  紫のピンをタップして記録を追加
                </div>
              </div>
            )}

            {/* FABs */}
            <div className="absolute bottom-14 right-4 z-10 flex flex-col gap-2">
              <button onClick={handleQuickAdd}
                className="w-12 h-12 bg-gradient-to-br from-pink-400 to-rose-400 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform">
                <PlusCircle size={22} className="text-white" />
              </button>
              <button onClick={handleLocate}
                className="w-12 h-12 bg-white rounded-full shadow-md border border-gray-200 flex items-center justify-center active:scale-95 transition-transform">
                <Navigation2 size={20} className="text-pink-400" />
              </button>
            </div>

            {settings.showHint && !searchPin && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm text-xs text-gray-400 border border-gray-100/50">
                  タップして記録を追加
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Non-map tab content — full screen (not bottom sheet) */}
      {tab !== 'map' && (
        <div className="flex-1 overflow-y-auto bg-[#fdf6fb]" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          {tab === 'list' && (
            <DiaryList entries={entries} filterTag={filterTag}
              onSelectEntry={handleSelectEntry} onFilterTag={setFilterTag}
              onExport={handleExport} settings={settings} />
          )}
          {tab === 'calendar' && (
            <CalendarView entries={entries} onSelectEntry={handleSelectEntry} />
          )}
          {tab === 'tags' && (
            <TagsView entries={entries} filterTag={filterTag}
              onFilterTag={tag => { setFilterTag(tag); setTab('map') }}
              onSelectEntry={handleSelectEntry} />
          )}
          {tab === 'settings' && (
            <SettingsView settings={settings} update={updateSettings}
              entries={entries} onImport={handleImport}
              onExport={handleExport} onClearAll={handleClearAll} />
          )}
        </div>
      )}

      {/* Spacer for nav when on map */}
      {tab === 'map' && <div className="flex-1" />}

      {/* Bottom nav */}
      <BottomNav active={tab} onChange={handleTabChange} entryCount={entries.length} />

      {/* BottomSheet — only for map interactions */}
      <BottomSheet open={sheet !== null} onClose={closeSheet} title={sheet ? SHEET_TITLES[sheet] : ''}>
        {sheet === 'form' && clickedPos && (
          <EntryForm lat={clickedPos.lat} lng={clickedPos.lng}
            defaultPlaceName={clickedPlaceName}
            onSave={handleSave} onCancel={closeSheet} />
        )}
        {sheet === 'detail' && selectedEntry && (
          <EntryDetail entry={selectedEntry}
            onEdit={() => setSheet('edit')}
            onDelete={handleDelete}
            onClose={closeSheet}
            calendarSync={settings.calendarSync} />
        )}
        {sheet === 'edit' && selectedEntry && (
          <EntryForm lat={selectedEntry.lat} lng={selectedEntry.lng}
            onSave={handleSave} onCancel={() => setSheet('detail')}
            initial={selectedEntry} />
        )}
      </BottomSheet>
    </div>
  )
}

export default function App() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string
  return (
    <APIProvider apiKey={apiKey} libraries={['places', 'geocoding']}>
      <AppContent />
    </APIProvider>
  )
}

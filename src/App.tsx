import { useState, useCallback, useRef, useMemo } from 'react'
import { PlusCircle, Plus, MapPin, ChevronRight, BookOpen } from 'lucide-react'
import { ConfirmDialog } from './components/ConfirmDialog'
import { StarRating } from './components/StarRating'
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
import { getCachedGeo } from './utils/geoCache'
import { todayLocalISO } from './utils/localDate'
import type { Entry } from './types'

type Sheet = 'form' | 'detail' | 'edit' | 'poi-history' | null

const SHEET_TITLES: Record<NonNullable<Sheet>, string> = {
  form: '新しい記録', edit: '記録を編集', detail: '', 'poi-history': '過去の記録',
}

/** Check if two coordinates are within ~33m of each other (same building/restaurant) */
const NEARBY_THRESHOLD = 0.0003
function findNearbyEntries(entries: Entry[], lat: number, lng: number): Entry[] {
  return entries.filter(e =>
    !e.wantToVisit &&
    Math.abs(e.lat - lat) < NEARBY_THRESHOLD &&
    Math.abs(e.lng - lng) < NEARBY_THRESHOLD
  )
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
  const [poiHistoryEntries, setPoiHistoryEntries] = useState<Entry[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)

  const mapRef = useRef<ReturnType<typeof useMap> | null>(null)
  const sheetRef = useRef<Sheet>(null)
  sheetRef.current = sheet

  const geocodingLib = useMapsLibrary('geocoding')
  const geocoder = useMemo(() => geocodingLib ? new geocodingLib.Geocoder() : null, [geocodingLib])

  const geocodeGenRef = useRef(0)
  const reverseGeocode = useCallback((lat: number, lng: number, cb: (name: string) => void) => {
    if (!geocoder) return
    // M-1: callers can't unsubscribe, so use a generation counter — only the
    // latest request's result is applied. Otherwise a slow earlier lookup can
    // overwrite a newer place name (last-wins not guaranteed by the API).
    const gen = ++geocodeGenRef.current
    geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
      if (gen !== geocodeGenRef.current) return  // a newer request superseded this one
      if (status === 'OK' && results?.[0]) {
        const comps = results[0].address_components as any[]
        const find = (...types: string[]) => comps?.find((c: any) => types.some(t => c.types.includes(t)))?.long_name || ''
        const locality = find('sublocality_level_2') || find('sublocality_level_1') || find('locality')
        const subloc = find('premise') || find('route')
        const name = subloc ? `${locality} ${subloc}`.trim() : locality
        if (name) cb(name)  // M-3: don't wipe an existing name with an empty result
      }
    })
  }, [geocoder])

  const closeSheet = useCallback(() => {
    if (sheetRef.current === 'edit') { setSheet('detail'); return }
    setSheet(null)
    setSelectedEntry(null)
    setSearchPin(null)  // Clear search pin when closing sheet
  }, [])

  const handleTabChange = (t: Tab) => {
    setSheet(null)
    setSelectedEntry(null)
    setTab(t)
  }

  /** Open form or history sheet, depending on whether there are nearby diary entries */
  const openFormOrHistory = useCallback((lat: number, lng: number, name: string) => {
    setClickedPos({ lat, lng })
    setClickedPlaceName(name)
    setSelectedEntry(null)
    // Use functional setState to guarantee latest entries value
    setSheet(() => {
      // At this point, entries should be the latest (captured before state batch)
      const nearby = findNearbyEntries(entries, lat, lng)
      if (nearby.length > 0) {
        setPoiHistoryEntries(nearby)
        return 'poi-history'
      } else {
        return 'form'
      }
    })
  }, [entries])

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (sheetRef.current !== null) return
    setSearchPin(null)
    // Immediately open with empty name, then update via reverse geocode
    openFormOrHistory(lat, lng, '')
    reverseGeocode(lat, lng, name => setClickedPlaceName(name))
  }, [reverseGeocode, openFormOrHistory])

  const handlePlaceSelected = useCallback((lat: number, lng: number, name: string) => {
    setSearchPin({ lat, lng, name })
    mapRef.current?.panTo({ lat, lng })
    mapRef.current?.setZoom(16)
  }, [])

  const handleSearchPinClick = useCallback(() => {
    if (!searchPin) return
    // Search pin click also checks for existing history
    openFormOrHistory(searchPin.lat, searchPin.lng, searchPin.name)
    setSearchPin(null)
  }, [searchPin, openFormOrHistory])

  const handlePoiClick = useCallback((lat: number, lng: number, name: string) => {
    openFormOrHistory(lat, lng, name)
  }, [openFormOrHistory])

  const handleQuickAdd = () => {
    // Bug fix: open form IMMEDIATELY with cached/default position
    // Don't wait for GPS — that blocks the form from appearing
    const cached = getCachedGeo()
    let pos: { lat: number; lng: number }

    if (cached) {
      pos = cached
    } else if (settings.useDefaultLocation) {
      pos = { lat: settings.defaultLat, lng: settings.defaultLng }
    } else {
      // When default location is disabled and no cache, try to get current location
      pos = { lat: 35.6762, lng: 139.6503 } // fallback to Tokyo
    }

    setClickedPos(pos)
    setClickedPlaceName('')
    setSelectedEntry(null)
    setSheet('form')
    if (cached) {
      reverseGeocode(cached.lat, cached.lng, name => setClickedPlaceName(name))
    }
  }

  const handleSelectEntry = (entry: Entry) => {
    setSelectedEntry(entry)
    setSheet('detail')
  }

  /** Select entry AND fly to it on the map */
  const handleSelectEntryFlyTo = (entry: Entry) => {
    setSelectedEntry(entry)
    setSheet('detail')
    setTab('map')
    setTimeout(() => mapRef.current?.panTo({ lat: entry.lat, lng: entry.lng }), 100)
  }

  const openNewEntry = (_date?: string) => {
    let initialPos: { lat: number; lng: number }

    if (settings.useDefaultLocation) {
      initialPos = { lat: settings.defaultLat, lng: settings.defaultLng }
    } else {
      initialPos = { lat: 35.6762, lng: 139.6503 } // fallback to Tokyo
    }

    setClickedPos(initialPos)
    setClickedPlaceName('')
    setSelectedEntry(null)
    setSheet('form')
    // Use only cached position — don't trigger GPS permission popup
    // (user can get GPS via the locate button in the map)
    const cached = getCachedGeo()
    if (cached) {
      setClickedPos({ lat: cached.lat, lng: cached.lng })
      reverseGeocode(cached.lat, cached.lng, name => setClickedPlaceName(name))
    }
  }

  /** Convert a 行きたい entry into a visited diary entry, then open edit to fill it in */
  const handleMarkVisited = (entry: Entry) => {
    const updated: Entry = { ...entry, wantToVisit: false, date: todayLocalISO() }
    updateEntry(updated)
    setSelectedEntry(updated)
    setSheet('edit')
  }

  const handleSave = (entry: Entry) => {
    if (sheetRef.current === 'edit') updateEntry(entry)
    else addEntry(entry)
    setSelectedEntry(entry)
    setSheet('detail')
  }

  const handleDelete = () => {
    if (!selectedEntry) return
    setConfirmDelete(true)  // Open custom confirm dialog (instead of native confirm())
  }

  const handleDeleteConfirmed = () => {
    if (!selectedEntry) return
    deleteEntry(selectedEntry.id)
    setSelectedEntry(null)
    setSheet(null)
    setConfirmDelete(false)
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `travel-diary-${todayLocalISO()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (imported: Entry[]) => {
    const existingIds = new Set(entries.map(e => e.id))
    // Normalize: older/foreign exports may lack optional fields — missing
    // placeName/tags would crash search and list rendering later
    const newEntries = imported
      .filter(e => !existingIds.has(e.id) && Number.isFinite(e.lat) && Number.isFinite(e.lng))
      .map(e => ({
        ...e,
        placeName: typeof e.placeName === 'string' ? e.placeName : '',
        tags: Array.isArray(e.tags) ? e.tags.filter((t): t is string => typeof t === 'string') : [],
        photos: Array.isArray(e.photos) ? e.photos.filter((p): p is string => typeof p === 'string') : [],
        createdAt: typeof e.createdAt === 'string' ? e.createdAt : new Date().toISOString(),
        rating: typeof e.rating === 'number' && Number.isFinite(e.rating) ? e.rating : undefined,
        wantToVisit: e.wantToVisit === true,
        revisit: typeof e.revisit === 'number' && Number.isFinite(e.revisit) ? e.revisit : undefined,
      }))
    setEntries([...entries, ...newEntries].sort((a, b) => b.date.localeCompare(a.date)))
  }

  /** Rename a tag across all saved entries (keeps entry tags in sync with the global tag list) */
  const handleRenameTag = (oldName: string, newName: string) => {
    setEntries(prev => prev.map(e =>
      e.tags.includes(oldName)
        ? { ...e, tags: Array.from(new Set(e.tags.map(t => (t === oldName ? newName : t)))) }
        : e
    ))
  }

  const handleClearAll = () => {
    setEntries([])
    setSelectedEntry(null)
    setSheet(null)
    setTab('map')
  }

  const sheetTitle = sheet ? SHEET_TITLES[sheet] : ''
  const TAB_TITLES: Partial<Record<Tab, string>> = {
    list: '日記', calendar: '日程', tags: 'タグ', settings: '設定',
  }

  return (
    // position:relative is CRITICAL — without it, the absolute map layer positions
    // relative to the viewport (not this container), causing a large gap.
    <div className="relative flex flex-col h-full bg-[#fdf6fb]">
      {/* Map layer — always mounted, invisible when non-map tab */}
      <div
        className={`absolute inset-0 ${tab !== 'map' ? 'invisible' : ''}`}
        style={{ bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 100vh - 100svh - 11px, 8px) + 66px)' }}
      >
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
            sheetOpen={sheet !== null}
          />
        </MapErrorBoundary>

        {/* Map overlays — only when map tab & no sheet */}
        {tab === 'map' && sheet === null && (
          <>
            <div
              className="absolute z-10"
              style={{ top: 'calc(max(env(safe-area-inset-top, 0px), 44px) + 12px)', left: 16, right: 16 }}
            >
              <PlacesSearch onPlaceSelected={handlePlaceSelected} mapRef={mapRef} />
            </div>

            {searchPin && (
              <div className="absolute z-10 pointer-events-none" style={{ top: 'calc(max(env(safe-area-inset-top, 0px), 44px) + 60px)', left: '50%', transform: 'translateX(-50%)' }}>
                <div className="bg-purple-500 text-white px-4 py-2 rounded-full text-xs shadow-lg whitespace-nowrap">
                  紫のピンをタップして記録を追加
                </div>
              </div>
            )}

            {/* Quick-add FAB (locate is now inside MapView controls) */}
            <div className="absolute bottom-14 right-4 z-10">
              <button onClick={handleQuickAdd}
                className="w-12 h-12 bg-gradient-to-br from-pink-400 to-rose-400 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform">
                <PlusCircle size={22} className="text-white" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Non-map tab content — full screen, padded so content clears the fixed nav */}
      {tab !== 'map' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#fdf6fb]">
          <div
            className="flex-shrink-0 bg-white border-b border-gray-100 px-4 pb-3 flex items-end justify-between"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
          >
            <h1 className="text-lg font-bold text-gray-800">{TAB_TITLES[tab]}</h1>
            {tab === 'calendar' && (
              <button onClick={() => openNewEntry()}
                className="w-8 h-8 rounded-full bg-pink-400 flex items-center justify-center shadow-sm">
                <Plus size={18} className="text-white" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto" style={{ overflowX: 'hidden', scrollbarGutter: 'stable' }}>
            {tab === 'list' && (
              <DiaryList entries={entries} filterTag={filterTag}
                onSelectEntry={handleSelectEntry} onFilterTag={setFilterTag}
                onExport={handleExport} settings={settings}
                onUpdateSettings={patch => updateSettings(patch)} />
            )}
            {tab === 'calendar' && (
              <CalendarView entries={entries} onSelectEntry={handleSelectEntry} />
            )}
            {tab === 'tags' && (
              <TagsView
                entries={entries}
                filterTag={filterTag}
                onFilterTag={setFilterTag}
                onSelectEntry={handleSelectEntry}
                tagColors={settings.tagColors}
                onUpdateTagColors={colors => updateSettings({ tagColors: colors })}
                onRenameTag={handleRenameTag}
              />
            )}
            {tab === 'settings' && (
              <SettingsView settings={settings} update={updateSettings}
                entries={entries} onImport={handleImport}
                onExport={handleExport} onClearAll={handleClearAll} />
            )}
          </div>
        </div>
      )}

      {/* Flex spacer for map tab (non-map tabs use flex-1 content div) */}
      {tab === 'map' && <div className="flex-1" />}

      <BottomNav active={tab} onChange={handleTabChange} entryCount={entries.length} />

      <BottomSheet open={sheet !== null} onClose={closeSheet} title={sheetTitle}>
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
            onFlyTo={(lat, lng) => {
              setTab('map')
              setTimeout(() => mapRef.current?.panTo({ lat, lng }), 100)
            }}
            onMarkVisited={handleMarkVisited} />
        )}
        {sheet === 'edit' && selectedEntry && (
          <EntryForm lat={selectedEntry.lat} lng={selectedEntry.lng}
            onSave={handleSave} onCancel={() => setSheet('detail')}
            initial={selectedEntry} />
        )}
        {/* POI History — shown immediately when tapping a place with existing diary entries */}
        {sheet === 'poi-history' && clickedPos && (
          <div className="px-4 pt-3 pb-8">
            {/* Place header */}
            <div className="flex items-start gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin size={15} className="text-pink-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-base leading-tight truncate">
                  {clickedPlaceName || '選択した場所'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {poiHistoryEntries.length}回訪問済み
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2 my-3">
              <BookOpen size={11} className="text-gray-300" />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">過去の記録</p>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Entry list */}
            <div className="flex flex-col gap-2 mb-4">
              {[...poiHistoryEntries]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map(entry => (
                <button
                  key={entry.id}
                  onClick={() => handleSelectEntryFlyTo(entry)}
                  className="text-left bg-white rounded-2xl shadow-sm border border-pink-100 p-3 flex items-center gap-3 active:scale-[0.98] transition-transform"
                >
                  {entry.photos.length > 0
                    ? <img src={entry.photos[0]} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    : <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                        <MapPin size={20} className="text-pink-400" />
                      </div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate leading-snug">{entry.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{entry.date}</p>
                    {(entry.rating ?? 0) > 0 && (
                      <div className="mt-1">
                        <StarRating value={entry.rating!} readonly size={12} />
                      </div>
                    )}
                    {entry.tags.length > 0 && (
                      <p className="text-xs text-purple-400 mt-0.5 truncate">
                        {entry.tags.map(t => `#${t}`).join(' ')}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                </button>
              ))}
            </div>

            {/* New entry button */}
            <button
              onClick={() => setSheet('form')}
              className="w-full py-3.5 bg-gradient-to-r from-pink-400 to-rose-400 text-white rounded-2xl font-semibold shadow-md flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <PlusCircle size={18} /> 新しく記録する
            </button>
          </div>
        )}
      </BottomSheet>

      {/* iOS-friendly delete confirmation (replaces native confirm()) */}
      <ConfirmDialog
        open={confirmDelete}
        message={`「${selectedEntry?.title || '記録'}」を削除しますか？\nこの操作は取り消せません。`}
        confirmLabel="削除"
        cancelLabel="キャンセル"
        danger
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDelete(false)}
      />
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

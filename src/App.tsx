import { useState, useCallback, useRef } from 'react'
import { Search, X, PlusCircle } from 'lucide-react'
import { MapView } from './components/MapView'
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

type SheetContent = 'list' | 'tags' | 'calendar' | 'form' | 'detail' | 'edit' | 'settings' | null

const SHEET_TITLES: Partial<Record<NonNullable<SheetContent>, string>> = {
  form:     '新しい記録',
  edit:     '記録を編集',
  list:     '日記',
  calendar: '日程',
  tags:     'タグ',
  settings: '設定',
}

export default function App() {
  const { entries, addEntry, updateEntry, deleteEntry, setEntries } = useEntries()
  const { settings, update: updateSettings } = useSettings()

  const [tab, setTab] = useState<Tab>('map')
  const [sheet, setSheet] = useState<SheetContent>(null)
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [clickedPos, setClickedPos] = useState<{ lat: number; lng: number } | null>(null)
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [mapSearch, setMapSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Use ref to read latest sheet value in useCallback without re-creating it
  const sheetRef = useRef<SheetContent>(null)
  sheetRef.current = sheet

  // Bug fix #1 & #2: edit→detail, others→map; clear selectedEntry on full close
  const closeSheet = useCallback(() => {
    if (sheetRef.current === 'edit') {
      setSheet('detail')
      return
    }
    setSheet(null)
    setTab('map')
    setSelectedEntry(null)  // Bug fix #1: clear selection so pin returns to normal
  }, [])

  const handleTabChange = (t: Tab) => {
    if (t === 'map') { closeSheet(); return }
    if (tab === t && sheet !== null) { closeSheet(); return }
    setTab(t)
    setSheet(t as SheetContent)
  }

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setClickedPos({ lat, lng })
    setSelectedEntry(null)
    setTab('map')
    setSheet('form')
  }, [])

  const handleQuickAdd = () => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        setClickedPos({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setSelectedEntry(null)
        setTab('map')
        setSheet('form')
      },
      () => alert('位置情報を取得できませんでした。設定で位置情報を許可してください。')
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
      setTab('map')
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
    setTab('map')
  }

  const cancelMapSearch = () => {
    setMapSearch('')
    setFilterTag(null)
    setSearchFocused(false)
    searchRef.current?.blur()
  }

  const hasMapFilter = !!filterTag || !!mapSearch
  const sheetTitle = sheet ? (SHEET_TITLES[sheet] ?? '') : ''

  return (
    <div className="flex flex-col h-dvh bg-[#fdf6fb]">
      <div className="flex-1 relative overflow-hidden">
        <MapView
          entries={entries}
          selectedEntryId={selectedEntry?.id ?? null}
          onSelectEntry={handleSelectEntry}
          onMapClick={handleMapClick}
          settings={settings}
          filterTag={filterTag}
          searchQuery={mapSearch}
        />

        {/* Title pill */}
        {!searchFocused && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none safe-top">
            <div className="bg-white/85 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-sm border border-gray-100/50">
              <span className="text-sm font-bold text-pink-500">旅日記</span>
            </div>
          </div>
        )}

        {/* Bug fix #4: search bar with left margin to avoid zoom controls */}
        {sheet === null && (
          <div
            className="absolute z-10 flex items-center gap-2 safe-top"
            style={{ top: searchFocused ? 12 : 48, left: searchFocused ? 16 : 60, right: 16, transition: 'all 0.2s' }}
          >
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                ref={searchRef}
                value={mapSearch}
                onChange={e => setMapSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => { if (!mapSearch) setSearchFocused(false) }}
                placeholder="マップを絞り込み..."
                className="w-full bg-white/92 backdrop-blur-sm border border-gray-200/70 rounded-2xl pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 shadow-sm"
              />
              {mapSearch && (
                <button onClick={() => setMapSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <X size={14} />
                </button>
              )}
            </div>
            {(searchFocused || hasMapFilter) && (
              <button
                onClick={cancelMapSearch}
                className="bg-white/92 backdrop-blur-sm border border-gray-200/70 text-pink-500 text-sm font-medium px-3 py-2 rounded-2xl shadow-sm whitespace-nowrap"
              >
                キャンセル
              </button>
            )}
          </div>
        )}

        {/* Bug fix #3: Quick add FAB — different icon (PlusCircle) from geolocate */}
        {sheet === null && !searchFocused && (
          <button
            onClick={handleQuickAdd}
            className="absolute bottom-16 right-4 z-10 w-12 h-12 bg-gradient-to-br from-pink-400 to-rose-400 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
            title="現在地に記録を追加"
          >
            <PlusCircle size={22} className="text-white" />
          </button>
        )}

        {settings.showHint && sheet === null && !searchFocused && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm text-xs text-gray-400 border border-gray-100/50">
              タップして記録を追加
            </div>
          </div>
        )}
      </div>

      <BottomNav active={tab} onChange={handleTabChange} entryCount={entries.length} />

      <BottomSheet open={sheet !== null} onClose={closeSheet} title={sheetTitle}>
        {sheet === 'list' && (
          <DiaryList entries={entries} filterTag={filterTag}
            onSelectEntry={handleSelectEntry} onFilterTag={setFilterTag}
            onExport={handleExport} settings={settings} />
        )}
        {sheet === 'calendar' && (
          <CalendarView entries={entries} onSelectEntry={handleSelectEntry} />
        )}
        {sheet === 'tags' && (
          <TagsView entries={entries} filterTag={filterTag}
            onFilterTag={setFilterTag} onSelectEntry={handleSelectEntry} />
        )}
        {sheet === 'form' && clickedPos && (
          <EntryForm lat={clickedPos.lat} lng={clickedPos.lng}
            onSave={handleSave} onCancel={closeSheet} />
        )}
        {sheet === 'detail' && selectedEntry && (
          <EntryDetail entry={selectedEntry}
            onEdit={() => setSheet('edit')}
            onDelete={handleDelete}
            onClose={closeSheet} />
        )}
        {sheet === 'edit' && selectedEntry && (
          <EntryForm lat={selectedEntry.lat} lng={selectedEntry.lng}
            onSave={handleSave} onCancel={() => setSheet('detail')}
            initial={selectedEntry} />
        )}
        {sheet === 'settings' && (
          <SettingsView settings={settings} update={updateSettings}
            entries={entries} onImport={handleImport}
            onExport={handleExport} onClearAll={handleClearAll} />
        )}
      </BottomSheet>
    </div>
  )
}

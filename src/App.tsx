import { useState, useCallback } from 'react'
import { Map } from 'lucide-react'
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

export default function App() {
  const { entries, addEntry, updateEntry, deleteEntry, setEntries } = useEntries()
  const { settings, update: updateSettings } = useSettings()

  const [tab, setTab] = useState<Tab>('map')
  const [sheet, setSheet] = useState<SheetContent>(null)
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [clickedPos, setClickedPos] = useState<{ lat: number; lng: number } | null>(null)
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [mapSearch, setMapSearch] = useState('')

  // Bug fix: sync tab when sheet closes
  const closeSheet = useCallback(() => {
    setSheet(null)
    setTab('map')
  }, [])

  const handleTabChange = (t: Tab) => {
    setTab(t)
    if (t === 'map') { setSheet(null); return }
    setSheet(t as SheetContent)
  }

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setClickedPos({ lat, lng })
    setSelectedEntry(null)
    setSheet('form')
  }, [])

  const handleSelectEntry = (entry: Entry) => {
    setSelectedEntry(entry)
    setSheet('detail')
    setTab('map')
  }

  const handleSave = (entry: Entry) => {
    if (sheet === 'edit') updateEntry(entry)
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
    // Bug fix: sort by date after import
    setEntries([...entries, ...newEntries].sort((a, b) => b.date.localeCompare(a.date)))
  }

  const handleClearAll = () => {
    setEntries([])
    setSelectedEntry(null)
    setSheet(null)
    setTab('map')
  }

  const hasMapFilter = !!filterTag || !!mapSearch

  return (
    <div className="flex flex-col h-dvh bg-[#fdf6fb]">
      {/* Map */}
      <div className="flex-1 relative">
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
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none safe-top">
          <div className="bg-white/85 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-sm border border-gray-100/50">
            <span className="text-sm font-bold text-pink-500">旅日記</span>
          </div>
        </div>

        {/* Map filter bar */}
        {sheet === null && (
          <div className="absolute top-12 left-4 right-4 z-10 flex gap-2 safe-top" style={{ marginTop: 8 }}>
            <div className="flex-1 relative">
              <input
                value={mapSearch}
                onChange={e => setMapSearch(e.target.value)}
                placeholder="マップ上を絞り込み..."
                className="w-full bg-white/90 backdrop-blur-sm border border-gray-100 rounded-2xl pl-3 pr-8 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-pink-200 shadow-sm"
              />
              {mapSearch && (
                <button onClick={() => setMapSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300">
                  <Map size={13} />
                </button>
              )}
            </div>
            {hasMapFilter && (
              <button onClick={() => { setFilterTag(null); setMapSearch('') }}
                className="bg-pink-400 text-white text-xs px-3 rounded-2xl shadow-sm whitespace-nowrap">
                解除
              </button>
            )}
          </div>
        )}

        {/* Hint */}
        {settings.showHint && sheet === null && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm text-xs text-gray-400 border border-gray-100/50">
              タップして記録を追加
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <BottomNav active={tab} onChange={handleTabChange} entryCount={entries.length} />

      {/* Bottom sheet */}
      <BottomSheet open={sheet !== null} onClose={closeSheet} snapFull={sheet !== null}>
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
            onEdit={() => setSheet('edit')} onDelete={handleDelete} onClose={closeSheet} />
        )}
        {sheet === 'edit' && selectedEntry && (
          <EntryForm lat={selectedEntry.lat} lng={selectedEntry.lng}
            onSave={handleSave} onCancel={() => setSheet('detail')} initial={selectedEntry} />
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

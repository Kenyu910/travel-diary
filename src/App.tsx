import { useState, useCallback } from 'react'
import { MapView } from './components/MapView'
import { BottomSheet } from './components/BottomSheet'
import { BottomNav } from './components/BottomNav'
import type { Tab } from './components/BottomNav'
import { DiaryList } from './components/DiaryList'
import { TagsView } from './components/TagsView'
import { EntryForm } from './components/EntryForm'
import { EntryDetail } from './components/EntryDetail'
import { SettingsView } from './components/SettingsView'
import { useEntries } from './store'
import { useSettings } from './settings'
import type { Entry } from './types'

type SheetContent = 'list' | 'tags' | 'form' | 'detail' | 'edit' | 'settings' | null

export default function App() {
  const { entries, addEntry, updateEntry, deleteEntry, setEntries } = useEntries()
  const { settings, update: updateSettings } = useSettings()
  const [tab, setTab] = useState<Tab>('map')
  const [sheet, setSheet] = useState<SheetContent>(null)
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [clickedPos, setClickedPos] = useState<{ lat: number; lng: number } | null>(null)
  const [filterTag, setFilterTag] = useState<string | null>(null)

  const closeSheet = useCallback(() => setSheet(null), [])

  const handleTabChange = (t: Tab) => {
    setTab(t)
    if (t === 'list') setSheet('list')
    else if (t === 'tags') setSheet('tags')
    else if (t === 'settings') setSheet('settings')
    else setSheet(null)
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
    setEntries([...entries, ...newEntries])
  }

  const handleClearAll = () => {
    setEntries([])
    setSelectedEntry(null)
    setSheet(null)
  }

  const sheetOpen = sheet !== null

  return (
    <div className="flex flex-col h-dvh bg-[#fdf6fb]">
      {/* Map — full screen */}
      <div className="flex-1 relative">
        <MapView
          entries={entries}
          selectedEntryId={selectedEntry?.id ?? null}
          onSelectEntry={handleSelectEntry}
          onMapClick={handleMapClick}
          settings={settings}
        />

        {/* App title */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none safe-top">
          <div className="bg-white/80 backdrop-blur px-4 py-1.5 rounded-full shadow-sm">
            <span className="text-sm font-bold text-pink-400">🗺️ 旅日記</span>
          </div>
        </div>

        {/* Hint */}
        {settings.showHint && sheet === null && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm text-xs text-gray-400">
              タップして記録を追加 ✨
            </div>
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <BottomNav active={tab} onChange={handleTabChange} entryCount={entries.length} />

      {/* Bottom sheet */}
      <BottomSheet open={sheetOpen} onClose={closeSheet} snapFull={sheet !== null}>
        {sheet === 'list' && (
          <DiaryList
            entries={entries}
            filterTag={filterTag}
            onSelectEntry={handleSelectEntry}
            onFilterTag={setFilterTag}
            onExport={handleExport}
            settings={settings}
          />
        )}
        {sheet === 'tags' && (
          <TagsView
            entries={entries}
            filterTag={filterTag}
            onFilterTag={setFilterTag}
            onSelectEntry={handleSelectEntry}
          />
        )}
        {sheet === 'form' && clickedPos && (
          <EntryForm
            lat={clickedPos.lat}
            lng={clickedPos.lng}
            onSave={handleSave}
            onCancel={closeSheet}
          />
        )}
        {sheet === 'detail' && selectedEntry && (
          <EntryDetail
            entry={selectedEntry}
            onEdit={() => setSheet('edit')}
            onDelete={handleDelete}
            onClose={closeSheet}
          />
        )}
        {sheet === 'edit' && selectedEntry && (
          <EntryForm
            lat={selectedEntry.lat}
            lng={selectedEntry.lng}
            onSave={handleSave}
            onCancel={() => setSheet('detail')}
            initial={selectedEntry}
          />
        )}
        {sheet === 'settings' && (
          <SettingsView
            settings={settings}
            update={updateSettings}
            entries={entries}
            onImport={handleImport}
            onExport={handleExport}
            onClearAll={handleClearAll}
          />
        )}
      </BottomSheet>
    </div>
  )
}

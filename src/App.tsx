import { useState, useCallback, useEffect } from 'react'
import { MapView } from './components/MapView'
import { Sidebar } from './components/Sidebar'
import { EntryForm } from './components/EntryForm'
import { EntryDetail } from './components/EntryDetail'
import { useEntries } from './store'
import type { Entry } from './types'

type Panel = 'list' | 'form' | 'detail' | 'edit'

export default function App() {
  const { entries, addEntry, updateEntry, deleteEntry } = useEntries()
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [panel, setPanel] = useState<Panel>('list')
  const [clickedPos, setClickedPos] = useState<{ lat: number; lng: number } | null>(null)
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Esc key closes form/detail back to list
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (panel === 'form' || panel === 'detail') setPanel('list')
        if (panel === 'edit') setPanel('detail')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [panel])

  // useCallback to stabilize reference for MapClickHandler
  const handleMapClick = useCallback((lat: number, lng: number) => {
    setClickedPos({ lat, lng })
    setSelectedEntry(null)
    setPanel('form')
    setSidebarOpen(true)
  }, [])

  const handleSelectEntry = (entry: Entry) => {
    setSelectedEntry(entry)
    setPanel('detail')
    setSidebarOpen(true)
  }

  const handleSave = (entry: Entry) => {
    if (panel === 'edit') {
      updateEntry(entry)
    } else {
      addEntry(entry)
    }
    setSelectedEntry(entry)
    setPanel('detail')
  }

  const handleDelete = () => {
    if (!selectedEntry) return
    if (confirm(`「${selectedEntry.title}」を削除しますか？`)) {
      deleteEntry(selectedEntry.id)
      setSelectedEntry(null)
      setPanel('list')
    }
  }

  const handleFilterTag = (tag: string | null) => {
    setFilterTag(tag)
    setSelectedEntry(null)
    setPanel('list')
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

  return (
    <div className="flex flex-col h-dvh">
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🗺️</span>
          <h1 className="text-base font-semibold text-gray-800">Travel Diary</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{entries.length} 件の記録</span>
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
          >
            {sidebarOpen ? 'リストを隠す' : 'リストを表示'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <MapView
            entries={entries}
            selectedEntryId={selectedEntry?.id ?? null}
            onSelectEntry={handleSelectEntry}
            onMapClick={handleMapClick}
          />
          {panel !== 'form' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full text-xs text-gray-500 shadow pointer-events-none">
              クリックして記録を追加
            </div>
          )}
        </div>

        {sidebarOpen && (
          <div className="w-80 border-l border-gray-200 flex flex-col overflow-hidden">
            {panel === 'list' && (
              <Sidebar
                entries={entries}
                selectedEntry={selectedEntry}
                filterTag={filterTag}
                onSelectEntry={handleSelectEntry}
                onFilterTag={handleFilterTag}
                onExport={handleExport}
              />
            )}
            {panel === 'form' && clickedPos && (
              <EntryForm
                lat={clickedPos.lat}
                lng={clickedPos.lng}
                onSave={handleSave}
                onCancel={() => setPanel('list')}
              />
            )}
            {panel === 'detail' && selectedEntry && (
              <EntryDetail
                entry={selectedEntry}
                onEdit={() => setPanel('edit')}
                onDelete={handleDelete}
                onClose={() => setPanel('list')}
              />
            )}
            {panel === 'edit' && selectedEntry && (
              <EntryForm
                lat={selectedEntry.lat}
                lng={selectedEntry.lng}
                onSave={handleSave}
                onCancel={() => setPanel('detail')}
                initial={selectedEntry}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Search, X, Upload, LayoutGrid, List, Clock, CalendarDays, MapPin, ChevronRight } from 'lucide-react'
import type { Entry } from '../types'
import type { AppSettings } from '../settings'

type Props = {
  entries: Entry[]
  filterTag: string | null
  onSelectEntry: (entry: Entry) => void
  onFilterTag: (tag: string | null) => void
  onExport: () => void
  settings: AppSettings
}

export function DiaryList({ entries, filterTag, onSelectEntry, onFilterTag, onExport, settings }: Props) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState(settings.defaultSort)
  const [listStyle, setListStyle] = useState(settings.listStyle)

  const allTags = Array.from(new Set(entries.flatMap(e => e.tags))).sort()

  const filtered = entries
    .filter(e => !filterTag || e.tags.includes(filterTag))
    .filter(e => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        e.title.toLowerCase().includes(q) ||
        e.body.toLowerCase().includes(q) ||
        e.placeName.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q))
      )
    })
    .sort((a, b) => sort === 'newest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date))

  return (
    <div className="flex flex-col pb-4">
      {/* Header */}
      <div className="px-4 pt-3 pb-3 border-b border-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-xl overflow-hidden">
              <button onClick={() => setListStyle('card')}
                className={`p-2 transition-colors ${listStyle === 'card' ? 'bg-white shadow-sm text-pink-500' : 'text-gray-400'}`}>
                <LayoutGrid size={15} />
              </button>
              <button onClick={() => setListStyle('compact')}
                className={`p-2 transition-colors ${listStyle === 'compact' ? 'bg-white shadow-sm text-pink-500' : 'text-gray-400'}`}>
                <List size={15} />
              </button>
            </div>
            <button onClick={onExport} className="flex items-center gap-1.5 text-xs text-pink-400 px-3 py-1.5 rounded-full border border-pink-200 bg-pink-50">
              <Upload size={12} /> 書き出し
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-2.5">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="タイトル・場所・タグで検索..."
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-8 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="flex gap-2">
          <button onClick={() => setSort('newest')}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors ${sort === 'newest' ? 'bg-pink-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
            <Clock size={11} /> 新しい順
          </button>
          <button onClick={() => setSort('oldest')}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors ${sort === 'oldest' ? 'bg-pink-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
            <CalendarDays size={11} /> 古い順
          </button>
        </div>
      </div>

      {/* Tags filter */}
      {allTags.length > 0 && (
        <div className="px-4 py-2.5 flex flex-wrap gap-1.5 border-b border-gray-50">
          {allTags.map(tag => (
            <button key={tag} onClick={() => onFilterTag(filterTag === tag ? null : tag)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filterTag === tag ? 'bg-purple-400 text-white border-purple-400' : 'bg-white text-purple-500 border-purple-200'
              }`}>
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Entries */}
      <div className={listStyle === 'card' ? 'px-4 py-3 flex flex-col gap-3' : 'px-4 py-1'}>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-300">
            <MapPin size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{search || filterTag ? '該当する記録がありません' : 'マップをタップして最初の記録を追加！'}</p>
          </div>
        ) : listStyle === 'card' ? (
          filtered.map(entry => (
            <button key={entry.id} onClick={() => onSelectEntry(entry)}
              className="text-left bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden active:scale-[0.98] transition-transform">
              {entry.photos.length > 0 && <img src={entry.photos[0]} className="w-full h-36 object-cover" />}
              <div className="p-3.5">
                {/* Store/place name prominently if exists */}
                {entry.placeName && (
                  <div className="flex items-center gap-1 mb-1">
                    <MapPin size={11} className="text-pink-400 flex-shrink-0" />
                    <p className="text-xs font-semibold text-pink-500 truncate">{entry.placeName}</p>
                  </div>
                )}
                <p className="font-semibold text-gray-800 text-sm">{entry.title}</p>
                <span className="flex items-center gap-1 text-xs text-gray-400 mt-0.5"><CalendarDays size={10} />{entry.date}</span>
                {entry.body && <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">{entry.body}</p>}
                {entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {entry.tags.map(tag => (
                      <span key={tag} className="text-[11px] bg-purple-50 text-purple-400 px-2 py-0.5 rounded-full">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </button>
          ))
        ) : (
          filtered.map((entry, i) => (
            <button key={entry.id} onClick={() => onSelectEntry(entry)}
              className={`w-full text-left flex items-center gap-3 py-3 ${i < filtered.length - 1 ? 'border-b border-gray-100' : ''}`}>
              {entry.photos.length > 0
                ? <img src={entry.photos[0]} className="w-11 h-11 object-cover rounded-xl flex-shrink-0" />
                : <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                    <MapPin size={16} className="text-pink-400" />
                  </div>
              }
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-800 truncate">{entry.title}</p>
                <p className="text-xs text-gray-400 truncate">{entry.date}{entry.placeName && ` · ${entry.placeName}`}</p>
                {entry.tags.length > 0 && <p className="text-xs text-purple-400 truncate">{entry.tags.map(t => `#${t}`).join(' ')}</p>}
              </div>
              <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
            </button>
          ))
        )}
      </div>

      <p className="text-center text-xs text-gray-300 mt-2">{filtered.length} / {entries.length} 件</p>
    </div>
  )
}

import { useState } from 'react'
import type { Entry } from '../types'

type SortOrder = 'newest' | 'oldest'

type Props = {
  entries: Entry[]
  selectedEntry: Entry | null
  filterTag: string | null
  onSelectEntry: (entry: Entry) => void
  onFilterTag: (tag: string | null) => void
  onExport: () => void
}

export function Sidebar({ entries, selectedEntry, filterTag, onSelectEntry, onFilterTag, onExport }: Props) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOrder>('newest')

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
    .sort((a, b) =>
      sort === 'newest'
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date)
    )

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Search */}
      <div className="p-3 border-b border-gray-100 flex gap-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="検索..."
          className="flex-1 text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <select
          value={sort}
          onChange={e => setSort(e.target.value as SortOrder)}
          className="text-xs border border-gray-200 rounded px-1.5 py-1.5 focus:outline-none text-gray-600"
        >
          <option value="newest">新しい順</option>
          <option value="oldest">古い順</option>
        </select>
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="p-3 border-b border-gray-100">
          <div className="flex flex-wrap gap-1">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => onFilterTag(filterTag === tag ? null : tag)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                  filterTag === tag
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">
            {search || filterTag ? '該当する記録がありません' : 'マップをクリックして記録を追加'}
          </div>
        ) : (
          filtered.map(entry => (
            <button
              key={entry.id}
              onClick={() => onSelectEntry(entry)}
              className={`w-full text-left p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                selectedEntry?.id === entry.id ? 'bg-blue-50 border-l-2 border-l-blue-400' : ''
              }`}
            >
              <div className="flex items-start gap-2">
                {entry.photos.length > 0 && (
                  <img src={entry.photos[0]} className="w-10 h-10 object-cover rounded flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-800 truncate">{entry.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {entry.date}
                    {entry.placeName && <span> · {entry.placeName}</span>}
                  </p>
                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {entry.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                          #{tag}
                        </span>
                      ))}
                      {entry.tags.length > 3 && (
                        <span className="text-xs text-gray-400">+{entry.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-100 flex justify-between items-center">
        <span className="text-xs text-gray-400">{filtered.length} / {entries.length} 件</span>
        <button
          onClick={onExport}
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
        >
          書き出し (JSON)
        </button>
      </div>
    </div>
  )
}

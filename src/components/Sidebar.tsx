import type { Entry } from '../types'

type Props = {
  entries: Entry[]
  selectedEntry: Entry | null
  filterTag: string | null
  onSelectEntry: (entry: Entry) => void
  onFilterTag: (tag: string | null) => void
}

export function Sidebar({ entries, selectedEntry, filterTag, onSelectEntry, onFilterTag }: Props) {
  const allTags = Array.from(new Set(entries.flatMap(e => e.tags))).sort()

  const filtered = filterTag
    ? entries.filter(e => e.tags.includes(filterTag))
    : entries

  return (
    <div className="flex flex-col h-full bg-white">
      {allTags.length > 0 && (
        <div className="p-3 border-b border-gray-100">
          <p className="text-xs text-gray-400 mb-2">タグで絞り込み</p>
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

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">
            {filterTag ? `#${filterTag} の記録はありません` : 'マップをクリックして記録を追加'}
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
            </button>
          ))
        )}
      </div>
    </div>
  )
}

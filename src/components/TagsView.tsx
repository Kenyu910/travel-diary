import type { Entry } from '../types'

type Props = {
  entries: Entry[]
  filterTag: string | null
  onFilterTag: (tag: string | null) => void
  onSelectEntry: (entry: Entry) => void
}

export function TagsView({ entries, filterTag, onFilterTag, onSelectEntry }: Props) {
  const tagMap = new Map<string, Entry[]>()
  entries.forEach(e => {
    e.tags.forEach(t => {
      if (!tagMap.has(t)) tagMap.set(t, [])
      tagMap.get(t)!.push(e)
    })
  })
  const tags = Array.from(tagMap.entries()).sort((a, b) => b[1].length - a[1].length)

  const taggedEntries = filterTag ? (tagMap.get(filterTag) ?? []) : []

  return (
    <div className="px-5 pt-2 pb-6">
      <h2 className="text-lg font-bold text-gray-700 mb-4">🏷️ タグ一覧</h2>

      {tags.length === 0 ? (
        <div className="text-center py-12 text-gray-300">
          <div className="text-5xl mb-3">🌷</div>
          <p className="text-sm">記録にタグを付けると<br />ここに表示されます</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-5">
            {tags.map(([tag, tagEntries]) => (
              <button
                key={tag}
                onClick={() => onFilterTag(filterTag === tag ? null : tag)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-sm font-medium transition-colors ${
                  filterTag === tag
                    ? 'bg-purple-400 text-white border-purple-400'
                    : 'bg-white text-purple-500 border-purple-200'
                }`}
              >
                <span>#{tag}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  filterTag === tag ? 'bg-purple-300' : 'bg-purple-100'
                }`}>
                  {tagEntries.length}
                </span>
              </button>
            ))}
          </div>

          {filterTag && taggedEntries.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-3">#{filterTag} の記録</p>
              <div className="flex flex-col gap-3">
                {taggedEntries.map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => onSelectEntry(entry)}
                    className="text-left bg-white rounded-2xl shadow-sm border border-pink-50 p-3.5 hover:shadow-md transition-shadow active:scale-[0.98]"
                  >
                    <p className="font-semibold text-gray-800 text-sm">{entry.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">📅 {entry.date}{entry.placeName && ` · 📍 ${entry.placeName}`}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

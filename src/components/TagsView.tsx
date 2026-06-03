import { Tag, MapPin, Calendar, ChevronRight } from 'lucide-react'
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
    <div className="px-4 pt-3 pb-8">
      <h2 className="text-base font-bold text-gray-700 mb-4">タグ一覧</h2>

      {tags.length === 0 ? (
        <div className="text-center py-12 text-gray-300">
          <Tag size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">記録にタグを付けると<br />ここに表示されます</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-5">
            {tags.map(([tag, tagEntries]) => (
              <button key={tag} onClick={() => onFilterTag(filterTag === tag ? null : tag)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-sm font-medium transition-colors ${
                  filterTag === tag ? 'bg-purple-400 text-white border-purple-400' : 'bg-white text-purple-500 border-purple-200'
                }`}>
                <Tag size={13} />
                <span>{tag}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${filterTag === tag ? 'bg-purple-300' : 'bg-purple-100'}`}>
                  {tagEntries.length}
                </span>
              </button>
            ))}
          </div>

          {filterTag && taggedEntries.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-2">#{filterTag} の記録</p>
              <div className="flex flex-col gap-2">
                {taggedEntries.map(entry => (
                  <button key={entry.id} onClick={() => onSelectEntry(entry)}
                    className="text-left bg-white rounded-2xl shadow-sm border border-gray-100 p-3.5 flex items-center gap-3 active:scale-[0.98]">
                    {entry.photos.length > 0
                      ? <img src={entry.photos[0]} className="w-11 h-11 object-cover rounded-xl flex-shrink-0" />
                      : <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                          <MapPin size={16} className="text-pink-400" />
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800 truncate">{entry.title}</p>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar size={10} />{entry.date}
                        {entry.placeName && <span> · {entry.placeName}</span>}
                      </span>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
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

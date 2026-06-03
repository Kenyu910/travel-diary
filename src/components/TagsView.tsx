import { useState } from 'react'
import { Tag, MapPin, Calendar, ChevronRight, Plus, X, GripVertical } from 'lucide-react'
import { useGlobalTags } from '../store'
import type { Entry } from '../types'

type Props = {
  entries: Entry[]
  filterTag: string | null
  onFilterTag: (tag: string | null) => void
  onSelectEntry: (entry: Entry) => void
}

export function TagsView({ entries, filterTag, onFilterTag, onSelectEntry }: Props) {
  const { tags: globalTags, addTag, removeTag } = useGlobalTags()
  const [newTagInput, setNewTagInput] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const tagMap = new Map<string, Entry[]>()
  entries.forEach(e => {
    e.tags.forEach(t => {
      if (!tagMap.has(t)) tagMap.set(t, [])
      tagMap.get(t)!.push(e)
    })
  })

  const handleAddTag = () => {
    const t = newTagInput.trim()
    if (!t) return
    addTag(t)
    setNewTagInput('')
  }

  const handleDeleteTag = (tag: string) => {
    if (confirmDelete === tag) {
      removeTag(tag)
      setConfirmDelete(null)
      if (filterTag === tag) onFilterTag(null)
    } else {
      setConfirmDelete(tag)
    }
  }

  const taggedEntries = filterTag ? (tagMap.get(filterTag) ?? []) : []

  return (
    <div className="px-4 pt-3 pb-8">

      {/* Tag management section */}
      <div className="mb-5">
        <h2 className="text-base font-bold text-gray-700 mb-3">タグ管理</h2>

        {/* Add new tag */}
        <div className="flex gap-2 mb-3">
          <input
            value={newTagInput}
            onChange={e => setNewTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
            placeholder="新しいタグを追加..."
            autoComplete="off"
            className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
          <button
            onClick={handleAddTag}
            className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-500 flex items-center justify-center"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Global tags list */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {globalTags.length === 0 ? (
            <p className="text-center py-4 text-xs text-gray-400">タグがありません</p>
          ) : (
            globalTags.map((tag, i) => {
              const count = tagMap.get(tag)?.length ?? 0
              const isConfirming = confirmDelete === tag
              return (
                <div key={tag}
                  className={`flex items-center gap-3 px-4 py-3 ${i < globalTags.length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <GripVertical size={14} className="text-gray-200 flex-shrink-0" />
                  <Tag size={14} className="text-purple-400 flex-shrink-0" />
                  <span className="flex-1 text-sm text-gray-700">#{tag}</span>
                  {count > 0 && (
                    <span className="text-xs bg-purple-50 text-purple-400 px-2 py-0.5 rounded-full">{count}件</span>
                  )}
                  <button
                    onClick={() => handleDeleteTag(tag)}
                    className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                      isConfirming
                        ? 'bg-red-400 text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isConfirming ? '確認' : <X size={12} />}
                  </button>
                </div>
              )
            })
          )}
        </div>
        {confirmDelete && (
          <div className="flex items-center justify-between mt-2 px-1">
            <p className="text-xs text-red-400">「#{confirmDelete}」を削除しますか？</p>
            <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-400 underline">キャンセル</button>
          </div>
        )}
      </div>

      {/* Tag filter section */}
      <h2 className="text-base font-bold text-gray-700 mb-3">タグで絞り込み</h2>

      {globalTags.length === 0 && tagMap.size === 0 ? (
        <div className="text-center py-8 text-gray-300">
          <Tag size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">タグを作成して記録を整理しましょう</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {/* Show all tags that have entries OR all global tags */}
            {Array.from(new Set([...globalTags, ...tagMap.keys()])).map(tag => {
              const count = tagMap.get(tag)?.length ?? 0
              return (
                <button
                  key={tag}
                  onClick={() => onFilterTag(filterTag === tag ? null : tag)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-sm font-medium transition-colors ${
                    filterTag === tag
                      ? 'bg-purple-400 text-white border-purple-400'
                      : count > 0
                        ? 'bg-white text-purple-500 border-purple-200'
                        : 'bg-white text-gray-400 border-gray-200'
                  }`}
                >
                  <span>#{tag}</span>
                  {count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      filterTag === tag ? 'bg-purple-300' : 'bg-purple-100 text-purple-400'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {filterTag && taggedEntries.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-2">#{filterTag} の記録</p>
              <div className="flex flex-col gap-2">
                {taggedEntries.map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => onSelectEntry(entry)}
                    className="text-left bg-white rounded-2xl shadow-sm border border-gray-100 p-3.5 flex items-center gap-3 active:scale-[0.98]">
                    {entry.photos.length > 0
                      ? <img src={entry.photos[0]} className="w-11 h-11 object-cover rounded-xl flex-shrink-0" />
                      : <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                          <MapPin size={16} className="text-pink-400" />
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      {entry.placeName && (
                        <p className="text-xs font-semibold text-pink-500 truncate">📍 {entry.placeName}</p>
                      )}
                      <p className="font-semibold text-sm text-gray-800 truncate">{entry.title}</p>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar size={10} />{entry.date}
                      </span>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {filterTag && taggedEntries.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-6">
              #{filterTag} の記録はまだありません
            </p>
          )}
        </>
      )}
    </div>
  )
}

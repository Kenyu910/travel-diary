import { useState } from 'react'
import { Tag, MapPin, Calendar, ChevronRight, Plus, X, ChevronDown, ChevronUp, Check, ArrowUp, ArrowDown } from 'lucide-react'
import { useGlobalTags } from '../store'
import { TAG_PRESET_COLORS } from '../settings'
import type { Entry } from '../types'

type Props = {
  entries: Entry[]
  filterTag: string | null
  onFilterTag: (tag: string | null) => void
  onSelectEntry: (entry: Entry) => void
  tagColors: Record<string, string>
  onUpdateTagColors: (colors: Record<string, string>) => void
  /** Propagate tag rename to all saved entries */
  onRenameTag: (oldName: string, newName: string) => void
}

export function TagsView({ entries, filterTag, onFilterTag, onSelectEntry, tagColors, onUpdateTagColors, onRenameTag }: Props) {
  const { tags: globalTags, addTag, removeTag, reorderTag, setTags } = useGlobalTags()
  const [newTagInput, setNewTagInput] = useState('')
  const [showAddInput, setShowAddInput] = useState(false)
  // Start open so tags are immediately visible
  const [showTagList, setShowTagList] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showColorFor, setShowColorFor] = useState<string | null>(null)

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
    setShowAddInput(false)
  }

  const handleDeleteTag = (tag: string) => {
    if (confirmDelete === tag) {
      removeTag(tag)
      setConfirmDelete(null)
      if (filterTag === tag) onFilterTag(null)
      // Remove its color too
      const next = { ...tagColors }
      delete next[tag]
      onUpdateTagColors(next)
    } else {
      setConfirmDelete(tag)
    }
  }

  const startEdit = (tag: string) => {
    setEditingTag(tag)
    setEditValue(tag)
    setConfirmDelete(null)
    setShowColorFor(null)
  }

  const commitEdit = () => {
    if (!editingTag || !editValue.trim() || editValue.trim() === editingTag) {
      setEditingTag(null); return
    }
    const newName = editValue.trim()
    // Migrate color key (keep existing color if newName already has one)
    if (tagColors[editingTag]) {
      const next = { ...tagColors }
      if (!next[newName]) next[newName] = next[editingTag]
      delete next[editingTag]
      onUpdateTagColors(next)
    }
    // If newName already exists, merge (drop old) instead of creating a duplicate
    setTags(prev => prev.includes(newName)
      ? prev.filter(t => t !== editingTag)
      : prev.map(t => t === editingTag ? newName : t))
    // Rename the tag inside all saved entries too — otherwise counts/filters/pin
    // colors silently break because entries still hold the old name
    onRenameTag(editingTag, newName)
    if (filterTag === editingTag) onFilterTag(newName)
    setEditingTag(null)
  }

  const setTagColor = (tag: string, color: string) => {
    const next = { ...tagColors }
    if (next[tag] === color) delete next[tag]  // toggle off
    else next[tag] = color
    onUpdateTagColors(next)
  }

  const taggedEntries = filterTag ? (tagMap.get(filterTag) ?? []) : []

  return (
    <div className="px-4 pt-3 pb-8">

      {/* ─── Tag management ─── */}
      <div className="mb-5">

        {/* Add button */}
        {showAddInput ? (
          <div className="flex gap-2 mb-3">
            <input
              value={newTagInput}
              onChange={e => setNewTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); handleAddTag() }
                if (e.key === 'Escape') setShowAddInput(false)
              }}
              placeholder="タグ名を入力..."
              autoComplete="off"
              autoFocus
              className="flex-1 bg-gray-50 border border-purple-200 rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
            <button onClick={handleAddTag}
              className="w-10 h-10 rounded-2xl bg-purple-400 text-white flex items-center justify-center">
              <Check size={16} />
            </button>
            <button onClick={() => { setShowAddInput(false); setNewTagInput('') }}
              className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center">
              <X size={16} />
            </button>
          </div>
        ) : (
          <button onClick={() => setShowAddInput(true)}
            className="flex items-center gap-2 w-full px-3 py-2.5 mb-3 text-sm text-purple-500 bg-purple-50 border border-purple-200 rounded-2xl">
            <Plus size={15} /> タグを追加する
          </button>
        )}

        {/* Tag list — collapsible (starts open) */}
        <button
          onClick={() => setShowTagList(v => !v)}
          className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-100 rounded-2xl mb-2"
        >
          <span className="flex items-center gap-2">
            <Tag size={14} className="text-purple-400" />
            タグ一覧（{globalTags.length}件）
          </span>
          {showTagList ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>

        {showTagList && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {globalTags.length === 0 ? (
              <div className="text-center py-6">
                <Tag size={28} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">タグがありません</p>
                <p className="text-xs text-gray-300 mt-1">上のボタンから追加できます</p>
              </div>
            ) : (
              globalTags.map((tag, i) => {
                const count = tagMap.get(tag)?.length ?? 0
                const isEditing = editingTag === tag
                const isConfirming = confirmDelete === tag
                const currentColor = tagColors[tag]
                const isShowingColor = showColorFor === tag

                return (
                  <div key={tag} className={`${i < globalTags.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    {/* Main row */}
                    <div className="flex items-center gap-1.5 px-3 py-2.5">
                      {/* Tag icon (付箋マーク) — tap to open color picker */}
                      <button
                        onClick={() => !isEditing && setShowColorFor(isShowingColor ? null : tag)}
                        className={`flex-shrink-0 transition-colors ${isShowingColor ? 'text-purple-500' : 'text-gray-300 active:text-purple-400'}`}
                        title="ピンの色を設定"
                      >
                        <Tag
                          size={16}
                          style={currentColor ? { color: currentColor } : {}}
                          fill={currentColor || 'none'}
                        />
                      </button>

                      {isEditing ? (
                        <input
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingTag(null) }}
                          autoFocus
                          className="flex-1 text-sm text-gray-700 border-b border-purple-300 focus:outline-none bg-transparent"
                        />
                      ) : (
                        <button onClick={() => startEdit(tag)} className="flex-1 text-left text-sm text-gray-700 hover:text-purple-500">
                          #{tag}
                        </button>
                      )}

                      {count > 0 && !isEditing && (
                        <span className="text-xs bg-purple-50 text-purple-400 px-1.5 py-0.5 rounded-full flex-shrink-0">{count}</span>
                      )}

                      {/* Reorder buttons */}
                      {!isEditing && !isConfirming && (
                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => i > 0 && reorderTag(i, i - 1)}
                            disabled={i === 0}
                            className={`w-5 h-5 rounded flex items-center justify-center ${i === 0 ? 'text-gray-200' : 'text-gray-400 active:bg-gray-100'}`}
                          ><ArrowUp size={10} /></button>
                          <button
                            onClick={() => i < globalTags.length - 1 && reorderTag(i, i + 1)}
                            disabled={i === globalTags.length - 1}
                            className={`w-5 h-5 rounded flex items-center justify-center ${i === globalTags.length - 1 ? 'text-gray-200' : 'text-gray-400 active:bg-gray-100'}`}
                          ><ArrowDown size={10} /></button>
                        </div>
                      )}

                      {isEditing ? (
                        <button onClick={commitEdit} className="w-7 h-7 rounded-full bg-purple-100 text-purple-500 flex items-center justify-center flex-shrink-0">
                          <Check size={12} />
                        </button>
                      ) : (
                        <button onClick={() => handleDeleteTag(tag)}
                          className={`text-xs px-2 py-1 rounded-full transition-colors flex-shrink-0 ${isConfirming ? 'bg-red-400 text-white' : 'bg-gray-100 text-gray-400'}`}>
                          {isConfirming ? '確認' : <X size={12} />}
                        </button>
                      )}
                    </div>

                    {/* Inline color picker row */}
                    {isShowingColor && (
                      <div className="px-3 pb-3 flex items-center gap-2">
                        <span className="text-xs text-gray-400 mr-1">ピン色:</span>
                        {TAG_PRESET_COLORS.map(color => (
                          <button
                            key={color}
                            onClick={() => setTagColor(tag, color)}
                            style={{
                              width: 24, height: 24, borderRadius: '50%', background: color,
                              border: currentColor === color ? '3px solid #1f2937' : '2px solid white',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              outline: currentColor === color ? '1px solid' + color : 'none',
                              outlineOffset: '2px',
                            }}
                          />
                        ))}
                        {currentColor && (
                          <button
                            onClick={() => setTagColor(tag, currentColor)} // toggle off
                            className="text-xs text-gray-400 underline ml-1"
                          >リセット</button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {confirmDelete && (
          <div className="flex items-center justify-between mt-2 px-1">
            <p className="text-xs text-red-400">「#{confirmDelete}」を削除しますか？</p>
            <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-400 underline">キャンセル</button>
          </div>
        )}
      </div>

      {/* ─── Filter section ─── */}
      {(globalTags.length > 0 || tagMap.size > 0) && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">タグで絞り込み</p>
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set([...globalTags, ...tagMap.keys()])).map(tag => {
              const count = tagMap.get(tag)?.length ?? 0
              const color = tagColors[tag]
              return (
                <button key={tag}
                  onClick={() => onFilterTag(filterTag === tag ? null : tag)}
                  style={filterTag === tag && color ? { background: color, borderColor: color } : {}}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                    filterTag === tag
                      ? color ? 'text-white' : 'bg-purple-400 text-white border-purple-400'
                      : count > 0 ? 'bg-white text-purple-500 border-purple-200'
                      : 'bg-white text-gray-400 border-gray-200'
                  }`}
                >
                  {color && <span style={{ width: 8, height: 8, borderRadius: '50%', background: filterTag === tag ? 'white' : color, display: 'inline-block', flexShrink: 0 }} />}
                  <span>#{tag}</span>
                  {count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${filterTag === tag ? 'bg-white/30 text-white' : 'bg-purple-100 text-purple-400'}`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Filtered entries */}
      {filterTag && (
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2">#{filterTag} の記録（{taggedEntries.length}件）</p>
          {taggedEntries.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-6">記録はまだありません</p>
          ) : (
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
                    {entry.placeName && (
                      <div className="flex items-center gap-1 mb-0.5">
                        <MapPin size={10} className="text-pink-400 flex-shrink-0" />
                        <p className="text-xs font-semibold text-pink-500 truncate">{entry.placeName}</p>
                      </div>
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
          )}
        </div>
      )}
    </div>
  )
}

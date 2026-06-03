import { useState, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Entry } from '../types'

type Props = {
  lat: number
  lng: number
  onSave: (entry: Entry) => void
  onCancel: () => void
  initial?: Entry
}

export function EntryForm({ lat, lng, onSave, onCancel, initial }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10))
  const [placeName, setPlaceName] = useState(initial?.placeName ?? '')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(initial?.tags ?? [])
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? [])
  const fileRef = useRef<HTMLInputElement>(null)

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '')
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag))

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    files.forEach(file => {
      // Warn if file is large (localStorage has ~5MB limit total)
      if (file.size > 500_000) {
        alert(`「${file.name}」は500KB超です。多数の写真を保存するとデータが失われる場合があります。`)
      }
      const reader = new FileReader()
      reader.onload = ev => {
        if (ev.target?.result) setPhotos(prev => [...prev, ev.target!.result as string])
      }
      reader.readAsDataURL(file)
    })
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave({
      id: initial?.id ?? uuidv4(),
      title: title.trim(),
      body,
      date,
      lat,
      lng,
      placeName,
      tags,
      photos,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 h-full overflow-y-auto">
      <h2 className="text-lg font-semibold text-gray-800">
        {initial ? '記録を編集' : '新しい記録'}
      </h2>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">タイトル *</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="場所のタイトル"
          required
        />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">日付</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">場所名</label>
          <input
            value={placeName}
            onChange={e => setPlaceName(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="例: 渋谷駅前"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">メモ</label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={4}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          placeholder="この場所の思い出を書く..."
        />
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">タグ</label>
        <div className="flex gap-2 mb-2">
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="#グルメ #旅行"
          />
          <button type="button" onClick={addTag} className="px-3 py-2 bg-gray-100 rounded text-sm hover:bg-gray-200">
            追加
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {tags.map(tag => (
            <span key={tag} className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
              #{tag}
              <button type="button" onClick={() => removeTag(tag)} className="text-blue-400 hover:text-blue-700">×</button>
            </span>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">写真</label>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="px-3 py-2 border border-dashed border-gray-300 rounded text-sm text-gray-500 hover:bg-gray-50 w-full"
        >
          + 写真を追加
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhoto} className="hidden" />
        {photos.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {photos.map((p, i) => (
              <div key={i} className="relative">
                <img src={p} className="w-16 h-16 object-cover rounded" />
                <button
                  type="button"
                  onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-gray-400">
        📍 {lat.toFixed(5)}, {lng.toFixed(5)}
      </div>

      <div className="flex gap-2 mt-auto pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
        >
          キャンセル
        </button>
        <button
          type="submit"
          className="flex-1 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          保存
        </button>
      </div>
    </form>
  )
}

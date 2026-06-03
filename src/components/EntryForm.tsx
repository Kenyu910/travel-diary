import { useState, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Calendar, MapPin, FileText, Tag, Image, Save, Plus, Star, Loader2, X } from 'lucide-react'
import { StarRating } from './StarRating'
import { compressImage } from '../utils/compressImage'
import { useGlobalTags } from '../store'
import type { Entry } from '../types'

type Props = {
  lat: number
  lng: number
  onSave: (entry: Entry) => void
  onCancel: () => void
  initial?: Entry
  defaultPlaceName?: string
}

export function EntryForm({ lat, lng, onSave, onCancel: _, initial, defaultPlaceName }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10))
  const [placeName, setPlaceName] = useState(initial?.placeName ?? defaultPlaceName ?? '')
  const [selectedTags, setSelectedTags] = useState<string[]>(initial?.tags ?? [])
  const [newTagInput, setNewTagInput] = useState('')
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? [])
  const [rating, setRating] = useState<number>(initial?.rating ?? 0)
  const [compressing, setCompressing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { tags: globalTags, addTag: addGlobalTag } = useGlobalTags()

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const handleAddNewTag = () => {
    const t = newTagInput.trim()
    if (!t) return
    addGlobalTag(t)
    setSelectedTags(prev => prev.includes(t) ? prev : [...prev, t])
    setNewTagInput('')
  }

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    e.target.value = ''
    setCompressing(true)
    try {
      for (const file of files) {
        const compressed = await compressImage(file)
        setPhotos(prev => [...prev, compressed])
      }
    } catch {
      alert('写真の処理に失敗しました。')
    } finally {
      setCompressing(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave({
      id: initial?.id ?? uuidv4(),
      title: title.trim(), body, date, lat, lng,
      placeName, tags: selectedTags, photos, rating,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col px-5 pt-1 pb-8 gap-4">

      {/* Title */}
      <div>
        <label className="text-xs font-semibold text-gray-400 mb-1.5 block">タイトル *</label>
        <input
          value={title} onChange={e => setTitle(e.target.value)}
          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-200"
          placeholder="今日の記録タイトル"
          required
        />
      </div>

      {/* Date */}
      <div>
        <label className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
          <Calendar size={11} /> 日付
        </label>
        <input
          type="date" value={date} onChange={e => setDate(e.target.value)}
          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-pink-200"
        />
      </div>

      {/* Place */}
      <div>
        <label className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
          <MapPin size={11} /> 場所名
          {defaultPlaceName && !initial && (
            <span className="text-[10px] text-pink-400 ml-1">📍 自動入力</span>
          )}
        </label>
        <input
          value={placeName} onChange={e => setPlaceName(e.target.value)}
          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-pink-200"
          placeholder="例: 渋谷駅前"
        />
      </div>

      {/* Tags — tap to select from global list */}
      <div>
        <label className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
          <Tag size={11} /> タグ
        </label>
        {/* Global tag chips */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {globalTags.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                selectedTags.includes(tag)
                  ? 'bg-purple-400 text-white border-purple-400'
                  : 'bg-white text-purple-500 border-purple-200'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
        {/* Add new tag */}
        <div className="flex gap-2">
          <input
            value={newTagInput}
            onChange={e => setNewTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewTag() } }}
            className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200"
            placeholder="新しいタグを追加..."
          />
          <button
            type="button" onClick={handleAddNewTag}
            className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-500 flex items-center justify-center"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Rating */}
      <div>
        <label className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
          <Star size={11} /> 評価（任意）
        </label>
        <StarRating value={rating} onChange={setRating} size={28} />
      </div>

      {/* Memo */}
      <div>
        <label className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
          <FileText size={11} /> メモ（任意）
        </label>
        <textarea
          value={body} onChange={e => setBody(e.target.value)} rows={4}
          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 resize-none"
          placeholder="今日の出来事、感想、メモ..."
        />
      </div>

      {/* Photos — optional */}
      <div>
        <label className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
          <Image size={11} /> 写真（任意）
        </label>
        <button
          type="button"
          onClick={() => !compressing && fileRef.current?.click()}
          disabled={compressing}
          className={`w-full py-3 border-2 border-dashed rounded-2xl text-sm flex items-center justify-center gap-2 transition-colors ${
            compressing
              ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
              : 'border-pink-200 text-pink-400 bg-pink-50'
          }`}
        >
          {compressing
            ? <><Loader2 size={15} className="animate-spin" /> 処理中...</>
            : <><Plus size={15} /> 写真を追加</>
          }
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhoto} className="hidden" />
        {photos.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {photos.map((p, i) => (
              <div key={i} className="relative">
                <img src={p} className="w-20 h-20 object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-400 text-white rounded-full flex items-center justify-center shadow"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-300 text-center">{lat.toFixed(5)}, {lng.toFixed(5)}</p>

      <button type="submit"
        className="w-full py-4 bg-gradient-to-r from-pink-400 to-rose-400 text-white rounded-2xl font-semibold shadow-md shadow-pink-100 active:scale-95 transition-transform flex items-center justify-center gap-2">
        <Save size={18} /> 保存する
      </button>
    </form>
  )
}

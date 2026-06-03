import { useState } from 'react'
import { ArrowLeft, Pencil, Trash2, Share2, MapPin, Calendar, Tag } from 'lucide-react'
import { Lightbox } from './Lightbox'
import type { Entry } from '../types'

type Props = {
  entry: Entry
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}

export function EntryDetail({ entry, onEdit, onDelete, onClose }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const handleShare = async () => {
    const text = `${entry.title}\n${entry.date}${entry.placeName ? ` · ${entry.placeName}` : ''}\n${entry.body ?? ''}`
    if (navigator.share) {
      await navigator.share({ title: entry.title, text }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(text)
      alert('クリップボードにコピーしました')
    }
  }

  return (
    <div className="flex flex-col pb-8">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-3">
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
          <ArrowLeft size={18} />
        </button>
        <div className="flex gap-2">
          <button onClick={handleShare}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
            <Share2 size={16} />
          </button>
          <button onClick={onEdit}
            className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center text-purple-400">
            <Pencil size={16} />
          </button>
          <button onClick={onDelete}
            className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-400">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Hero photo */}
      {entry.photos.length > 0 && (
        <div className="px-4 mb-4">
          <button onClick={() => setLightboxIndex(0)} className="w-full">
            <img src={entry.photos[0]} className="w-full h-52 object-cover rounded-3xl shadow-sm" />
          </button>
        </div>
      )}

      <div className="px-5 flex flex-col gap-3">
        {/* Title */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 leading-snug">{entry.title}</h2>
          <div className="flex flex-wrap gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Calendar size={12} /> {entry.date}
            </span>
            {entry.placeName && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <MapPin size={12} /> {entry.placeName}
              </span>
            )}
          </div>
        </div>

        {/* Tags */}
        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <Tag size={13} className="text-gray-300" />
            {entry.tags.map(tag => (
              <span key={tag} className="bg-purple-50 text-purple-500 text-xs px-3 py-1.5 rounded-full">#{tag}</span>
            ))}
          </div>
        )}

        {/* Body */}
        {entry.body && (
          <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-2xl p-4">
            {entry.body}
          </p>
        )}

        {/* Photo grid */}
        {entry.photos.length > 1 && (
          <div className="grid grid-cols-3 gap-2">
            {entry.photos.slice(1).map((p, i) => (
              <button key={i} onClick={() => setLightboxIndex(i + 1)}>
                <img src={p} className="w-full aspect-square object-cover rounded-xl" />
              </button>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-300 text-center pt-1">
          {entry.lat.toFixed(5)}, {entry.lng.toFixed(5)}
        </p>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={entry.photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex(i => Math.max(0, (i ?? 0) - 1))}
          onNext={() => setLightboxIndex(i => Math.min(entry.photos.length - 1, (i ?? 0) + 1))}
        />
      )}
    </div>
  )
}

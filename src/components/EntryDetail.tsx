import { useState } from 'react'
import { Pencil, Trash2, Share2, MapPin, Calendar, Tag, ExternalLink, Check } from 'lucide-react'
import { Lightbox } from './Lightbox'
import { StarRating } from './StarRating'
import { openInGoogleMaps } from './MapView'
import type { Entry } from '../types'

type Props = {
  entry: Entry
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
  onFlyTo?: (lat: number, lng: number) => void
  /** Convert a 行きたい (wishlist) entry into a visited diary entry */
  onMarkVisited?: (entry: Entry) => void
}

export function EntryDetail({ entry, onEdit, onDelete, onClose: _, onFlyTo, onMarkVisited }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const handleShare = async () => {
    const text = `${entry.title}\n${entry.date}${entry.placeName ? ` · ${entry.placeName}` : ''}${entry.body ? `\n${entry.body}` : ''}`
    if (navigator.share) {
      await navigator.share({ title: entry.title, text }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(text)
      alert('クリップボードにコピーしました')
    }
  }

  return (
    <div className="flex flex-col pb-8">
      {/* Action buttons (close button is in BottomSheet header) */}
      <div className="flex items-center justify-end gap-2 px-4 pb-3">
        <button onClick={handleShare}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 active:bg-gray-200">
          <Share2 size={16} />
        </button>
        <button onClick={onEdit}
          className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center text-purple-400 active:bg-purple-100">
          <Pencil size={16} />
        </button>
        <button onClick={onDelete}
          className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-400 active:bg-red-100">
          <Trash2 size={16} />
        </button>
      </div>

      {/* Wishlist → visited conversion */}
      {entry.wantToVisit && onMarkVisited && (
        <div className="px-4 pb-3">
          <button
            onClick={() => onMarkVisited(entry)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-pink-400 to-rose-400 text-white font-semibold shadow-md active:scale-95 transition-transform"
          >
            <Check size={18} /> ここに行った（日記にする）
          </button>
        </div>
      )}

      {/* Hero photo */}
      {entry.photos.length > 0 && (
        <div className="px-4 mb-4">
          <button onClick={() => setLightboxIndex(0)} className="w-full block">
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

        {/* Rating */}
        {(entry.rating ?? 0) > 0 && (
          <StarRating value={entry.rating!} readonly size={20} />
        )}

        {/* また行きたい度 */}
        {(entry.revisit ?? 0) > 0 && (
          <div className="flex items-center gap-2">
            <StarRating value={entry.revisit!} readonly size={20} variant="heart" />
            <span className="text-xs text-rose-400">また行きたい</span>
          </div>
        )}

        {/* Tags */}
        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <Tag size={13} className="text-gray-300" />
            {entry.tags.map(tag => (
              <span key={tag} className="bg-purple-50 text-purple-500 text-xs px-3 py-1.5 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Body */}
        {entry.body && (
          <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-2xl p-4">
            {entry.body}
          </p>
        )}

        {/* Extra photos */}
        {entry.photos.length > 1 && (
          <div className="grid grid-cols-3 gap-2">
            {entry.photos.slice(1).map((p, i) => (
              <button key={i} onClick={() => setLightboxIndex(i + 1)} className="block">
                <img src={p} className="w-full aspect-square object-cover rounded-xl" />
              </button>
            ))}
          </div>
        )}

        {/* Location buttons */}
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => onFlyTo?.(entry.lat, entry.lng)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl bg-gray-50 border border-gray-100 active:bg-gray-100"
          >
            <MapPin size={13} className="text-pink-400" />
            <span className="text-xs text-pink-400 font-medium">アプリ内マップ</span>
          </button>
          <button
            onClick={() => openInGoogleMaps(entry.lat, entry.lng, entry.placeName || entry.title)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl bg-blue-50 border border-blue-100 active:bg-blue-100"
          >
            <ExternalLink size={13} className="text-blue-400" />
            <span className="text-xs text-blue-500 font-medium">Google Maps</span>
          </button>
        </div>
      </div>

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

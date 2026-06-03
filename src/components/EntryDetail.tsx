import type { Entry } from '../types'

type Props = {
  entry: Entry
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}

export function EntryDetail({ entry, onEdit, onDelete, onClose }: Props) {
  return (
    <div className="flex flex-col pb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-2 pb-3">
        <button onClick={onClose} className="text-gray-400 text-2xl leading-none">←</button>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="px-4 py-2 text-sm bg-purple-50 text-purple-400 rounded-2xl font-medium"
          >
            ✏️ 編集
          </button>
          <button
            onClick={onDelete}
            className="px-4 py-2 text-sm bg-red-50 text-red-400 rounded-2xl font-medium"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Hero photo */}
      {entry.photos.length > 0 && (
        <div className="px-5 mb-4">
          <img src={entry.photos[0]} className="w-full h-52 object-cover rounded-3xl shadow-sm" />
        </div>
      )}

      <div className="px-5 flex flex-col gap-3">
        {/* Title & meta */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 leading-snug">{entry.title}</h2>
          <p className="text-sm text-gray-400 mt-1">
            📅 {entry.date}
            {entry.placeName && <span>  ·  📍 {entry.placeName}</span>}
          </p>
        </div>

        {/* Tags */}
        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {entry.tags.map(tag => (
              <span key={tag} className="bg-purple-50 text-purple-400 text-xs px-3 py-1.5 rounded-full">
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
              <img key={i} src={p} className="w-full aspect-square object-cover rounded-xl" />
            ))}
          </div>
        )}

        <p className="text-xs text-gray-300 text-center pt-2">
          {entry.lat.toFixed(5)}, {entry.lng.toFixed(5)}
        </p>
      </div>
    </div>
  )
}

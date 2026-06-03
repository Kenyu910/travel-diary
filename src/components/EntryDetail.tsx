import type { Entry } from '../types'

type Props = {
  entry: Entry
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}

export function EntryDetail({ entry, onEdit, onDelete, onClose }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
        <div className="flex gap-2">
          <button onClick={onEdit} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">編集</button>
          <button onClick={onDelete} className="px-3 py-1 text-sm bg-red-50 text-red-500 border border-red-200 rounded hover:bg-red-100">削除</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">{entry.title}</h2>
          <p className="text-sm text-gray-400 mt-1">
            {entry.date}
            {entry.placeName && <span> · {entry.placeName}</span>}
          </p>
        </div>

        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entry.tags.map(tag => (
              <span key={tag} className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {entry.body && (
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{entry.body}</p>
        )}

        {entry.photos.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {entry.photos.map((p, i) => (
              <img key={i} src={p} className="w-full h-32 object-cover rounded" />
            ))}
          </div>
        )}

        <p className="text-xs text-gray-300 mt-auto">
          📍 {entry.lat.toFixed(5)}, {entry.lng.toFixed(5)}
        </p>
      </div>
    </div>
  )
}

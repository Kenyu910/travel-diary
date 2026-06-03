import { useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

type Props = {
  photos: string[]
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

export function Lightbox({ photos, index, onClose, onPrev, onNext }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, onPrev, onNext])

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={onClose}>
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white"
      >
        <X size={20} />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
        {index + 1} / {photos.length}
      </div>

      {/* Image */}
      <img
        src={photos[index]}
        className="max-w-full max-h-full object-contain"
        onClick={e => e.stopPropagation()}
      />

      {/* Prev */}
      {photos.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); onPrev() }}
            className="absolute left-3 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onNext() }}
            className="absolute right-3 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}
    </div>
  )
}

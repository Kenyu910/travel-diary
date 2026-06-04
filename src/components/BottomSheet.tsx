import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}

export function BottomSheet({ open, onClose, children, title }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [dragY, setDragY] = useState(0)
  const dragging = useRef(false)
  const startY = useRef(0)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = 0
    if (!open) setDragY(0) // Bug fix: reset drag position when sheet closes
  }, [open])

  const handleHandleTouchStart = (e: React.TouchEvent) => {
    dragging.current = true
    startY.current = e.touches[0].clientY
  }
  const handleHandleTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return
    const delta = e.touches[0].clientY - startY.current
    if (delta > 0) setDragY(delta)
  }
  const handleHandleTouchEnd = () => {
    dragging.current = false
    if (dragY > 100) { setDragY(0); onClose() }
    else setDragY(0)
  }

  const sheetStyle: React.CSSProperties = {
    transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
    transition: dragY > 0 ? 'none' : undefined,
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/25 z-20 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        style={sheetStyle}
        className={`fixed left-0 right-0 bottom-0 z-30 bg-white rounded-t-3xl shadow-2xl
          flex flex-col h-[92dvh]
          transition-transform duration-300 ease-out
          ${open ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        {/* Drag handle — touch here to swipe close */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-5 pt-3 pb-2 cursor-grab active:cursor-grabbing"
          onTouchStart={handleHandleTouchStart}
          onTouchMove={handleHandleTouchMove}
          onTouchEnd={handleHandleTouchEnd}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
            {title && <p className="text-sm font-semibold text-gray-600">{title}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 active:bg-gray-200"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </>
  )
}

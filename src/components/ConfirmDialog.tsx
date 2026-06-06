/**
 * iOS-friendly confirmation dialog.
 * Native browser confirm() blocks PWA UI on some iOS versions.
 */
type Props = {
  open: boolean
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, message, confirmLabel = '削除', cancelLabel = 'キャンセル', danger = true, onConfirm, onCancel }: Props) {
  if (!open) return null
  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={onCancel}
      />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl shadow-2xl w-[280px] overflow-hidden">
        <div className="px-5 pt-6 pb-4">
          <p className="text-sm text-gray-700 text-center leading-relaxed">{message}</p>
        </div>
        <div className="flex border-t border-gray-100">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 text-sm font-medium text-gray-500 border-r border-gray-100 active:bg-gray-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3.5 text-sm font-semibold active:opacity-80 ${
              danger ? 'text-red-500' : 'text-pink-500'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  )
}

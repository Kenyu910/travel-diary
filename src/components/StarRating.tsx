import { Star } from 'lucide-react'

type Props = {
  value: number
  onChange?: (v: number) => void
  size?: number
  readonly?: boolean
}

export function StarRating({ value, onChange, size = 22, readonly = false }: Props) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(value === n ? 0 : n)}
          className={`transition-transform ${!readonly ? 'active:scale-125' : 'cursor-default'}`}
        >
          <Star
            size={size}
            strokeWidth={1.8}
            className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}
          />
        </button>
      ))}
    </div>
  )
}

import { Star, Heart } from 'lucide-react'

type Props = {
  value: number
  onChange?: (v: number) => void
  size?: number
  readonly?: boolean
  /** 'star' = taste rating (amber), 'heart' = また行きたい度 (rose) */
  variant?: 'star' | 'heart'
}

export function StarRating({ value, onChange, size = 22, readonly = false, variant = 'star' }: Props) {
  const Icon = variant === 'heart' ? Heart : Star
  const activeClass = variant === 'heart' ? 'fill-rose-500 text-rose-500' : 'fill-amber-400 text-amber-400'
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
          <Icon
            size={size}
            strokeWidth={1.8}
            className={n <= value ? activeClass : 'text-gray-200'}
          />
        </button>
      ))}
    </div>
  )
}

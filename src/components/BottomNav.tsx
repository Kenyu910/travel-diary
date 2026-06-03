export type Tab = 'map' | 'list' | 'tags' | 'settings'

type Props = {
  active: Tab
  onChange: (tab: Tab) => void
  entryCount: number
}

const tabs: { key: Tab; icon: string; label: string }[] = [
  { key: 'map',      icon: '🗺️', label: 'マップ' },
  { key: 'list',     icon: '📖', label: '日記'   },
  { key: 'tags',     icon: '🏷️', label: 'タグ'   },
  { key: 'settings', icon: '⚙️', label: '設定'   },
]

export function BottomNav({ active, onChange, entryCount }: Props) {
  return (
    <nav className="flex bg-white border-t border-pink-100 safe-bottom flex-shrink-0 shadow-[0_-2px_16px_rgba(255,182,193,0.2)]">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`flex-1 flex flex-col items-center py-2 gap-0.5 relative transition-colors ${
            active === t.key ? 'text-pink-500' : 'text-gray-400'
          }`}
        >
          <span className="text-2xl leading-none">{t.icon}</span>
          <span className="text-[10px] font-medium">{t.label}</span>
          {t.key === 'list' && entryCount > 0 && (
            <span className="absolute top-1.5 right-[calc(50%-18px)] bg-pink-400 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
              {entryCount > 99 ? '99+' : entryCount}
            </span>
          )}
        </button>
      ))}
    </nav>
  )
}

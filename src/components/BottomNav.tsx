import { Map, BookOpen, Tag, Settings } from 'lucide-react'

export type Tab = 'map' | 'list' | 'calendar' | 'tags' | 'settings'

type Props = {
  active: Tab
  onChange: (tab: Tab) => void
  entryCount: number
}

const tabs: { key: Tab; Icon: React.ElementType; label: string }[] = [
  { key: 'map',      Icon: Map,      label: 'マップ' },
  { key: 'list',     Icon: BookOpen, label: '日記'   },
  { key: 'calendar', Icon: ({ size, ...p }: any) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ), label: '日程' },
  { key: 'tags',     Icon: Tag,      label: 'タグ'   },
  { key: 'settings', Icon: Settings, label: '設定'   },
]

export function BottomNav({ active, onChange, entryCount }: Props) {
  return (
    <nav className="flex bg-white border-t border-gray-100 safe-bottom flex-shrink-0"
      style={{ boxShadow: '0 -1px 0 #f3f4f6, 0 -4px 16px rgba(0,0,0,0.04)' }}>
      {tabs.map(({ key, Icon, label }) => {
        const isActive = active === key
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex-1 flex flex-col items-center py-2.5 gap-1 relative transition-colors ${
              isActive ? 'text-pink-500' : 'text-gray-400'
            }`}
          >
            <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
            <span className="text-[10px] font-medium tracking-wide">{label}</span>
            {key === 'list' && entryCount > 0 && (
              <span className="absolute top-2 right-[calc(50%-16px)] bg-pink-400 text-white text-[9px] rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                {entryCount > 99 ? '99+' : entryCount}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}

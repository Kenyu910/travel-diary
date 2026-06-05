import { Map, BookOpen, CalendarDays, Tag, Settings } from 'lucide-react'

export type Tab = 'map' | 'list' | 'calendar' | 'tags' | 'settings'

type Props = {
  active: Tab
  onChange: (tab: Tab) => void
  entryCount: number
}

const tabs: { key: Tab; Icon: React.ElementType; label: string }[] = [
  { key: 'map',      Icon: Map,          label: 'マップ' },
  { key: 'list',     Icon: BookOpen,     label: '日記'   },
  { key: 'calendar', Icon: CalendarDays, label: '日程'   },
  { key: 'tags',     Icon: Tag,          label: 'タグ'   },
  { key: 'settings', Icon: Settings,     label: '設定'   },
]

// Bug fix: position:fixed so the nav never scrolls with page content.
// z-20 keeps it above the map but below BottomSheet (z-40) and its backdrop (z-30).
export function BottomNav({ active, onChange, entryCount }: Props) {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background: 'white',
        borderTop: '1px solid #f3f4f6',
        boxShadow: '0 -1px 0 #f3f4f6, 0 -4px 16px rgba(0,0,0,0.04)',
      }}
      className="flex"
    >
      {tabs.map(({ key, Icon, label }) => {
        const isActive = active === key
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 relative transition-colors ${
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

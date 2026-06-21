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

// Nav is in the normal flex flow (NOT position:fixed).
// The outer container is h-dvh flex-col so it never scrolls — the nav stays at the bottom
// without needing fixed positioning (which causes layout gaps on iOS Safari).
export function BottomNav({ active, onChange, entryCount }: Props) {
  return (
    <nav
      className="flex bg-white border-t border-gray-100 flex-shrink-0 safe-bottom"
      style={{
        position: 'relative',
        zIndex: 20, // sit above the absolutely-positioned map layer
        // Extend the white background a bit above the tab icons so the "3"
        // badge on the 日記 tab sits clearly on white with a little margin above.
        paddingTop: '8px',
        // #root is now the real viewport (fixed;inset:0), so the bottom edge is
        // truly the screen bottom — just clear the home indicator.
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
        boxShadow: '0 -1px 0 #f3f4f6, 0 -4px 16px rgba(0,0,0,0.04)',
      }}
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

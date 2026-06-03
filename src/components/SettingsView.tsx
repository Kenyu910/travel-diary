import { useRef } from 'react'
import {
  User, Palette, Map, Database, Info, Edit3, LayoutGrid, List,
  Clock, CalendarDays, Lightbulb, Download, Upload, HardDrive,
  Trash2, LocateFixed, ZoomIn, ChevronRight, RotateCcw, MapPin, Tag, Image
} from 'lucide-react'
import type { AppSettings, MapStyle, ListStyle } from '../settings'
import { MAP_TILES, CHANGELOG, DEFAULT_SETTINGS } from '../settings'
import type { Entry } from '../types'

type Props = {
  settings: AppSettings
  update: (patch: Partial<AppSettings>) => void
  entries: Entry[]
  onImport: (entries: Entry[]) => void
  onExport: () => void
  onClearAll: () => void
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 px-4 mb-2 mt-5">
      <Icon size={13} className="text-gray-400" />
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white mx-4 rounded-2xl overflow-hidden border border-gray-100">
      {children}
    </div>
  )
}

// Bug fix: Row is now a <div>, not a <button>, to avoid nested button HTML issues
// onClick on the whole row only used when there's no interactive right content
function Row({
  icon: Icon, label, sub, right, onRowClick, danger,
}: {
  icon: React.ElementType
  label: string
  sub?: string
  right?: React.ReactNode
  onRowClick?: () => void
  danger?: boolean
}) {
  return (
    <div
      onClick={onRowClick}
      className={`flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0 ${
        onRowClick ? 'cursor-pointer active:bg-gray-50' : ''
      }`}
    >
      <Icon size={18} className={`flex-shrink-0 ${danger ? 'text-red-400' : 'text-gray-400'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${danger ? 'text-red-400' : 'text-gray-700'}`}>{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{sub}</p>}
      </div>
      {right ? (
        <div className="flex-shrink-0">{right}</div>
      ) : (
        onRowClick && <ChevronRight size={15} className="text-gray-300 flex-shrink-0" />
      )}
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-pink-400' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

function SegmentControl<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string; icon?: React.ElementType }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1">
      {options.map(o => {
        const Icon = o.icon
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl transition-colors ${
              value === o.value ? 'bg-pink-400 text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {Icon && <Icon size={11} />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function SettingsView({ settings, update, entries, onImport, onExport, onClearAll }: Props) {
  const importRef = useRef<HTMLInputElement>(null)

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        const imported: Entry[] = Array.isArray(data) ? data : []
        if (imported.length === 0) { alert('有効なデータが見つかりませんでした'); return }
        if (confirm(`${imported.length} 件の記録をインポートしますか？\n既存データとマージされます。`)) {
          onImport(imported)
          alert(`✅ ${imported.length} 件をインポートしました`)
        }
      } catch { alert('ファイルの読み込みに失敗しました') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const totalEntries = entries.length
  const totalTags = new Set(entries.flatMap(e => e.tags)).size
  const totalPhotos = entries.reduce((s, e) => s + e.photos.length, 0)
  const storageKB = Math.round(JSON.stringify(entries).length / 1024)
  const displayName = settings.userName || 'ゲスト'

  return (
    <div className="pb-10">
      {/* Profile */}
      <div className="flex flex-col items-center py-5">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center mb-2 shadow-sm">
          <User size={28} className="text-white" />
        </div>
        <p className="font-bold text-gray-700 text-base">{displayName}</p>
        <p className="text-xs text-gray-400 mt-0.5">{totalEntries} 件の思い出</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 px-4 mb-1">
        {[
          { Icon: MapPin, value: totalEntries, label: '記録',  color: 'text-pink-400'   },
          { Icon: Tag,    value: totalTags,    label: 'タグ',  color: 'text-purple-400' },
          { Icon: Image,  value: totalPhotos,  label: '写真',  color: 'text-blue-400'   },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl py-3.5 text-center border border-gray-100">
            <s.Icon size={20} className={`${s.color} mx-auto mb-1`} />
            <p className="text-xl font-bold text-gray-700 leading-tight">{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Profile settings */}
      <SectionHeader icon={User} title="プロフィール" />
      <Card>
        <div className="px-4 py-3.5 flex items-center gap-3">
          <Edit3 size={18} className="text-gray-400 flex-shrink-0" />
          <input
            value={settings.userName}
            onChange={e => update({ userName: e.target.value })}
            placeholder="名前を入力"
            className="flex-1 text-sm text-gray-700 placeholder-gray-300 focus:outline-none bg-transparent"
          />
        </div>
      </Card>

      {/* Display */}
      <SectionHeader icon={Palette} title="表示設定" />
      <Card>
        <Row icon={LayoutGrid} label="記録の表示形式"
          right={<SegmentControl<ListStyle>
            options={[
              { value: 'card',    label: 'カード',    icon: LayoutGrid },
              { value: 'compact', label: 'コンパクト', icon: List },
            ]}
            value={settings.listStyle} onChange={v => update({ listStyle: v })} />}
        />
        <Row icon={Clock} label="並び順のデフォルト"
          right={<SegmentControl
            options={[
              { value: 'newest', label: '新しい順', icon: Clock },
              { value: 'oldest', label: '古い順',   icon: CalendarDays },
            ]}
            value={settings.defaultSort}
            onChange={v => update({ defaultSort: v as any })} />}
        />
        <Row icon={Lightbulb} label="ヒントを表示" sub="マップ上の案内メッセージ"
          right={<Toggle value={settings.showHint} onChange={v => update({ showHint: v })} />}
        />
      </Card>

      {/* Map */}
      <SectionHeader icon={Map} title="マップ設定" />
      <Card>
        <Row icon={Palette} label="マップスタイル"
          right={<SegmentControl<MapStyle>
            options={(Object.keys(MAP_TILES) as MapStyle[]).map(k => ({
              value: k, label: MAP_TILES[k].label,
            }))}
            value={settings.mapStyle} onChange={v => update({ mapStyle: v })} />}
        />
        <Row
          icon={LocateFixed} label="デフォルト表示位置"
          sub={`${settings.defaultLat.toFixed(3)}, ${settings.defaultLng.toFixed(3)}`}
          right={
            <button
              onClick={() => navigator.geolocation.getCurrentPosition(
                p => { update({ defaultLat: p.coords.latitude, defaultLng: p.coords.longitude }); alert('✅ 現在地を設定しました') },
                () => alert('位置情報の取得に失敗しました')
              )}
              className="text-xs text-pink-400 px-3 py-1.5 rounded-full bg-pink-50 border border-pink-200 whitespace-nowrap"
            >
              現在地に設定
            </button>
          }
        />
        <Row icon={ZoomIn} label="デフォルトズーム"
          right={
            <div className="flex items-center gap-2">
              <button
                onClick={() => update({ defaultZoom: Math.max(5, settings.defaultZoom - 1) })}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold text-xl flex items-center justify-center leading-none"
              >−</button>
              <span className="text-sm font-semibold text-gray-700 w-5 text-center">{settings.defaultZoom}</span>
              <button
                onClick={() => update({ defaultZoom: Math.min(18, settings.defaultZoom + 1) })}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold text-xl flex items-center justify-center leading-none"
              >+</button>
            </div>
          }
        />
      </Card>

      {/* Data */}
      <SectionHeader icon={Database} title="データ管理" />
      <Card>
        <Row icon={Download}   label="データをエクスポート" sub="JSON形式でバックアップ"         onRowClick={onExport} />
        <Row icon={Upload}     label="データをインポート"   sub="JSONファイルから復元・マージ"   onRowClick={() => importRef.current?.click()} />
        <input ref={importRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        <Row icon={HardDrive}  label="使用ストレージ"       sub={`約 ${storageKB} KB 使用中`} />
        <Row icon={Trash2}     label="全データを削除"       danger
          onRowClick={() => {
            if (confirm('⚠️ すべての記録を削除しますか？\nこの操作は取り消せません。')) {
              if (confirm('本当に削除しますか？')) onClearAll()
            }
          }}
        />
      </Card>

      {/* Changelog */}
      <SectionHeader icon={Info} title="バージョン情報" />
      <Card>
        {CHANGELOG.map((log, i) => (
          <div key={log.version} className={`px-4 py-4 ${i < CHANGELOG.length - 1 ? 'border-b border-gray-50' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${i === 0 ? 'bg-pink-100 text-pink-500' : 'bg-gray-100 text-gray-400'}`}>
                  v{log.version}
                </span>
                {i === 0 && <span className="text-xs bg-green-100 text-green-500 px-2 py-0.5 rounded-full font-medium">最新</span>}
              </div>
              <span className="text-xs text-gray-400">{log.date}</span>
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1.5">{log.title}</p>
            <ul className="flex flex-col gap-1">
              {log.changes.map(c => (
                <li key={c} className="text-xs text-gray-500 leading-relaxed">{c}</li>
              ))}
            </ul>
          </div>
        ))}
      </Card>

      <div className="text-center mt-6 mb-2">
        <p className="text-xs text-gray-300">旅日記 v1.4.0</p>
        <button
          onClick={() => { if (confirm('設定をリセットしますか？')) update({ ...DEFAULT_SETTINGS }) }}
          className="flex items-center gap-1.5 text-xs text-gray-300 mt-3 mx-auto"
        >
          <RotateCcw size={11} /> 設定をリセット
        </button>
      </div>
    </div>
  )
}

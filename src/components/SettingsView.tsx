import { useRef, useState } from 'react'
import { ConfirmDialog } from './ConfirmDialog'
import {
  User, Palette, Map, Database, Info, Edit3, LayoutGrid, List,
  Clock, CalendarDays, Lightbulb, Download, Upload, HardDrive,
  Trash2, LocateFixed, ZoomIn, ChevronRight, RotateCcw, MapPin, Tag, Image, TrendingUp
} from 'lucide-react'
import type { AppSettings, MapStyle, ListStyle } from '../settings'
import { MAP_STYLES, CHANGELOG, DEFAULT_SETTINGS } from '../settings'
import type { Entry } from '../types'
import { getPositionCached } from '../utils/geoCache'
import { StatsView } from './StatsView'

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
    <div className="bg-white mx-4 rounded-2xl border border-gray-100">
      {children}
    </div>
  )
}

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
        <div className="flex-shrink-0 ml-2">{right}</div>
      ) : (
        onRowClick && <ChevronRight size={15} className="text-gray-300 flex-shrink-0 ml-2" />
      )}
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        position: 'relative', width: 44, height: 26, borderRadius: 13,
        background: value ? '#f472b6' : '#d1d5db',
        border: 'none', cursor: 'pointer', flexShrink: 0,
        transition: 'background 0.2s', outline: 'none',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%',
        background: 'white', left: value ? 21 : 3,
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }} />
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
  const [confirmClear, setConfirmClear] = useState(false)
  const [importData, setImportData] = useState<Entry[] | null>(null)

  // Validate entry schema before importing
  const isValidEntry = (e: any): e is Entry => {
    return (
      typeof e === 'object' &&
      e !== null &&
      typeof e.id === 'string' &&
      typeof e.date === 'string' &&
      typeof e.lat === 'number' &&
      typeof e.lng === 'number' &&
      typeof e.title === 'string' &&
      typeof e.body === 'string' &&
      Array.isArray(e.photos) &&
      Array.isArray(e.tags)
    )
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        // Filter and validate entries — only import valid ones
        const imported: Entry[] = Array.isArray(data) ? data.filter(isValidEntry) : []
        if (imported.length === 0) { alert('有効なデータが見つかりませんでした'); return }
        setImportData(imported)  // Show custom confirm dialog
      } catch { alert('ファイルの読み込みに失敗しました') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Count actual visited records as "思い出" — 行きたい(wishlist) items are
  // plans, kept separate (matches the list tab and stats which exclude them).
  const diaryEntries = entries.filter(e => !e.wantToVisit)
  const totalEntries = diaryEntries.length
  const totalTags = new Set(diaryEntries.flatMap(e => e.tags)).size
  const totalPhotos = diaryEntries.reduce((s, e) => s + e.photos.length, 0)
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

      {/* Stats / recap */}
      <SectionHeader icon={TrendingUp} title="ふりかえり" />
      <StatsView entries={entries} />

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
        <Row icon={LayoutGrid} label="表示形式"
          right={<SegmentControl<ListStyle>
            options={[
              { value: 'card',    label: 'カード',    icon: LayoutGrid },
              { value: 'compact', label: 'コンパクト', icon: List },
            ]}
            value={settings.listStyle} onChange={v => update({ listStyle: v })} />}
        />
        <Row icon={Clock} label="並び順"
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
            options={(Object.keys(MAP_STYLES) as MapStyle[]).map(k => ({
              value: k, label: MAP_STYLES[k].label,
            }))}
            value={settings.mapStyle} onChange={v => update({ mapStyle: v })} />}
        />
        <Row icon={LocateFixed} label="デフォルト位置を使用"
          sub={settings.useDefaultLocation ? `${settings.defaultLat.toFixed(3)}, ${settings.defaultLng.toFixed(3)}` : 'オフ（現在地を使用）'}
          right={<Toggle value={settings.useDefaultLocation} onChange={v => update({ useDefaultLocation: v })} />}
        />
        {settings.useDefaultLocation && (
          <Row
            icon={LocateFixed} label="デフォルト位置"
            sub={`${settings.defaultLat.toFixed(3)}, ${settings.defaultLng.toFixed(3)}`}
            right={
              <button
                onClick={() => getPositionCached(
                  (lat, lng) => { update({ defaultLat: lat, defaultLng: lng }); alert('現在地を設定しました') },
                  () => alert('位置情報の取得に失敗しました')
                )}
                className="text-xs text-pink-400 px-3 py-1.5 rounded-full bg-pink-50 border border-pink-200 whitespace-nowrap"
              >
                現在地に設定
              </button>
            }
          />
        )}
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

      {/* Tag pin colors are now managed in the Tags tab */}

      {/* Data */}
      <SectionHeader icon={Database} title="データ管理" />
      <Card>
        <Row icon={Download}   label="データをエクスポート" sub="JSON形式でバックアップ"         onRowClick={onExport} />
        <Row icon={Upload}     label="データをインポート"   sub="JSONファイルから復元・マージ"   onRowClick={() => importRef.current?.click()} />
        <input ref={importRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        <Row icon={HardDrive}  label="使用ストレージ"       sub={`約 ${storageKB} KB 使用中`} />
        <Row icon={Trash2} label="全データを削除" danger onRowClick={() => setConfirmClear(true)} />
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
        <p className="text-xs text-gray-400 font-medium">旅日記</p>
        <p className="text-xs text-gray-300 mt-0.5">v{CHANGELOG[0].version}</p>
        <button
          onClick={() => { if (confirm('設定をリセットしますか？')) update({ ...DEFAULT_SETTINGS }) }}
          className="flex items-center gap-1.5 text-xs text-gray-300 mt-3 mx-auto"
        >
          <RotateCcw size={11} /> 設定をリセット
        </button>
      </div>

      {/* Custom confirm dialogs (replace native confirm() for iOS PWA compatibility) */}
      <ConfirmDialog
        open={confirmClear}
        message="すべての記録を削除しますか？&#10;この操作は取り消せません。"
        confirmLabel="全削除"
        onConfirm={() => { onClearAll(); setConfirmClear(false) }}
        onCancel={() => setConfirmClear(false)}
      />
      <ConfirmDialog
        open={importData !== null}
        message={`${importData?.length ?? 0} 件の記録をインポートしますか？\n既存データとマージされます。`}
        confirmLabel="インポート"
        danger={false}
        onConfirm={() => {
          if (importData) { onImport(importData) }
          setImportData(null)
        }}
        onCancel={() => setImportData(null)}
      />
    </div>
  )
}

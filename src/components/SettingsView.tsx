import { useRef } from 'react'
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 mb-2">{title}</p>
      <div className="bg-white mx-4 rounded-2xl overflow-hidden shadow-sm border border-pink-50">
        {children}
      </div>
    </div>
  )
}

function Row({
  icon, label, sub, right, onClick, danger,
}: {
  icon: string; label: string; sub?: string; right?: React.ReactNode; onClick?: () => void; danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0 text-left
        ${onClick ? 'active:bg-gray-50' : 'cursor-default'}
        ${danger ? 'text-red-400' : ''}`}
    >
      <span className="text-xl w-7 text-center">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${danger ? 'text-red-400' : 'text-gray-700'}`}>{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {right && <div className="text-gray-400 text-sm flex items-center">{right}</div>}
      {onClick && !right && <span className="text-gray-300 text-sm">›</span>}
    </button>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-pink-400' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
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
      } catch {
        alert('ファイルの読み込みに失敗しました')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Stats
  const totalEntries = entries.length
  const totalTags = new Set(entries.flatMap(e => e.tags)).size
  const totalPhotos = entries.reduce((s, e) => s + e.photos.length, 0)
  const storageKB = Math.round(JSON.stringify(entries).length / 1024)

  const displayName = settings.userName || 'ゲスト'

  return (
    <div className="pb-8 pt-2">
      {/* Profile header */}
      <div className="flex flex-col items-center py-5 mb-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-300 to-purple-300 flex items-center justify-center text-3xl mb-2 shadow-md">
          🌸
        </div>
        <p className="font-bold text-gray-700 text-base">{displayName}</p>
        <p className="text-xs text-gray-400 mt-0.5">{totalEntries} 件の思い出</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 px-4 mb-5">
        {[
          { icon: '📍', value: totalEntries, label: '記録' },
          { icon: '🏷️', value: totalTags,   label: 'タグ' },
          { icon: '🖼️', value: totalPhotos, label: '写真' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl py-3 text-center shadow-sm border border-pink-50">
            <p className="text-xl">{s.icon}</p>
            <p className="text-xl font-bold text-gray-700 leading-tight">{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* プロフィール設定 */}
      <Section title="👤 プロフィール">
        <div className="px-4 py-3.5 flex items-center gap-3 border-b border-gray-50">
          <span className="text-xl w-7 text-center">✏️</span>
          <input
            value={settings.userName}
            onChange={e => update({ userName: e.target.value })}
            placeholder="名前を入力"
            className="flex-1 text-sm text-gray-700 placeholder-gray-300 focus:outline-none bg-transparent"
          />
        </div>
      </Section>

      {/* 表示設定 */}
      <Section title="🎨 表示設定">
        <Row
          icon="📋" label="記録の表示形式"
          right={
            <div className="flex gap-1">
              {(['card', 'compact'] as ListStyle[]).map(v => (
                <button
                  key={v}
                  onClick={() => update({ listStyle: v })}
                  className={`text-xs px-2.5 py-1 rounded-full transition-colors ${settings.listStyle === v ? 'bg-pink-400 text-white' : 'bg-gray-100 text-gray-500'}`}
                >
                  {v === 'card' ? 'カード' : 'コンパクト'}
                </button>
              ))}
            </div>
          }
        />
        <Row
          icon="🕐" label="並び順のデフォルト"
          right={
            <div className="flex gap-1">
              {(['newest', 'oldest'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => update({ defaultSort: v })}
                  className={`text-xs px-2.5 py-1 rounded-full transition-colors ${settings.defaultSort === v ? 'bg-pink-400 text-white' : 'bg-gray-100 text-gray-500'}`}
                >
                  {v === 'newest' ? '新しい順' : '古い順'}
                </button>
              ))}
            </div>
          }
        />
        <Row
          icon="💡" label="ヒントを表示"
          sub="マップ上の「タップして記録を追加」"
          right={<Toggle value={settings.showHint} onChange={v => update({ showHint: v })} />}
        />
      </Section>

      {/* マップ設定 */}
      <Section title="🗺️ マップ設定">
        <Row icon="🎨" label="マップスタイル"
          right={
            <div className="flex gap-1">
              {(Object.keys(MAP_TILES) as MapStyle[]).map(k => (
                <button
                  key={k}
                  onClick={() => update({ mapStyle: k })}
                  className={`text-xs px-2 py-1 rounded-full transition-colors ${settings.mapStyle === k ? 'bg-pink-400 text-white' : 'bg-gray-100 text-gray-500'}`}
                >
                  {MAP_TILES[k].label}
                </button>
              ))}
            </div>
          }
        />
        <Row
          icon="📍" label="デフォルト表示位置"
          sub={`${settings.defaultLat.toFixed(3)}, ${settings.defaultLng.toFixed(3)}`}
          onClick={() => {
            navigator.geolocation.getCurrentPosition(
              pos => {
                update({ defaultLat: pos.coords.latitude, defaultLng: pos.coords.longitude })
                alert('✅ 現在地をデフォルト位置に設定しました')
              },
              () => alert('位置情報の取得に失敗しました')
            )
          }}
          right={<span className="text-xs text-pink-400">現在地に設定</span>}
        />
        <Row
          icon="🔭" label="デフォルトズーム"
          right={
            <div className="flex items-center gap-2">
              <button onClick={() => update({ defaultZoom: Math.max(5, settings.defaultZoom - 1) })}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold text-lg flex items-center justify-center">−</button>
              <span className="text-sm font-medium text-gray-700 w-5 text-center">{settings.defaultZoom}</span>
              <button onClick={() => update({ defaultZoom: Math.min(18, settings.defaultZoom + 1) })}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold text-lg flex items-center justify-center">+</button>
            </div>
          }
        />
      </Section>

      {/* データ管理 */}
      <Section title="💾 データ管理">
        <Row icon="📤" label="データをエクスポート" sub="JSON形式で保存" onClick={onExport} />
        <Row icon="📥" label="データをインポート" sub="JSONファイルから復元・マージ"
          onClick={() => importRef.current?.click()} />
        <input ref={importRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        <Row icon="💽" label="使用ストレージ" sub={`約 ${storageKB} KB 使用中`} />
        <Row icon="🗑️" label="全データを削除" danger onClick={() => {
          if (confirm('⚠️ すべての記録を削除しますか？\nこの操作は取り消せません。')) {
            if (confirm('本当に削除しますか？')) onClearAll()
          }
        }} />
      </Section>

      {/* バージョン情報 */}
      <Section title="📋 バージョン情報">
        {CHANGELOG.map((log, i) => (
          <div key={log.version} className={`px-4 py-3.5 ${i < CHANGELOG.length - 1 ? 'border-b border-gray-50' : ''}`}>
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
                <li key={c} className="text-xs text-gray-500">{c}</li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      {/* Footer */}
      <div className="text-center mt-2 mb-4">
        <p className="text-xs text-gray-300">旅日記 v1.2.0</p>
        <p className="text-xs text-gray-300 mt-0.5">Made with 🌸</p>
        <button
          onClick={() => {
            if (confirm('設定をリセットしますか？')) update({ ...DEFAULT_SETTINGS })
          }}
          className="text-xs text-gray-300 mt-3 underline"
        >
          設定をリセット
        </button>
      </div>
    </div>
  )
}

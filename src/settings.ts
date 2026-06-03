import { useState, useEffect } from 'react'

export type MapStyle = 'standard' | 'watercolor' | 'toner'
export type ListStyle = 'card' | 'compact'
export type SortOrder = 'newest' | 'oldest'

export type AppSettings = {
  userName: string
  defaultLat: number
  defaultLng: number
  defaultZoom: number
  mapStyle: MapStyle
  listStyle: ListStyle
  defaultSort: SortOrder
  showHint: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  userName: '',
  defaultLat: 35.6762,
  defaultLng: 139.6503,
  defaultZoom: 10,
  mapStyle: 'standard',
  listStyle: 'card',
  defaultSort: 'newest',
  showHint: true,
}

const KEY = 'travel-diary-settings'

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(s: AppSettings) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings)

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const update = (patch: Partial<AppSettings>) =>
    setSettings(prev => ({ ...prev, ...patch }))

  return { settings, update }
}

export const MAP_TILES: Record<MapStyle, { url: string; attribution: string; label: string }> = {
  standard: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    label: '標準',
  },
  watercolor: {
    url: 'https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg',
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>',
    label: '水彩画',
  },
  toner: {
    url: 'https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>',
    label: 'モノクロ',
  },
}

export const CHANGELOG = [
  {
    version: '1.4.0',
    date: '2026-06-04',
    title: 'アイコン刷新・星評価・バグ大修正',
    changes: [
      '🎨 フォーク＋日記テーマのオリジナルアイコン',
      '📲 PWAインストール対応（ホーム画面追加）',
      '⭐ 星評価機能（1〜5）',
      '📍 現在地から即追加ボタン（マップ上）',
      '🐛 設定の項目がタップできない問題を修正',
      '🐛 シートを閉じられない問題を修正',
      '🐛 マップ検索でスタックする問題を修正',
      '🐛 タブとシートの同期を全面修正',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-06-04',
    title: 'Lucideアイコン・新機能・バグ修正',
    changes: [
      '📅 カレンダービュー（月別記録一覧）',
      '🖼️ 写真ライトボックス（フルスクリーン表示）',
      '🔗 Web Share APIで記録をシェア',
      '🗺️ マップ上でタグ・検索フィルタリング',
      '🎨 絵文字をLucideアイコンに統一',
      '🐛 マップ設定変更の即時反映を修正',
      '🐛 タブとシートの同期ズレを修正',
      '🐛 インポート後の日付ソートを修正',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-06-04',
    title: '設定・インポート機能追加',
    changes: [
      '⚙️ 設定タブ追加（マップ・表示・データ管理）',
      '📊 統計情報ページ追加',
      '📥 JSONデータのインポート機能',
      '🗺️ マップスタイル切替（標準・水彩・モノクロ）',
      '📋 記録一覧の表示形式切替（カード/コンパクト）',
      '👤 ユーザー名設定',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-06-04',
    title: 'iPhone対応 UIリデザイン',
    changes: [
      '📱 iPhone専用レイアウト（フルスクリーンマップ）',
      '🎨 パステルカラーのかわいいデザイン',
      '🔽 ボトムシート（下から引き出す操作）',
      '🏷️ タグタブ追加（タグ一覧・絞り込み）',
      '🔍 検索・ソート機能',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-06-04',
    title: '初回リリース',
    changes: [
      '🗺️ OpenStreetMapでの地図表示',
      '📖 日記記録（タイトル・日付・メモ・タグ・写真）',
      '📍 マップピンで場所を記録',
      '🏷️ タグ付け・フィルタリング',
      '💾 ローカルストレージ保存',
      '📤 JSONエクスポート',
    ],
  },
]

import { useState, useEffect } from 'react'

export type MapStyle = 'roadmap' | 'satellite' | 'terrain'
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
  calendarSync: boolean   // iPhoneカレンダー連携
}

export const DEFAULT_SETTINGS: AppSettings = {
  userName: '',
  defaultLat: 35.6762,
  defaultLng: 139.6503,
  defaultZoom: 15,
  mapStyle: 'roadmap',
  listStyle: 'card',
  defaultSort: 'newest',
  showHint: true,
  calendarSync: false,
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

export const MAP_STYLES: Record<MapStyle, { label: string; mapTypeId: string }> = {
  roadmap:   { label: '標準',     mapTypeId: 'roadmap'   },
  satellite: { label: '衛星写真', mapTypeId: 'satellite' },
  terrain:   { label: '地形',     mapTypeId: 'terrain'   },
}

export const CHANGELOG = [
  {
    version: '1.7.1',
    date: '2026-06-04',
    title: 'バグ修正',
    changes: [
      '🐛 タブ切替時にシートが閉じない問題を修正',
      '🐛 全削除後にマップへ戻らない問題を修正',
      '📱 全タブにiPhone対応のセーフエリアヘッダーを追加',
      '📍 現在地ドットをより大きく・視認しやすく改善',
    ],
  },
  {
    version: '1.7.0',
    date: '2026-06-04',
    title: 'フルスクリーンタブ・グルメ機能強化',
    changes: [
      '📱 タブ切替をフルスクリーン表示に変更',
      '🔍 検索→マップ移動→紫ピンで選択式に変更',
      '🏷️ タグをプルダウン形式（折り畳み）に',
      '📅 iPhoneカレンダー連携 (.ics)',
      '☕ カフェボタン追加（紫マーカー）',
      '📍 現在地を青点滅ドットで表示',
      '🔭 デフォルトズームを15に変更',
    ],
  },
  {
    version: '1.6.1',
    date: '2026-06-04',
    title: 'タグタブ管理・UI改善',
    changes: [
      '🏷️ タグタブからタグを作成・削除できるように',
      '🗺️ マップタブ以外でGoogle Mapsを非表示に',
      '📍 日記カードに店舗名を目立つ表示',
    ],
  },
  {
    version: '1.6.0',
    date: '2026-06-04',
    title: 'グルメモード・タグ選択式・場所自動入力',
    changes: [
      '🍽️ グルメモード: 周辺飲食店をマップに表示',
      '📖 飲食店タップ → 日記作成（場所名自動入力）',
      '👁 記録ピンの表示/非表示トグル',
      '🏷️ タグを事前作成して選択式に変更',
      '📝 写真・評価・メモはすべて任意',
      '📍 検索を現在地から近い順に表示',
    ],
  },
  {
    version: '1.5.0',
    date: '2026-06-04',
    title: 'Google Maps に移行',
    changes: [
      '🗺️ OpenStreetMap → Google Maps に変更',
      '🛰️ マップスタイル: 標準・衛星写真・地形',
      '📍 Google Maps マーカー（ピンクカラー）',
      '⚡ マップ操作がよりスムーズに',
    ],
  },
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

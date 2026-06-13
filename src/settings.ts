import { useState, useEffect, useRef } from 'react'
import { getPositionCached } from './utils/geoCache'

// Prevent duplicate quota error alerts
let quotaErrorShownTime = 0
const showQuotaError = () => {
  const now = Date.now()
  if (now - quotaErrorShownTime > 2000) {
    quotaErrorShownTime = now
    alert('ストレージが満杯です。古い記録を削除してください。')
  }
}

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
  tagColors: Record<string, string>   // tag name → hex color
  useDefaultLocation: boolean  // whether to use defaultLat/defaultLng or current location
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
  tagColors: {},
  useDefaultLocation: true,
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
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      showQuotaError()  // Deduplicated alert
    } else if (import.meta.env.DEV) {
      console.error('Failed to save settings:', e)
    }
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings)
  const isFirstRender = useRef(true)
  const isInitializedRef = useRef(!!localStorage.getItem(KEY))

  // Auto-detect location on first install (no saved settings)
  // Only run this once, not every time localStorage is checked
  useEffect(() => {
    if (!isInitializedRef.current) {
      // First time: auto-detect location
      getPositionCached((lat, lng) => {
        setSettings(prev => {
          const updated = { ...prev, defaultLat: lat, defaultLng: lng }
          // Mark as initialized after first successful save
          isInitializedRef.current = true
          return updated
        })
      })
    }
  }, []) // run once on mount

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
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

export const TAG_PRESET_COLORS = [
  '#ec4899', // pink
  '#a855f7', // purple
  '#3b82f6', // blue
  '#22c55e', // green
  '#f97316', // orange
  '#14b8a6', // teal
  '#ef4444', // red
  '#eab308', // yellow
]

export const CHANGELOG = [
  {
    version: '2.1.5',
    date: '2026-06-13',
    title: '起動時の画面ずれを修正',
    changes: [
      '起動時にヘッダーがステータスバーに潜り込む不具合を修正（ステータスバー領域をOS側で確保）',
      '2.1.4で下部ナビが浮く原因になった暫定対応を撤回',
    ],
  },
  {
    version: '2.1.4',
    date: '2026-06-13',
    title: '場所候補の改善・起動時表示の再修正',
    changes: [
      '起動時に画面が上にずれる不具合を再修正（起動時に強制リフロー）',
      '写真の場所候補を「飲食店・カフェ」のみに絞り、近い順に表示するよう改善',
      '場所候補に閉じるボタンを追加',
    ],
  },
  {
    version: '2.1.3',
    date: '2026-06-13',
    title: '写真から場所候補・起動時表示の修正',
    changes: [
      'アプリ起動時に画面が上にずれる（下にスワイプすると直る）不具合を修正',
      '写真を追加すると、その写真の位置情報から周辺の場所候補を提案する機能を追加',
    ],
  },
  {
    version: '2.1.2',
    date: '2026-06-13',
    title: '計算・データ系バグ修正',
    changes: [
      '深夜0時〜9時に作成した記録の日付が前日になるバグを修正（UTC→ローカル日付）',
      'タグ名変更が記録に反映されず件数0・ピン色消失になるバグを修正',
      'タグ名を既存タグと同じ名前に変更すると重複が発生するバグを修正',
      'インポート時のデータ検証を強化（場所名なし等の古いデータでクラッシュしない）',
      'シートを素早くスワイプしても閉じない/位置がずれるバグを修正',
      '検索ボックスの候補ドロップダウンが二重に出る問題を修正',
      '日記リストの件数表示がモードをまたいで集計される問題を修正',
    ],
  },
  {
    version: '2.0.9',
    date: '2026-06-07',
    title: 'バグ修正・設定機能追加',
    changes: [
      '非表示バグ修正: 食べ物モード切り替え時に日記ピン非表示設定が上書きされる問題を解決',
      '写真追加時の固まるバグ修正: 画像圧縮を最適化（maxWidth 1200→800、quality 0.75→0.65）',
      'デフォルト位置設定: Settings で「デフォルト位置を使用」トグルを追加',
    ],
  },
  {
    version: '2.0.8',
    date: '2026-06-05',
    title: 'バグ修正',
    changes: [
      '訪問判定範囲の縮小を修正',
      '食べ物モード中のPOI非表示を修正',
    ],
  },
  {
    version: '2.0.7',
    date: '2026-06-05',
    title: 'バグ修正',
    changes: [
      'ピンク ピン履歴表示の修正',
      'Google Maps URL バグを修正',
    ],
  },
  {
    version: '2.0.6',
    date: '2026-06-05',
    title: '機能改善',
    changes: [
      '履歴表示を全タップに拡張',
    ],
  },
  {
    version: '2.0.5',
    date: '2026-06-05',
    title: '機能改善・バグ修正',
    changes: [
      '履歴即時表示機能を追加',
      'UX改善とバグ修正',
    ],
  },
  {
    version: '2.0.4',
    date: '2026-06-05',
    title: 'バグ修正',
    changes: [
      'POI非表示機能を修正',
      '履歴即時表示の修正',
    ],
  },
  {
    version: '2.0.3',
    date: '2026-06-05',
    title: 'バグ修正',
    changes: [
      'マップギャップを修正',
      'キーボードショートカットを削除',
      'その他バグ修正',
    ],
  },
  {
    version: '2.0.2',
    date: '2026-06-05',
    title: 'バグ修正',
    changes: [
      'レイアウト・位置情報・UIバグを修正',
    ],
  },
  {
    version: '2.0.1',
    date: '2026-06-05',
    title: 'バグ修正',
    changes: [
      'タグ表示を修正',
      'タグピン色をタグタブに移動',
    ],
  },
  {
    version: '2.0.0',
    date: '2026-06-05',
    title: '大型アップデート',
    changes: [
      'タブバーを画面固定に変更（スクロール追従バグ修正）',
      'メモ編集時にキーボードが閉じるバグを修正',
      '位置情報をキャッシュしてアクセス許可ポップアップを削減',
      '「ラーメン」などのキーワードで周辺店舗を一覧表示',
      '同じ店の過去記録をタップ時に表示・マップへジャンプ可能',
      'グルメモード中はGoogle地図のデフォルトPOIを非表示に',
      'タグごとにマップピンの色を設定できる機能を追加',
      'タグを上下ボタンで並び替え可能に',
      '絵文字をLucideアイコンに統一',
      '設定の初回デフォルト位置を現在地に自動設定',
    ],
  },
  {
    version: '1.9.1',
    date: '2026-06-05',
    title: 'バグ修正',
    changes: [
      'PlacesSearch: クリーンアップ関数の漏れを修正',
      'EntryForm: 座標表示が古い値のままになるバグを修正',
      'BottomSheet: スワイプ後にdragYがリセットされないバグを修正',
      'CalendarView: 月切替で日付選択がリセットされないバグを修正',
      'DiaryList: タブ切替でフィルターが残るバグを修正',
      'MapView: 食べ物モード切替時に古いピンが残るバグを修正',
      'store.ts: 初回マウント時の不要なlocalStorage書き込みを削除',
    ],
  },
  {
    version: '1.8.1',
    date: '2026-06-04',
    title: 'バグ修正',
    changes: [
      'PlaceNameInput: useMemo→useEffect に修正',
      '設定トグルのクリップ問題を修正',
      '行ってみたい記録を紫アクセントで視覚的に区別',
    ],
  },
  {
    version: '1.8.0',
    date: '2026-06-04',
    title: '大規模改善・新機能',
    changes: [
      'ピンタップ後キャンセルされるバグ修正',
      '日記選択時マップが背景に出る問題修正',
      '行ってみたいモード（紫ピン）',
      'タグ名変更・タグ一覧折り畳み',
      '場所名フィールドをGoogle Places検索対応に',
      'BottomSheetスワイプ閉じ対応',
    ],
  },
  {
    version: '1.7.0',
    date: '2026-06-04',
    title: 'フルスクリーンタブ・グルメ機能強化',
    changes: [
      'タブ切替をフルスクリーン表示に変更',
      '検索→マップ移動→紫ピンで選択式に変更',
      'タグをプルダウン形式に',
      'カフェボタン追加（紫マーカー）',
      '現在地を青点滅ドットで表示',
    ],
  },
  {
    version: '1.5.0',
    date: '2026-06-04',
    title: 'Google Maps に移行',
    changes: [
      'OpenStreetMap → Google Maps に変更',
      'マップスタイル: 標準・衛星写真・地形',
      'Google Maps マーカー（ピンクカラー）',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-06-04',
    title: '初回リリース',
    changes: [
      'マップでの場所記録',
      '日記機能（タイトル・日付・メモ・タグ・写真）',
      'タグ付け・フィルタリング',
      'ローカルストレージ保存',
    ],
  },
]

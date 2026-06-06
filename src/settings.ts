import { useState, useEffect, useRef } from 'react'
import { getPositionCached } from './utils/geoCache'

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
  localStorage.setItem(KEY, JSON.stringify(s))
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings)
  const isFirstRender = useRef(true)

  // Auto-detect location on first install (no saved settings)
  useEffect(() => {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      getPositionCached((lat, lng) => {
        setSettings(prev => ({ ...prev, defaultLat: lat, defaultLng: lng }))
      })
    }
  }, []) // run once

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

import { useState, useEffect, useRef } from 'react'
import type { Entry } from './types'
import { idbGet, idbSet } from './utils/idb'

// ── Error handling ────────────────────────────────────────────
let quotaErrorShownTime = 0
const showQuotaError = () => {
  const now = Date.now()
  if (now - quotaErrorShownTime > 2000) {  // Show only once per 2 seconds
    quotaErrorShownTime = now
    alert('ストレージが満杯です。古い記録を削除してください。')
  }
}

// ── Entries ──────────────────────────────────────────────────
const ENTRIES_KEY = 'travel-diary-entries'

export function loadEntries(): Entry[] {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>([])
  const loadedRef = useRef(false)

  // Initial load from IndexedDB, with one-time migration from the old
  // localStorage store. Photos live inline as data URLs, which used to blow the
  // localStorage quota — IndexedDB holds far more, so saves no longer fail.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        let data = await idbGet<Entry[]>(ENTRIES_KEY)
        if (!Array.isArray(data)) {
          // Migrate existing data from localStorage (kept intact as a backup).
          const legacy = loadEntries()
          if (legacy.length) await idbSet(ENTRIES_KEY, legacy)
          data = legacy
        }
        if (!cancelled) setEntries(Array.isArray(data) ? data : [])
      } catch {
        // IndexedDB unavailable (e.g. private mode) — fall back to localStorage
        if (!cancelled) setEntries(loadEntries())
      } finally {
        if (!cancelled) loadedRef.current = true
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Persist to IndexedDB whenever entries change (after the initial load).
  useEffect(() => {
    if (!loadedRef.current) return
    idbSet(ENTRIES_KEY, entries).catch(e => {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        showQuotaError()
      } else if (import.meta.env.DEV) {
        console.error('Failed to save entries to IndexedDB:', e)
      }
    })
  }, [entries])

  const addEntry = (entry: Entry) => setEntries(prev => [entry, ...prev])
  const updateEntry = (updated: Entry) =>
    setEntries(prev => prev.map(e => (e.id === updated.id ? updated : e)))
  const deleteEntry = (id: string) =>
    setEntries(prev => prev.filter(e => e.id !== id))

  return { entries, setEntries, addEntry, updateEntry, deleteEntry }
}

// ── Global Tags ───────────────────────────────────────────────
const TAGS_KEY = 'travel-diary-tags'

const DEFAULT_TAGS = ['グルメ', 'カフェ', '旅行', '観光', '買い物', '日常', 'ランチ', 'ディナー']

export function loadGlobalTags(): string[] {
  try {
    const raw = localStorage.getItem(TAGS_KEY)
    if (raw) return JSON.parse(raw)
    // First time: seed with default tags
    localStorage.setItem(TAGS_KEY, JSON.stringify(DEFAULT_TAGS))
    return DEFAULT_TAGS
  } catch { return DEFAULT_TAGS }
}

export function useGlobalTags() {
  const [tags, setTags] = useState<string[]>(loadGlobalTags)
  const isFirstTagRender = useRef(true)

  useEffect(() => {
    if (isFirstTagRender.current) { isFirstTagRender.current = false; return }
    try {
      localStorage.setItem(TAGS_KEY, JSON.stringify(tags))
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        showQuotaError()  // Deduplicated alert
      } else if (import.meta.env.DEV) {
        console.error('Failed to save tags:', e)
      }
    }
  }, [tags])

  const addTag = (name: string) => {
    const t = name.trim()
    if (!t || tags.includes(t)) return
    setTags(prev => [...prev, t])
  }

  const removeTag = (name: string) =>
    setTags(prev => prev.filter(t => t !== name))

  const reorderTag = (from: number, to: number) => {
    setTags(prev => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  return { tags, addTag, removeTag, reorderTag, setTags }
}

import { useState, useEffect } from 'react'
import type { Entry } from './types'

// ── Entries ──────────────────────────────────────────────────
const ENTRIES_KEY = 'travel-diary-entries'

export function loadEntries(): Entry[] {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>(loadEntries)

  useEffect(() => {
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries))
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

  useEffect(() => {
    localStorage.setItem(TAGS_KEY, JSON.stringify(tags))
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

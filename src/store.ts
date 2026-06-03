import { useState, useEffect } from 'react'
import type { Entry } from './types'

const KEY = 'travel-diary-entries'

export function loadEntries(): Entry[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveEntries(entries: Entry[]) {
  localStorage.setItem(KEY, JSON.stringify(entries))
}

export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>(loadEntries)

  useEffect(() => {
    saveEntries(entries)
  }, [entries])

  const addEntry = (entry: Entry) => setEntries(prev => [entry, ...prev])

  const updateEntry = (updated: Entry) =>
    setEntries(prev => prev.map(e => (e.id === updated.id ? updated : e)))

  const deleteEntry = (id: string) =>
    setEntries(prev => prev.filter(e => e.id !== id))

  return { entries, addEntry, updateEntry, deleteEntry }
}

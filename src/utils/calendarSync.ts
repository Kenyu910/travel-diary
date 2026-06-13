import type { Entry } from '../types'

/** Create an .ics calendar event string for an entry */
// RFC 5545 TEXT escaping. Order matters: backslash FIRST, newline LAST —
// escaping \n before \ double-escaped the backslash, so memos showed a
// literal "\n" in the calendar app instead of a line break.
function escapeICS(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/[,;]/g, '\\$&').replace(/\n/g, '\\n')
}

function createICS(entry: Entry): string {
  const dateStr = entry.date.replace(/-/g, '')
  // All-day DTEND is exclusive per RFC 5545 — must be the NEXT day
  const [y, m, d] = entry.date.split('-').map(Number)
  const end = new Date(y, (m || 1) - 1, (d || 1) + 1)
  const endStr = `${end.getFullYear()}${String(end.getMonth() + 1).padStart(2, '0')}${String(end.getDate()).padStart(2, '0')}`
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const title = escapeICS(entry.title)
  const place = escapeICS(entry.placeName)
  const body = escapeICS(entry.body || '')

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//旅日記//JP',
    'BEGIN:VEVENT',
    `UID:${entry.id}@travel-diary`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${dateStr}`,
    `DTEND;VALUE=DATE:${endStr}`,
    `SUMMARY:${title}`,
    place ? `LOCATION:${place}` : '',
    body ? `DESCRIPTION:${body}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')
}

/** Add a single entry to the iPhone Calendar via .ics download */
export function addEntryToCalendar(entry: Entry): void {
  const ics = createICS(entry)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${entry.title.slice(0, 30)}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

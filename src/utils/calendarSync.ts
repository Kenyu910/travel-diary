import type { Entry } from '../types'

/** Create an .ics calendar event string for an entry */
function createICS(entry: Entry): string {
  const dateStr = entry.date.replace(/-/g, '')
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const title = entry.title.replace(/[,;\\]/g, '\\$&')
  const place = entry.placeName.replace(/[,;\\]/g, '\\$&')
  const body = (entry.body || '').replace(/\n/g, '\\n').replace(/[,;\\]/g, '\\$&')

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//旅日記//JP',
    'BEGIN:VEVENT',
    `UID:${entry.id}@travel-diary`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${dateStr}`,
    `DTEND;VALUE=DATE:${dateStr}`,
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

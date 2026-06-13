/**
 * Local-timezone date string (YYYY-MM-DD).
 * toISOString() returns UTC — in JST that yields the PREVIOUS day between
 * 00:00 and 08:59, so entries created after midnight got the wrong date.
 */
export function todayLocalISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

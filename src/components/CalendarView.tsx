import { useState } from 'react'
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import type { Entry } from '../types'

type Props = {
  entries: Entry[]
  onSelectEntry: (entry: Entry) => void
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

export function CalendarView({ entries, onSelectEntry }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  // Build date → entries map
  const entryMap = new Map<string, Entry[]>()
  entries.forEach(e => {
    if (!entryMap.has(e.date)) entryMap.set(e.date, [])
    entryMap.get(e.date)!.push(e)
  })

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  const todayStr = today.toISOString().slice(0, 10)

  // Entries in this month
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthEntries = entries
    .filter(e => e.date.startsWith(monthPrefix))
    .sort((a, b) => b.date.localeCompare(a.date))

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const selectedEntries = selectedDate ? (entryMap.get(selectedDate) ?? []) : monthEntries

  return (
    <div className="px-4 pt-2 pb-6">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200">
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-base font-bold text-gray-700">{year}年 {MONTHS[month]}</h2>
        <button onClick={nextMonth} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div key={d} className={`text-center text-xs font-medium py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-y-1 mb-5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayEntries = entryMap.get(dateStr) ?? []
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDate
          const dow = i % 7

          return (
            <button
              key={i}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              className={`relative flex flex-col items-center py-1 rounded-xl transition-colors
                ${isSelected ? 'bg-pink-400' : isToday ? 'bg-pink-50' : 'hover:bg-gray-50'}
              `}
            >
              <span className={`text-sm leading-none ${
                isSelected ? 'text-white font-bold' :
                isToday ? 'text-pink-500 font-bold' :
                dow === 0 ? 'text-red-400' :
                dow === 6 ? 'text-blue-400' :
                'text-gray-700'
              }`}>
                {day}
              </span>
              {dayEntries.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEntries.slice(0, 3).map((_, j) => (
                    <div key={j} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-pink-400'}`} />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Entry list for selected date or month */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          {selectedDate ? selectedDate : `${MONTHS[month]}の記録`}
          <span className="ml-1 font-normal">({selectedEntries.length}件)</span>
        </p>

        {selectedEntries.length === 0 ? (
          <div className="text-center py-8 text-gray-300 text-sm">この月の記録はありません</div>
        ) : (
          <div className="flex flex-col gap-2">
            {selectedEntries.map(entry => (
              <button
                key={entry.id}
                onClick={() => onSelectEntry(entry)}
                className="text-left flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border border-pink-50 active:scale-[0.98]"
              >
                {entry.photos.length > 0
                  ? <img src={entry.photos[0]} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  : <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                      <MapPin size={18} className="text-pink-400" />
                    </div>
                }
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">{entry.title}</p>
                  <p className="text-xs text-gray-400 truncate">{entry.date}{entry.placeName && ` · ${entry.placeName}`}</p>
                  {entry.tags.length > 0 && (
                    <p className="text-xs text-purple-400 truncate">{entry.tags.map(t => `#${t}`).join(' ')}</p>
                  )}
                </div>
                <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

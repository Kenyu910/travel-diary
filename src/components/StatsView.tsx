import { useMemo } from 'react'
import { TrendingUp, Star, MapPin, Tag as TagIcon } from 'lucide-react'
import type { Entry } from '../types'

type Props = { entries: Entry[] }

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

export function StatsView({ entries }: Props) {
  const stats = useMemo(() => {
    // Only count actual visited diary entries (exclude 行きたい wishlist)
    const diary = entries.filter(e => !e.wantToVisit)
    const now = new Date()
    const thisYear = now.getFullYear()
    const thisYearCount = diary.filter(e => e.date.startsWith(String(thisYear))).length

    // Average rating over rated entries only
    const rated = diary.filter(e => (e.rating ?? 0) > 0)
    const avgRating = rated.length
      ? rated.reduce((s, e) => s + (e.rating ?? 0), 0) / rated.length
      : 0

    // Top tags by usage
    const tagCounts = new Map<string, number>()
    diary.forEach(e => e.tags.forEach(t => tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)))
    const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

    // Most visited place (by place name)
    const placeCounts = new Map<string, number>()
    diary.forEach(e => {
      const name = e.placeName.trim()
      if (name) placeCounts.set(name, (placeCounts.get(name) ?? 0) + 1)
    })
    const topPlaces = [...placeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)

    // Last 6 months counts (oldest → newest)
    const months: { label: string; key: string; count: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(thisYear, now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months.push({ label: MONTH_LABELS[d.getMonth()], key, count: 0 })
    }
    diary.forEach(e => {
      const m = months.find(mo => e.date.startsWith(mo.key))
      if (m) m.count++
    })
    const maxMonth = Math.max(1, ...months.map(m => m.count))

    return { total: diary.length, thisYearCount, avgRating, rated: rated.length, topTags, topPlaces, months, maxMonth }
  }, [entries])

  if (stats.total === 0) {
    return (
      <p className="text-center text-sm text-gray-300 py-6">記録が増えるとここに統計が表示されます</p>
    )
  }

  return (
    <div className="mx-4 flex flex-col gap-3">
      {/* Headline numbers */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="flex items-center gap-1 text-xs text-gray-400 mb-1"><TrendingUp size={12} /> 今年の記録</p>
          <p className="text-2xl font-bold text-pink-500">{stats.thisYearCount}<span className="text-sm font-normal text-gray-400 ml-1">件</span></p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="flex items-center gap-1 text-xs text-gray-400 mb-1"><Star size={12} /> 平均評価</p>
          <p className="text-2xl font-bold text-amber-500">
            {stats.avgRating ? stats.avgRating.toFixed(1) : '—'}
            <span className="text-sm font-normal text-gray-400 ml-1">{stats.rated > 0 ? `(${stats.rated}件)` : ''}</span>
          </p>
        </div>
      </div>

      {/* Monthly bar chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-400 mb-3">月別の記録（直近6ヶ月）</p>
        <div className="flex items-end justify-between gap-2 h-24">
          {stats.months.map(m => (
            <div key={m.key} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
              <span className="text-[10px] text-gray-400">{m.count > 0 ? m.count : ''}</span>
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-pink-300 to-rose-300"
                style={{ height: `${Math.max(4, (m.count / stats.maxMonth) * 100)}%` }}
              />
              <span className="text-[10px] text-gray-400">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top tags */}
      {stats.topTags.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="flex items-center gap-1 text-xs font-semibold text-gray-400 mb-2"><TagIcon size={12} /> よく使うタグ</p>
          <div className="flex flex-col gap-1.5">
            {stats.topTags.map(([tag, count]) => (
              <div key={tag} className="flex items-center gap-2">
                <span className="text-xs text-purple-500 w-20 truncate">#{tag}</span>
                <div className="flex-1 h-2 bg-purple-50 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-400 rounded-full" style={{ width: `${(count / stats.topTags[0][1]) * 100}%` }} />
                </div>
                <span className="text-xs text-gray-400 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Most visited places */}
      {stats.topPlaces.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="flex items-center gap-1 text-xs font-semibold text-gray-400 mb-2"><MapPin size={12} /> よく行く場所</p>
          <div className="flex flex-col gap-1.5">
            {stats.topPlaces.map(([place, count], i) => (
              <div key={place} className="flex items-center gap-2">
                <span className="text-xs font-bold text-pink-400 w-4">{i + 1}</span>
                <span className="flex-1 text-sm text-gray-700 truncate">{place}</span>
                <span className="text-xs text-gray-400">{count}回</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

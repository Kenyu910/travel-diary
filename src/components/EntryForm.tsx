import { useState, useRef, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Calendar, MapPin, FileText, Tag, Image, Save, Plus, Star, Loader2, X, Bookmark, LocateFixed } from 'lucide-react'
import { extractPhotoMeta } from '../utils/exifGps'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { StarRating } from './StarRating'
import { compressImage } from '../utils/compressImage'
import { useGlobalTags } from '../store'
import { getCachedGeo } from '../utils/geoCache'
import { todayLocalISO } from '../utils/localDate'
import type { Entry } from '../types'

type Props = {
  lat: number
  lng: number
  onSave: (entry: Entry) => void
  onCancel: () => void
  initial?: Entry
  defaultPlaceName?: string
}

function PlaceNameInput({ value, onChange, biasLocation }: {
  value: string
  onChange: (v: string, lat?: number, lng?: number) => void
  /** Prefer this location (e.g. the added photo's GPS) for search bias */
  biasLocation?: { lat: number; lng: number } | null
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const acRef = useRef<any>(null)
  const placesLib = useMapsLibrary('places')
  const win = window as any

  // Memoize onChange to prevent listener accumulation on every render
  const memoizedOnChange = useCallback(onChange, [onChange])

  useEffect(() => {
    if (!placesLib || !inputRef.current) return
    const G = win.google?.maps
    if (!G) return

    const ac = new placesLib.Autocomplete(inputRef.current, {
      fields: ['geometry', 'name', 'formatted_address'],
      componentRestrictions: { country: 'jp' },
    })
    acRef.current = ac
    const listener = ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      const loc = place.geometry?.location
      if (loc) {
        memoizedOnChange(place.name || place.formatted_address || '', loc.lat(), loc.lng())
      }
    })
    return () => {
      try { G?.event?.removeListener(listener) } catch { /* ignore */ }
      acRef.current = null
    }
  }, [placesLib, memoizedOnChange])

  // Bias search toward the photo's GPS when available, otherwise the cached
  // location. Re-applies when the photo location arrives. Uses cache only — no
  // permission prompt just from opening the form.
  useEffect(() => {
    const ac = acRef.current
    const G = win.google?.maps
    if (!ac || !G) return
    const loc = biasLocation ?? getCachedGeo()
    if (!loc) return
    const d = 0.05
    ac.setBounds(new G.LatLngBounds(
      new G.LatLng(loc.lat - d, loc.lng - d),
      new G.LatLng(loc.lat + d, loc.lng + d)
    ))
  }, [biasLocation, placesLib])

  return (
    <div className="relative">
      <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-8 pr-3 py-3 focus:outline-none focus:ring-2 focus:ring-pink-200"
        placeholder="場所を検索または入力..."
        autoComplete="off"
      />
    </div>
  )
}

export function EntryForm({ lat, lng, onSave, onCancel: _, initial, defaultPlaceName }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const [date, setDate] = useState(initial?.date ?? todayLocalISO())
  // Once the user picks a date manually, EXIF auto-fill must not override it
  const dateEditedRef = useRef(false)
  const [placeName, setPlaceName] = useState(initial?.placeName ?? defaultPlaceName ?? '')
  const [wantToVisit, setWantToVisit] = useState(initial?.wantToVisit ?? false)
  const [formLat, setFormLat] = useState(lat)
  const [formLng, setFormLng] = useState(lng)
  // Track if user has manually edited the place name field
  // If they have, GPS auto-fill should NOT overwrite their input
  const [placeNameEdited, setPlaceNameEdited] = useState(!!initial?.placeName || !!defaultPlaceName)
  const hasReceivedInitialNameRef = useRef(!!defaultPlaceName)

  // Bug fix: sync defaultPlaceName when GPS resolves ONLY if user hasn't typed manually
  // Only apply GPS result once per mount to prevent race conditions
  useEffect(() => {
    if (!initial && defaultPlaceName && !hasReceivedInitialNameRef.current && !placeNameEdited) {
      setPlaceName(defaultPlaceName)
      hasReceivedInitialNameRef.current = true
    }
  }, [defaultPlaceName, initial])
  // Sync lat/lng from parent when position updates (new entry only)
  useEffect(() => {
    if (!initial) { setFormLat(lat); setFormLng(lng) }
  }, [lat, lng, initial])
  const [selectedTags, setSelectedTags] = useState<string[]>(initial?.tags ?? [])
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [newTagInput, setNewTagInput] = useState('')
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? [])
  const [rating, setRating] = useState<number>(initial?.rating ?? 0)
  const [compressing, setCompressing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Place suggestions derived from the photo's EXIF GPS location
  type PlaceSuggestion = { name: string; lat: number; lng: number; vicinity: string; d: number }
  const [photoPlaces, setPhotoPlaces] = useState<PlaceSuggestion[]>([])
  const [photoPlacesLoading, setPhotoPlacesLoading] = useState(false)
  // The added photo's GPS — used to bias the place-name search to that area
  const [photoGps, setPhotoGps] = useState<{ lat: number; lng: number } | null>(null)
  const placesLib = useMapsLibrary('places')
  const placesDivRef = useRef<HTMLDivElement | null>(null)

  const { tags: globalTags, addTag: addGlobalTag } = useGlobalTags()

  /**
   * Look up nearby restaurants & cafés at the photo's GPS location and offer
   * them as place candidates. Searches both types ranked by distance, then
   * merges and re-sorts by true distance so the closest spot is on top.
   */
  const suggestPlacesFromGps = useCallback((lat: number, lng: number) => {
    if (!placesLib || !placesDivRef.current) return
    setPhotoPlacesLoading(true)
    const service = new placesLib.PlacesService(placesDivRef.current)
    const RankBy = (window as any).google?.maps?.places?.RankBy

    const searchType = (type: 'restaurant' | 'cafe') =>
      new Promise<any[]>(resolve => {
        // rankBy DISTANCE returns the nearest first (no radius allowed);
        // fall back to a tight radius if the enum isn't available.
        const req: any = RankBy
          ? { location: { lat, lng }, rankBy: RankBy.DISTANCE, type }
          : { location: { lat, lng }, radius: 150, type }
        service.nearbySearch(req, (results: any, status: any) =>
          resolve(status === 'OK' && results ? results : []))
      })

    Promise.all([searchType('restaurant'), searchType('cafe')]).then(lists => {
      setPhotoPlacesLoading(false)
      const merged = new Map<string, PlaceSuggestion>()
      for (const p of [...lists[0], ...lists[1]]) {
        if (!p.place_id || merged.has(p.place_id)) continue
        const plat = p.geometry.location.lat()
        const plng = p.geometry.location.lng()
        merged.set(p.place_id, {
          name: p.name,
          lat: plat,
          lng: plng,
          vicinity: p.vicinity || '',
          d: (plat - lat) ** 2 + (plng - lng) ** 2,
        })
      }
      const sorted = [...merged.values()].sort((a, b) => a.d - b.d).slice(0, 6)
      if (sorted.length) {
        setPhotoPlaces(sorted)
      } else {
        // No food spots nearby — still keep the photo's coordinates
        setPhotoPlaces([])
        setFormLat(lat)
        setFormLng(lng)
      }
    })
  }, [placesLib])

  const applySuggestion = (s: PlaceSuggestion) => {
    setPlaceName(s.name)
    setPlaceNameEdited(true)
    setFormLat(s.lat)
    setFormLng(s.lng)
    setPhotoPlaces([])
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const handleAddNewTag = () => {
    const t = newTagInput.trim()
    if (!t) return
    addGlobalTag(t)
    setSelectedTags(prev => prev.includes(t) ? prev : [...prev, t])
    setNewTagInput('')
  }

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    e.target.value = ''
    setCompressing(true)

    // Read EXIF from the ORIGINAL files (compression strips metadata).
    // First photo with a location → place candidates; first with a capture
    // date → auto-fill the date (new entries only, unless the user edited it).
    ;(async () => {
      let gotPlace = false, gotDate = false
      for (const file of files) {
        const meta = await extractPhotoMeta(file)
        if (!meta) continue
        if (!gotPlace && meta.lat !== undefined && meta.lng !== undefined) {
          setPhotoGps({ lat: meta.lat, lng: meta.lng })  // bias place search to the photo
          suggestPlacesFromGps(meta.lat, meta.lng); gotPlace = true
        }
        if (!gotDate && meta.date && !initial && !dateEditedRef.current) {
          setDate(meta.date); gotDate = true
        }
        if (gotPlace && gotDate) break
      }
    })()

    try {
      const compressed: string[] = []
      for (const file of files) {
        const result = await compressImage(file)
        compressed.push(result)
      }
      // Batch update: only call setPhotos once after all files are processed
      // Use functional update to ensure race-condition safety
      setPhotos(prev => {
        // Ensure we're not adding duplicates if async operations raced
        const newPhotos = [...prev, ...compressed]
        return newPhotos
      })
    } catch (e) {
      alert(`写真の処理に失敗しました。${e instanceof Error ? e.message : ''}`)
    } finally {
      setCompressing(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Auto-title if empty: use placeName, date, or default
    const finalTitle = title.trim()
      || placeName.trim()
      || (wantToVisit ? '行ってみたい場所' : `記録 ${date}`)
    onSave({
      id: initial?.id ?? uuidv4(),
      title: finalTitle, body, date, lat: formLat, lng: formLng,
      placeName, tags: selectedTags, photos, rating, wantToVisit,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col px-5 pt-1 pb-8 gap-4">

      {/* Title */}
      <div>
        <label className="text-xs font-semibold text-gray-400 mb-1.5 block">タイトル（省略可）</label>
        <input
          value={title} onChange={e => setTitle(e.target.value)}
          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-200"
          placeholder="タイトル（省略可）"
        />
      </div>

      {/* Date */}
      <div>
        <label className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
          <Calendar size={11} /> 日付
        </label>
        <input
          type="date" value={date} onChange={e => { dateEditedRef.current = true; setDate(e.target.value) }}
          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-pink-200"
        />
      </div>

      {/* Place — searchable */}
      <div>
        <label className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
          <MapPin size={11} /> 場所名
          {defaultPlaceName && !initial && (
            <span className="flex items-center gap-0.5 text-[10px] text-pink-400 ml-1"><LocateFixed size={9} /> 自動入力</span>
          )}
        </label>
        <PlaceNameInput
          value={placeName}
          biasLocation={photoGps}
          onChange={(v, newLat, newLng) => {
            // Mark as manually edited so GPS auto-fill doesn't overwrite
            setPlaceNameEdited(true)
            setPlaceName(v)
            if (newLat !== undefined) setFormLat(newLat)
            if (newLng !== undefined) setFormLng(newLng)
          }}
        />

        {/* Place candidates from the photo's GPS location */}
        {(photoPlacesLoading || photoPlaces.length > 0) && (
          <div className="mt-2 bg-pink-50 border border-pink-100 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="flex items-center gap-1 text-[11px] font-semibold text-pink-500">
                <Image size={11} /> 写真の場所の候補
                {photoPlacesLoading && <Loader2 size={11} className="animate-spin" />}
              </p>
              <button
                type="button"
                onClick={() => { setPhotoPlaces([]); setPhotoPlacesLoading(false) }}
                className="w-5 h-5 rounded-full bg-pink-100 text-pink-400 flex items-center justify-center flex-shrink-0 active:bg-pink-200"
                aria-label="候補を閉じる"
              >
                <X size={11} />
              </button>
            </div>
            {photoPlaces.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {photoPlaces.map((s, i) => (
                  <button
                    key={`${s.name}-${i}`}
                    type="button"
                    onClick={() => applySuggestion(s)}
                    className="text-left flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-pink-100 active:scale-[0.98] transition-transform"
                  >
                    <MapPin size={13} className="text-pink-400 flex-shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-gray-800 truncate">{s.name}</span>
                      {s.vicinity && <span className="block text-[11px] text-gray-400 truncate">{s.vicinity}</span>}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden host element for Google PlacesService */}
      <div ref={placesDivRef} className="hidden" />

      {/* Want to visit toggle */}
      <div className="flex items-center justify-between bg-purple-50 rounded-2xl px-4 py-3 border border-purple-100">
        <div className="flex items-center gap-2">
          <Bookmark size={16} className={wantToVisit ? 'text-purple-500' : 'text-gray-400'} />
          <div>
            <p className="text-sm font-medium text-gray-700">行ってみたい</p>
            <p className="text-xs text-gray-400">紫ピンでマップに表示</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setWantToVisit(v => !v)}
          style={{
            position: 'relative', width: 44, height: 26, borderRadius: 13,
            background: wantToVisit ? '#a855f7' : '#d1d5db',
            border: 'none', cursor: 'pointer', flexShrink: 0,
            transition: 'background 0.2s', outline: 'none',
          }}
        >
          <span style={{
            position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%',
            background: 'white', left: wantToVisit ? 21 : 3,
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          }} />
        </button>
      </div>

      {/* Tags — collapsible dropdown */}
      <div>
        <label className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
          <Tag size={11} /> タグ（任意）
        </label>
        {/* Selected tags display */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selectedTags.map(tag => (
              <span key={tag} className="flex items-center gap-1 bg-purple-400 text-white text-sm px-3 py-1 rounded-full">
                #{tag}
                <button type="button" onClick={() => toggleTag(tag)}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
        {/* Toggle dropdown */}
        <button
          type="button"
          onClick={() => setShowTagPicker(v => !v)}
          className="flex items-center gap-2 text-sm text-purple-500 px-3 py-2 bg-purple-50 rounded-2xl border border-purple-200 w-full"
        >
          <Tag size={13} />
          <span>{showTagPicker ? 'タグを閉じる ▲' : 'タグを選択 ▼'}</span>
        </button>
        {/* Dropdown tag picker */}
        {showTagPicker && (
          <div className="mt-2 bg-white border border-gray-100 rounded-2xl p-3 shadow-sm">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {globalTags.map(tag => (
                <button
                  key={tag} type="button" onClick={() => toggleTag(tag)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-purple-400 text-white border-purple-400'
                      : 'bg-white text-purple-500 border-purple-200'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-1">
              <input
                value={newTagInput}
                onChange={e => setNewTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewTag() } }}
                className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200"
                placeholder="新しいタグを追加..."
              />
              <button type="button" onClick={handleAddNewTag}
                className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-500 flex items-center justify-center">
                <Plus size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Rating */}
      <div>
        <label className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
          <Star size={11} /> 評価（任意）
        </label>
        <StarRating value={rating} onChange={setRating} size={28} />
      </div>

      {/* Memo */}
      <div>
        <label className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
          <FileText size={11} /> メモ（任意）
        </label>
        <textarea
          value={body} onChange={e => setBody(e.target.value)} rows={4}
          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 resize-none"
          placeholder="今日の出来事、感想、メモ..."
        />
      </div>

      {/* Photos — optional */}
      <div>
        <label className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
          <Image size={11} /> 写真（任意）
        </label>
        <button
          type="button"
          onClick={() => !compressing && fileRef.current?.click()}
          disabled={compressing}
          className={`w-full py-3 border-2 border-dashed rounded-2xl text-sm flex items-center justify-center gap-2 transition-colors ${
            compressing
              ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
              : 'border-pink-200 text-pink-400 bg-pink-50'
          }`}
        >
          {compressing
            ? <><Loader2 size={15} className="animate-spin" /> 処理中...</>
            : <><Plus size={15} /> 写真を追加</>
          }
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhoto} className="hidden" />
        {photos.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {photos.map((p, i) => (
              <div key={i} className="relative">
                <img src={p} className="w-20 h-20 object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-400 text-white rounded-full flex items-center justify-center shadow"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-300 text-center">{formLat.toFixed(5)}, {formLng.toFixed(5)}</p>

      <button type="submit" disabled={compressing}
        className={`w-full py-4 rounded-2xl font-semibold shadow-md flex items-center justify-center gap-2 transition-transform ${
          compressing
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-pink-400 to-rose-400 text-white shadow-pink-100 active:scale-95'
        }`}>
        <Save size={18} /> {compressing ? '処理中...' : '保存する'}
      </button>
    </form>
  )
}

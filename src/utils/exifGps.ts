export type PhotoMeta = {
  lat?: number
  lng?: number
  /** Capture date as YYYY-MM-DD (local interpretation of EXIF DateTimeOriginal) */
  date?: string
}

/**
 * Minimal, dependency-free EXIF extractor for JPEG files.
 * Reads the GPS location and the capture date (DateTimeOriginal) so we can
 * suggest where/when a photo was taken. Returns null for non-JPEGs or any
 * parse error.
 *
 * NOTE: must run on the ORIGINAL File — image compression strips EXIF.
 */
export async function extractPhotoMeta(file: File): Promise<PhotoMeta | null> {
  // Only JPEG carries the EXIF block we parse here
  if (!/jpe?g$/i.test(file.type) && !/\.jpe?g$/i.test(file.name)) return null

  try {
    // EXIF lives in the APP1 segment near the start — 256KB is plenty
    const head = file.slice(0, 256 * 1024)
    const buf = await head.arrayBuffer()
    const view = new DataView(buf)

    // JPEG SOI
    if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null

    let offset = 2
    // Walk JPEG markers to find APP1 (0xFFE1)
    while (offset + 4 < view.byteLength) {
      const marker = view.getUint16(offset)
      const size = view.getUint16(offset + 2)
      if (marker === 0xffe1) {
        return parseApp1(view, offset + 4)
      }
      // Not a standalone marker — advance past this segment
      if ((marker & 0xff00) !== 0xff00) break
      offset += 2 + size
    }
    return null
  } catch {
    return null
  }
}

/** Backwards-compatible GPS-only helper */
export async function extractGps(file: File): Promise<{ lat: number; lng: number } | null> {
  const meta = await extractPhotoMeta(file)
  return meta && meta.lat !== undefined && meta.lng !== undefined
    ? { lat: meta.lat, lng: meta.lng }
    : null
}

function readAscii(view: DataView, offset: number, count: number): string {
  let s = ''
  for (let i = 0; i < count; i++) {
    const o = offset + i
    if (o >= view.byteLength) break
    const c = view.getUint8(o)
    if (c === 0) break
    s += String.fromCharCode(c)
  }
  return s
}

/** EXIF "YYYY:MM:DD HH:MM:SS" → "YYYY-MM-DD", or undefined if invalid */
function exifDateToISO(s: string): string | undefined {
  const m = s.match(/^(\d{4}):(\d{2}):(\d{2})/)
  if (!m) return undefined
  const [, y, mo, d] = m
  if (mo < '01' || mo > '12' || d < '01' || d > '31') return undefined
  return `${y}-${mo}-${d}`
}

function parseApp1(view: DataView, start: number): PhotoMeta | null {
  // "Exif\0\0"
  if (start + 6 > view.byteLength) return null
  if (view.getUint32(start) !== 0x45786966 || view.getUint16(start + 4) !== 0x0000) return null

  const tiff = start + 6
  if (tiff + 8 > view.byteLength) return null

  // Byte order: 0x4949 = little-endian, 0x4D4D = big-endian
  const bom = view.getUint16(tiff)
  const le = bom === 0x4949
  if (!le && bom !== 0x4d4d) return null

  const u16 = (o: number) => view.getUint16(o, le)
  const u32 = (o: number) => view.getUint32(o, le)

  if (u16(tiff + 2) !== 0x002a) return null
  const ifd0 = tiff + u32(tiff + 4)
  if (ifd0 + 2 > view.byteLength) return null

  // Scan IFD0 for the GPS IFD pointer (0x8825) and the EXIF IFD pointer (0x8769)
  const count0 = u16(ifd0)
  let gpsIfdOffset = 0
  let exifIfdOffset = 0
  for (let i = 0; i < count0; i++) {
    const entry = ifd0 + 2 + i * 12
    if (entry + 12 > view.byteLength) break
    const tag = u16(entry)
    if (tag === 0x8825) gpsIfdOffset = tiff + u32(entry + 8)
    else if (tag === 0x8769) exifIfdOffset = tiff + u32(entry + 8)
  }

  const meta: PhotoMeta = {}

  // Capture date from the EXIF sub-IFD: DateTimeOriginal (0x9003)
  if (exifIfdOffset && exifIfdOffset + 2 <= view.byteLength) {
    const exifCount = u16(exifIfdOffset)
    for (let i = 0; i < exifCount; i++) {
      const entry = exifIfdOffset + 2 + i * 12
      if (entry + 12 > view.byteLength) break
      if (u16(entry) === 0x9003) {
        const cnt = u32(entry + 4)
        // ASCII value: inline if ≤4 bytes (never for a 20-char date), else at offset
        const valOff = cnt > 4 ? tiff + u32(entry + 8) : entry + 8
        const iso = exifDateToISO(readAscii(view, valOff, cnt))
        if (iso) meta.date = iso
        break
      }
    }
  }

  // GPS location from the GPS IFD
  if (gpsIfdOffset && gpsIfdOffset + 2 <= view.byteLength) {
    let latRef = '', lngRef = ''
    let lat: number[] | null = null, lng: number[] | null = null
    const gpsCount = u16(gpsIfdOffset)
    for (let i = 0; i < gpsCount; i++) {
      const entry = gpsIfdOffset + 2 + i * 12
      if (entry + 12 > view.byteLength) break
      const tag = u16(entry)
      const valOff = entry + 8
      switch (tag) {
        case 1: latRef = String.fromCharCode(view.getUint8(valOff)); break  // N/S
        case 3: lngRef = String.fromCharCode(view.getUint8(valOff)); break  // E/W
        case 2: lat = readRationals(view, tiff + u32(valOff), 3, le); break // lat dms
        case 4: lng = readRationals(view, tiff + u32(valOff), 3, le); break // lng dms
      }
    }
    if (lat && lng) {
      let latVal = lat[0] + lat[1] / 60 + lat[2] / 3600
      let lngVal = lng[0] + lng[1] / 60 + lng[2] / 3600
      if (latRef === 'S') latVal = -latVal
      if (lngRef === 'W') lngVal = -lngVal
      if (Number.isFinite(latVal) && Number.isFinite(lngVal) &&
          Math.abs(latVal) <= 90 && Math.abs(lngVal) <= 180 &&
          !(latVal === 0 && lngVal === 0)) {
        meta.lat = latVal
        meta.lng = lngVal
      }
    }
  }

  return (meta.lat !== undefined || meta.date) ? meta : null
}

function readRationals(view: DataView, offset: number, n: number, le: boolean): number[] | null {
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const o = offset + i * 8
    if (o + 8 > view.byteLength) return null
    const num = view.getUint32(o, le)
    const den = view.getUint32(o + 4, le)
    out.push(den === 0 ? 0 : num / den)
  }
  return out
}

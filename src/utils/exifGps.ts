/**
 * Minimal, dependency-free EXIF GPS extractor for JPEG files.
 * Reads only the GPS IFD so we can suggest where a photo was taken.
 * Returns null for non-JPEGs, photos without GPS, or any parse error.
 *
 * NOTE: must run on the ORIGINAL File — image compression strips EXIF.
 */
export async function extractGps(file: File): Promise<{ lat: number; lng: number } | null> {
  // Only JPEG carries the EXIF/GPS block we parse here
  if (!/jpe?g$/i.test(file.type) && !/\.jpe?g$/i.test(file.name)) return null

  try {
    // GPS data lives in the APP1 segment near the start — 256KB is plenty
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

function parseApp1(view: DataView, start: number): { lat: number; lng: number } | null {
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

  // Find GPS IFD pointer (tag 0x8825) in IFD0
  const count0 = u16(ifd0)
  let gpsIfdOffset = 0
  for (let i = 0; i < count0; i++) {
    const entry = ifd0 + 2 + i * 12
    if (entry + 12 > view.byteLength) break
    if (u16(entry) === 0x8825) {
      gpsIfdOffset = tiff + u32(entry + 8)
      break
    }
  }
  if (!gpsIfdOffset || gpsIfdOffset + 2 > view.byteLength) return null

  // Parse GPS IFD
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

  if (!lat || !lng) return null
  let latVal = lat[0] + lat[1] / 60 + lat[2] / 3600
  let lngVal = lng[0] + lng[1] / 60 + lng[2] / 3600
  if (latRef === 'S') latVal = -latVal
  if (lngRef === 'W') lngVal = -lngVal

  if (!Number.isFinite(latVal) || !Number.isFinite(lngVal)) return null
  if (Math.abs(latVal) > 90 || Math.abs(lngVal) > 180) return null
  // Photos with no GPS sometimes write 0,0 — treat as "no location"
  if (latVal === 0 && lngVal === 0) return null

  return { lat: latVal, lng: lngVal }
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

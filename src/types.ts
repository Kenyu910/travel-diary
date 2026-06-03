export type Entry = {
  id: string
  title: string
  body: string
  date: string
  lat: number
  lng: number
  placeName: string
  tags: string[]
  photos: string[]
  createdAt: string
  rating?: number  // 1–5 (optional, backward compatible)
}

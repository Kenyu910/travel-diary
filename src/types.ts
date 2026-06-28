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
  rating?: number
  wantToVisit?: boolean  // 行ってみたいモード（紫ピン）
  revisit?: number       // また行きたい度（1〜5、訪問済みの記録のみ）
}

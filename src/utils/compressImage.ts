/**
 * Compress an image file to JPEG before storing in localStorage.
 * Without compression, large photos can freeze the main thread
 * and quickly exhaust the ~5MB localStorage limit.
 */
export function compressImage(file: File, maxWidth = 1200, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'))

    reader.onload = ev => {
      const img = new Image()

      img.onerror = () => reject(new Error('画像の読み込みに失敗しました'))

      img.onload = () => {
        let { width, height } = img

        // Downscale if wider than maxWidth
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas not available')); return }

        ctx.drawImage(img, 0, 0, width, height)

        // Use JPEG for photos (much smaller than PNG)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }

      img.src = ev.target!.result as string
    }

    reader.readAsDataURL(file)
  })
}

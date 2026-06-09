/**
 * Compress an image file to JPEG data URL for persistent storage.
 * Returns proper data URLs (not blob URLs) that survive app reload.
 * Without compression, large photos can freeze the main thread
 * and quickly exhaust the ~5MB localStorage limit.
 *
 * CRITICAL FIX: Never use blob URLs for persistent storage.
 * All returned URLs must be data URLs or cached properly.
 */
export function compressImage(file: File, maxWidth = 600, quality = 0.65): Promise<string> {
  return new Promise((resolve, reject) => {
    // Validate file size early
    if (file.size > 20 * 1024 * 1024) {
      reject(new Error('ファイルサイズが大きすぎます（20MB以下）'))
      return
    }

    const reader = new FileReader()

    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'))

    reader.onload = ev => {
      const img = new Image()

      img.onerror = () => {
        // Canvas can't process format (HEIC, etc.)
        // Do NOT use blob URL as it doesn't persist across app reloads
        // Instead, reject and let caller handle the error
        reject(new Error(
          `申し訳ございません。${file.type || '画像'}形式には対応していません。\n` +
          `別のアプリで JPG に変換してからお試しください。`
        ))
      }

      img.onabort = () => {
        reject(new Error('画像の読み込みがキャンセルされました'))
      }

      img.onload = () => {
        try {
          let { width, height } = img

          // Check for extremely large images that exceed canvas limits
          const MAX_CANVAS_SIZE = 16384 // Most browsers support 16384 pixels max
          if (width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE) {
            // Downscale more aggressively for huge images
            const scale = Math.min(MAX_CANVAS_SIZE / width, MAX_CANVAS_SIZE / height)
            width = Math.floor(width * scale)
            height = Math.floor(height * scale)
          }

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

          // Convert to data URL using toBlob → readAsDataURL
          // This is more efficient than toDataURL and always returns a data URL
          canvas.toBlob(
            blob => {
              if (!blob) {
                reject(new Error('キャンバスの変換に失敗しました'))
                return
              }
              const reader = new FileReader()
              reader.onload = () => {
                const dataUrl = reader.result as string
                // Ensure async execution with Promise
                Promise.resolve().then(() => resolve(dataUrl))
              }
              reader.onerror = () => {
                reject(new Error('データ URL への変換に失敗しました'))
              }
              reader.readAsDataURL(blob)
            },
            'image/jpeg',
            quality
          )
        } catch (e) {
          reject(e)
        }
      }

      img.src = ev.target!.result as string
    }

    reader.readAsDataURL(file)
  })
}

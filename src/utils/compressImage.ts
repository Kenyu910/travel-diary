/**
 * Compress an image file to JPEG before storing in localStorage.
 * Without compression, large photos can freeze the main thread
 * and quickly exhaust the ~5MB localStorage limit.
 *
 * Uses requestIdleCallback to defer expensive toDataURL operation,
 * preventing UI freeze on high-latency devices.
 */
export function compressImage(file: File, maxWidth = 600, quality = 0.6): Promise<string> {
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

      img.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
      img.onabort = () => reject(new Error('画像の読み込みがキャンセルされました'))

      img.onload = () => {
        try {
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

          // Defer toDataURL to idle time to avoid UI freeze
          // Use requestIdleCallback if available, fallback to setTimeout
          const scheduleConversion = () => {
            if ('requestIdleCallback' in window) {
              requestIdleCallback(() => {
                try {
                  resolve(canvas.toDataURL('image/jpeg', quality))
                } catch (e) {
                  reject(e)
                }
              }, { timeout: 5000 })
            } else {
              // Fallback for browsers without requestIdleCallback
              setTimeout(() => {
                try {
                  resolve(canvas.toDataURL('image/jpeg', quality))
                } catch (e) {
                  reject(e)
                }
              }, 0)
            }
          }

          // Schedule on next animation frame first, then idle
          requestAnimationFrame(scheduleConversion)
        } catch (e) {
          reject(e)
        }
      }

      img.src = ev.target!.result as string
    }

    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'))
    reader.readAsDataURL(file)
  })
}

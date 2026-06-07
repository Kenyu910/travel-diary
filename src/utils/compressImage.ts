/**
 * Compress an image file to JPEG before storing in localStorage.
 * Without compression, large photos can freeze the main thread
 * and quickly exhaust the ~5MB localStorage limit.
 */
export function compressImage(file: File, maxWidth = 600, quality = 0.4): Promise<string> {
  return new Promise((resolve, reject) => {
    // Validate file size early
    if (file.size > 20 * 1024 * 1024) {
      reject(new Error('ファイルサイズが大きすぎます（20MB以下）'))
      return
    }

    // For iPhone Safari PWA: use blob URL immediately for speed
    // On modern Safari, toDataURL can hang the UI thread
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
    if (isSafari && file.size < 5 * 1024 * 1024) {
      // Blob URL is faster and lighter than toDataURL on Safari
      try {
        const blobUrl = URL.createObjectURL(file)
        // Defer with Promise.resolve to ensure async
        Promise.resolve().then(() => resolve(blobUrl))
        return
      } catch (e) {
        // Fall through to full processing if blob URL fails
      }
    }

    const reader = new FileReader()

    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'))

    reader.onload = ev => {
      const img = new Image()

      img.onerror = () => {
        // If canvas can't process the image, use blob URL as fallback
        try {
          const blobUrl = URL.createObjectURL(file)
          Promise.resolve().then(() => resolve(blobUrl))
        } catch (e) {
          reject(new Error(`画像の処理に失敗しました。(形式: ${file.type || 'unknown'}, サイズ: ${(file.size / 1024 / 1024).toFixed(2)}MB)`))
        }
      }
      img.onabort = () => {
        // If image loading is aborted, fallback to blob URL
        try {
          const blobUrl = URL.createObjectURL(file)
          Promise.resolve().then(() => resolve(blobUrl))
        } catch (e) {
          reject(new Error('画像の読み込みがキャンセルされました'))
        }
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

          // Use canvas.toBlob instead of toDataURL for better performance
          // toBlob is async and doesn't block the UI thread
          canvas.toBlob(
            blob => {
              if (!blob) {
                reject(new Error('Canvas toBlob returned null'))
                return
              }
              try {
                const blobUrl = URL.createObjectURL(blob)
                // Ensure async execution
                Promise.resolve().then(() => resolve(blobUrl))
              } catch (e) {
                reject(e)
              }
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

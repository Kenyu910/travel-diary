/**
 * Compress an image file to JPEG data URL for persistent storage.
 * Returns proper data URLs (not blob URLs) that survive app reload.
 * Without compression, large photos can freeze the main thread
 * and quickly exhaust the ~5MB localStorage limit.
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
        // Fall back to original file as-is (let browser handle display)
        try {
          const blobUrl = URL.createObjectURL(file)
          // IMPORTANT: Store the URL in session-only cache since blob URLs don't persist
          // This is a temporary display URL only - not suitable for localStorage
          Promise.resolve().then(() => resolve(blobUrl))
        } catch (e) {
          reject(new Error(`画像の処理に失敗しました。(形式: ${file.type || 'unknown'}, サイズ: ${(file.size / 1024 / 1024).toFixed(2)}MB)`))
        }
      }

      img.onabort = () => {
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

          // Convert canvas to data URL (persistent, survives app reload)
          // Use requestAnimationFrame + Promise to avoid blocking UI
          requestAnimationFrame(() => {
            try {
              const dataUrl = canvas.toDataURL('image/jpeg', quality)
              Promise.resolve().then(() => resolve(dataUrl))
            } catch (e) {
              // If toDataURL fails (memory issue), fall back to blob
              canvas.toBlob(
                blob => {
                  if (blob) {
                    const blobUrl = URL.createObjectURL(blob)
                    Promise.resolve().then(() => resolve(blobUrl))
                  } else {
                    reject(new Error('Canvas conversion failed'))
                  }
                },
                'image/jpeg',
                quality
              )
            }
          })
        } catch (e) {
          reject(e)
        }
      }

      img.src = ev.target!.result as string
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Compress an image file to JPEG before storing in localStorage.
 * Without compression, large photos can freeze the main thread
 * and quickly exhaust the ~5MB localStorage limit.
 */
export function compressImage(file: File, maxWidth = 600, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    // Validate file size early
    if (file.size > 20 * 1024 * 1024) {
      reject(new Error('ファイルサイズが大きすぎます（20MB以下）'))
      return
    }

    // Check if file is HEIC/HEIF format (unsupported by canvas)
    // These formats need special handling
    const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || file.name.endsWith('.heic') || file.name.endsWith('.heif')
    if (isHeic) {
      // For HEIC, we can't process it directly. Try to use the file as-is
      // Most modern browsers can display HEIC but canvas.drawImage may fail
      // Fallback: convert by using blob URL directly
      try {
        const blobUrl = URL.createObjectURL(file)
        resolve(blobUrl)
        // Note: This returns a blob URL instead of data URL, which is more efficient for HEIC
        return
      } catch (e) {
        reject(new Error('HEIC 形式の処理に失敗しました。別の形式で試してください。'))
        return
      }
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

          // Use requestIdleCallback with short timeout for non-blocking conversion
          // Fallback to immediate timeout for better browser compatibility
          if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
              try {
                resolve(canvas.toDataURL('image/jpeg', quality))
              } catch (e) {
                reject(e)
              }
            }, { timeout: 1000 })
          } else {
            // Fast fallback for Safari and older browsers
            setTimeout(() => {
              try {
                resolve(canvas.toDataURL('image/jpeg', quality))
              } catch (e) {
                reject(e)
              }
            }, 10)
          }
        } catch (e) {
          reject(e)
        }
      }

      img.src = ev.target!.result as string
    }

    reader.readAsDataURL(file)
  })
}

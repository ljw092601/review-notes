const MAX_EDGE = 1600

/** 긴 변이 1600px를 넘는 이미지는 줄여서 저장한다. 실패하면 원본을 그대로 돌려준다. */
export async function normalizeImage(file: File | Blob): Promise<Blob> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.type === 'image/jpeg') {
      bitmap.close()
      return file
    }
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.88))
    return blob ?? file
  } catch {
    return file
  }
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

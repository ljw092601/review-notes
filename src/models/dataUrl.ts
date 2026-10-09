/** Blob ↔ base64 data URL 변환. 브라우저와 Node 양쪽에서 동작한다. */

export async function blobToDataUrl(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  const mime = blob.type || 'application/octet-stream'
  return `data:${mime};base64,${btoa(binary)}`
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]+)?(?:;[^,]*)?;base64,(.*)$/s.exec(dataUrl)
  if (!match) throw new Error('base64 data URL 형식이 아닙니다')
  const mime = match[1] || 'application/octet-stream'
  const binary = atob(match[2])
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

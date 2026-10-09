/** JSON을 파일로 내려받게 한다. 브라우저 전용. */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // 클릭 처리가 끝난 뒤 해제
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function backupFilename(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `review-notes-${y}-${m}-${d}.json`
}

/** File → 텍스트. jsdom에도 있는 FileReader를 쓴다. */
export function readFileText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('파일을 읽을 수 없어요'))
    reader.readAsText(file)
  })
}

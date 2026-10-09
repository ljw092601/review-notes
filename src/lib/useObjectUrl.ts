import { useEffect, useState } from 'react'

/**
 * Blob을 <img src>로 쓸 수 있는 URL로 바꾸고, 바뀌거나 사라질 때 해제한다.
 * URL 생성을 effect 안에서 해야 StrictMode의 mount→cleanup→mount에서 해제된 URL을 다시 쓰지 않는다.
 */
export function useObjectUrl(blob: Blob | undefined): string | undefined {
  const [entry, setEntry] = useState<{ blob: Blob; url: string }>()
  useEffect(() => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    // oxlint-disable-next-line react/set-state-in-effect -- 브라우저 리소스(object URL)는 외부 시스템이라 effect에서 만들어 동기화한다
    setEntry({ blob, url })
    return () => URL.revokeObjectURL(url)
  }, [blob])
  return entry && entry.blob === blob ? entry.url : undefined
}

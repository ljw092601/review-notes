import { useEffect, useMemo } from 'react'

/** Blob을 <img src>로 쓸 수 있는 URL로 바꾸고, 바뀌거나 사라질 때 해제한다 */
export function useObjectUrl(blob: Blob | undefined): string | undefined {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : undefined), [blob])
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])
  return url
}

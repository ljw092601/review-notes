import { useEffect } from 'react'

const APP_NAME = '오답노트'

/** 브라우저 탭 제목을 "<title> · 오답노트"로 바꾸고, 떠날 때 원래대로 돌린다 */
export function usePageTitle(title: string | undefined) {
  useEffect(() => {
    if (!title) return
    const previous = document.title
    document.title = `${title} · ${APP_NAME}`
    return () => {
      document.title = previous
    }
  }, [title])
}

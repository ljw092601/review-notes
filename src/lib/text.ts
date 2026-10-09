/** 마크다운 기호를 걷어내고 목록 카드용 한 줄 요약을 만든다 */
export function excerpt(markdown: string, max = 140): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' [코드] ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

export function formatDate(ts: number): string {
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(ts)
}

export function formatDateTime(ts: number): string {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(ts)
}

export function relativeDate(ts: number, now = Date.now()): string {
  const diff = now - ts
  const min = Math.round(diff / 60000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  const hour = Math.round(min / 60)
  if (hour < 24) return `${hour}시간 전`
  const day = Math.round(hour / 24)
  if (day < 7) return `${day}일 전`
  return formatDate(ts)
}

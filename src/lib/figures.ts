/**
 * 본문 안 그림. 마크다운에서 `![설명](img:fig-1.png)`처럼 쓰면
 * 그 문제에 첨부된 이미지 중 이름이 같은 것을 그 자리에 그린다. 이름 대신 순번(`img:1`)도 된다.
 * 사진은 IndexedDB의 Blob이라 본문에 base64를 박지 않고 참조만 둔다.
 */
export const FIGURE_SCHEME = 'img:'

/** `img:` 참조면 키(이름 또는 순번)를, 아니면 null */
export function figureKey(src: string | undefined): string | null {
  if (!src || !src.startsWith(FIGURE_SCHEME)) return null
  const key = decodeURIComponent(src.slice(FIGURE_SCHEME.length)).trim()
  return key || null
}

/** 본문이 참조하는 그림 키 목록 */
export function referencedFigures(markdown: string): string[] {
  const keys: string[] = []
  for (const m of markdown.matchAll(/!\[[^\]]*\]\(\s*<?(img:[^)\s>]+)>?[^)]*\)/g)) {
    const key = figureKey(m[1])
    if (key && !keys.includes(key)) keys.push(key)
  }
  return keys
}

/** 키로 이미지를 찾는다. 이름 일치 우선, 아니면 0부터 세는 순번 */
export function resolveFigure<T extends { name: string }>(images: readonly T[], key: string): T | undefined {
  const byName = images.find((img) => img.name === key)
  if (byName) return byName
  if (/^\d+$/.test(key)) return images[Number(key)]
  return undefined
}

/** 첨부 이미지를 본문에 들어간 그림과 나머지(원본 사진)로 나눈다 */
export function splitFigures<T extends { name: string }>(images: readonly T[], markdown: string): { figures: T[]; originals: T[] } {
  const figures = new Set<T>()
  for (const key of referencedFigures(markdown)) {
    const img = resolveFigure(images, key)
    if (img) figures.add(img)
  }
  return { figures: [...figures], originals: images.filter((img) => !figures.has(img)) }
}

import { describe, expect, test } from 'vitest'
import { figureKey, referencedFigures, resolveFigure, splitFigures } from '@/lib/figures'
import { markdownToHtml } from '@/features/anki/markdownHtml'

const images = [
  { name: '스크린샷 2026-10-15 001010.png' },
  { name: 'fig-1.png' },
  { name: 'fig-2.png' },
]

describe('본문 그림 참조', () => {
  test('img: 스킴만 키로 본다', () => {
    expect(figureKey('img:fig-1.png')).toBe('fig-1.png')
    expect(figureKey('img:%EA%B7%B8%EB%A6%BC.png')).toBe('그림.png')
    expect(figureKey('https://x/y.png')).toBeNull()
    expect(figureKey(undefined)).toBeNull()
    expect(figureKey('img:')).toBeNull()
  })

  test('본문에서 참조한 키를 순서대로, 중복 없이 뽑는다', () => {
    const md = '지문\n\n![그림](img:fig-1.png)\n\n![](img:fig-2.png) 다시 ![x](img:fig-1.png) ![외부](https://a/b.png)'
    expect(referencedFigures(md)).toEqual(['fig-1.png', 'fig-2.png'])
  })

  test('이름으로 찾고, 없으면 순번으로', () => {
    expect(resolveFigure(images, 'fig-2.png')).toBe(images[2])
    expect(resolveFigure(images, '0')).toBe(images[0])
    expect(resolveFigure(images, 'nope.png')).toBeUndefined()
  })

  test('본문에 들어간 그림과 원본 사진을 나눈다', () => {
    const { figures, originals } = splitFigures(images, '![그림](img:fig-1.png)')
    expect(figures).toEqual([images[1]])
    expect(originals).toEqual([images[0], images[2]])
    expect(splitFigures(images, '그림 없음').originals.length).toBe(3)
  })

  test('Anki용 HTML에서는 그림이 자리 표시로 바뀐다', () => {
    const html = markdownToHtml('본문\n\n![다이어그램](img:fig-1.png)')
    expect(html).not.toContain('<img')
    expect(html).toContain('[그림: 다이어그램]')
  })
})

/**
 * 암기 탭 → Anki 기본(앞/뒤) 카드. '용어 가리기'와 같은 방식이다.
 * 묶음(응집도, 생성 패턴 …)마다 카드 1장. 앞면 = 묶음 이름 + 번호 붙은 설명들(설명 안에 나온 그 용어는 가린다), 뒷면 = 같은 번호의 용어·영문·구별 포인트 표.
 * 파일 형식은 `anki/cloze.ts`의 buildAnkiFile(탭 구분 + #헤더)을 그대로 쓴다. 첫 칸이 Front, 둘째 칸이 Back.
 */
import { buildAnkiFile } from '@/features/anki/cloze'
import type { StudyItem, StudyTopic } from './content'

export const STUDY_DECK = '정처기::암기'
const MASK = '＿＿'

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 용어 자체와 괄호 안팎 조각. "셀렉트 (σ)" → 셀렉트 (σ), 셀렉트, σ */
export function termVariants(item: Pick<StudyItem, 'term' | 'en'>): string[] {
  const out = [item.term, item.en ?? '']
  const m = /^(.+?)\s*\(([^)]+)\)\s*$/.exec(item.term)
  if (m) out.push(m[1], m[2])
  return [...new Set(out.map((s) => s.trim()).filter(Boolean))].sort((a, b) => b.length - a.length)
}

/** 설명에 답(용어)이 그대로 나오면 가린다. 한 카드에 묶음 전체가 들어가므로 같은 묶음의 용어를 모두 가린다. 영문은 단어 경계를 본다 */
export function maskTerms(text: string, items: Array<Pick<StudyItem, 'term' | 'en'>>): string {
  const variants = [...new Set(items.flatMap(termVariants))].sort((a, b) => b.length - a.length)
  let out = text
  for (const v of variants) {
    const e = escapeRegex(v)
    const start = /^[A-Za-z0-9]/.test(v) ? '(?<![A-Za-z0-9])' : ''
    const end = /[A-Za-z0-9]$/.test(v) ? '(?![A-Za-z0-9])' : ''
    out = out.replace(new RegExp(`${start}${e}${end}`, 'gi'), MASK)
  }
  return out
}

/** 묶음 하나 = 카드 하나. 앞면은 번호 붙은 설명 목록, 뒷면은 같은 번호의 용어 표 */
export function buildStudyAnkiFile(topics: StudyTopic[], deck = STUDY_DECK): { text: string; cards: number } {
  const rows = topics.flatMap((topic) =>
    topic.groups.map((group) => {
      const heading = [
        `<div style="color:#777;font-size:0.85em">${escapeHtml(topic.title)}</div>`,
        `<div style="font-weight:600;font-size:1.15em">${escapeHtml(group.title)}</div>`,
        group.order ? `<div style="color:#777;font-size:0.85em">순서: ${escapeHtml(group.order)}</div>` : '',
      ].join('')
      const descs = group.items.map((item) => `<li style="margin:0.3em 0">${escapeHtml(maskTerms(item.desc, group.items))}</li>`).join('')
      const front = `${heading}<ol style="text-align:left;margin-top:0.6em">${descs}</ol>`
      const terms = group.items
        .map((item, i) => {
          const name = `<b>${escapeHtml(item.term)}</b>${item.en ? `<br><span style="color:#777">${escapeHtml(item.en)}</span>` : ''}`
          return `<tr><td>${i + 1}</td><td>${name}</td><td>${escapeHtml(item.tip ?? '')}</td></tr>`
        })
        .join('')
      const back = [
        group.mnemonic ? `<div><b>앞 글자</b> ${escapeHtml(group.mnemonic)}</div>` : '',
        `<table><tr><th>번호</th><th>용어</th><th>구별</th></tr>${terms}</table>`,
      ].join('')
      return { text: front, backExtra: back, tags: ['암기', topic.title.replace(/\s*·\s*/g, '·')], guid: `reviewnotes-study-${group.id}` }
    }),
  )
  // 노트 유형은 비워 둔다. 한국어 Anki는 '기본', 영어는 'Basic'이라 이름이 달라서 가져오기 창에서 고른다
  return { text: buildAnkiFile(rows, { deck, noteType: '' }), cards: rows.length }
}

export const STUDY_ANKI_FILENAME = 'anki-암기.txt'

/**
 * Anki 빈칸(Cloze) 카드 만들기.
 *
 * 앞면 = 풀이(핵심 개념)에서 고른 단어를 `{{c1::단어}}`로 가린 것, 뒷면 = 전체 개념 + 문제·정답.
 * 빈칸은 "몇 번째 텍스트 조각의 몇 글자부터 몇 글자까지"(Blank)로 들고 있어서, 같은 단어가 여러 번 나와도 자리마다 따로 켜고 끈다.
 * Anki가 읽는 탭 구분 텍스트 파일(#헤더 포함)을 만든다. 사진은 넣지 않는다(개념 카드라 필요 없음).
 */
import type { Category, Problem } from '@/models/types'

/** 렌더된 HTML 안의 한 자리. node = 코드 블록을 뺀 텍스트 노드 순번, start/end = 그 노드 안 글자 범위 */
export interface Blank {
  node: number
  start: number
  end: number
}

/** 저장용. 풀이가 고쳐져 자리가 어긋나면 text가 안 맞아 버려진다 */
export interface StoredBlank extends Blank {
  text: string
}

const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'

/** 정답 문자열을 용어 조각으로 나눈다. "① Bridge, ② Observer" → Bridge, Observer / "경계값 분석(Boundary Value Analysis)" → 둘 다 */
export function splitAnswer(answer: string): string[] {
  const out: string[] = []
  const cleaned = answer.replace(/\(확인 필요[^)]*\)/g, '')
  for (const raw of cleaned.split(/[,;/·\n]|\s(?:또는|or)\s/)) {
    let part = raw.trim()
    part = part.replace(new RegExp(`^[${CIRCLED}]\\s*`), '')
    part = part.replace(/^[A-Za-z0-9]\s*[:.)]\s*/, '')
    part = part.trim()
    if (!part) continue
    const m = /^(.+?)\s*[(（]([^)）]+)[)）]\s*$/.exec(part)
    if (m) out.push(m[1].trim(), m[2].trim())
    else out.push(part)
  }
  return uniqueTerms(out)
}

function uniqueTerms(terms: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of terms) {
    const k = t.toLowerCase()
    if (t.length < 2 || seen.has(k)) continue
    seen.add(k)
    out.push(t)
  }
  return out
}

/** 정답 + 태그에서 뽑은 후보 용어 */
export function candidateTerms(problem: Pick<Problem, 'correctAnswer' | 'tags'>): string[] {
  return uniqueTerms([...splitAnswer(problem.correctAnswer), ...problem.tags])
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 긴 용어부터. 영문·숫자 용어는 단어 경계를 본다(Git이 GitHub 안에서 걸리지 않게). 한글은 조사가 붙으므로 경계 없음 */
function termRegex(terms: string[]): RegExp {
  const alts = [...terms]
    .sort((a, b) => b.length - a.length)
    .map((t) => {
      const e = escapeRegex(t)
      const latinStart = /^[A-Za-z0-9]/.test(t) ? '(?<![A-Za-z0-9])' : ''
      const latinEnd = /[A-Za-z0-9]$/.test(t) ? '(?![A-Za-z0-9])' : ''
      return `${latinStart}${e}${latinEnd}`
    })
  return new RegExp(`(${alts.join('|')})`, 'gi')
}

// ---- HTML 텍스트 노드 ----

function parse(html: string): Document {
  return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
}

/** 코드(<code>) 밖의 텍스트 노드를 문서 순서대로. 이 순번이 Blank.node다 */
function textNodes(doc: Document): Text[] {
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if ((n as Text).parentElement?.closest('code')) continue
    nodes.push(n as Text)
  }
  return nodes
}

function sortBlanks(blanks: Blank[]): Blank[] {
  return [...blanks].sort((a, b) => a.node - b.node || a.start - b.start)
}

/** 용어가 나오는 자리를 전부 찾는다(자동 제안) */
export function findTermBlanks(html: string, terms: string[]): Blank[] {
  const clean = uniqueTerms(terms)
  if (clean.length === 0) return []
  const re = termRegex(clean)
  const out: Blank[] = []
  textNodes(parse(html)).forEach((node, i) => {
    for (const m of node.data.matchAll(re)) out.push({ node: i, start: m.index, end: m.index + m[0].length })
  })
  return out
}

/** 저장해 둔 자리 중 지금 HTML과 글자가 맞는 것만 */
export function validBlanks(html: string, stored: StoredBlank[]): Blank[] {
  const nodes = textNodes(parse(html))
  return stored
    .filter((b) => b.node < nodes.length && nodes[b.node].data.slice(b.start, b.end) === b.text)
    .map(({ node, start, end }) => ({ node, start, end }))
}

export function withText(html: string, blanks: Blank[]): StoredBlank[] {
  const nodes = textNodes(parse(html))
  return blanks.map((b) => ({ ...b, text: nodes[b.node]?.data.slice(b.start, b.end) ?? '' }))
}

// ---- 단어 클릭 ----

/** 단어 토큰: 글자·숫자·한글, 사이에 낀 . + - / 만 허용. "FCFS(FIFO)" → FCFS, FIFO / "a.length" / "i++" / "다이어그램이다." → 다이어그램이다 */
const WORD_RE = /[A-Za-z0-9가-힣_#%]+(?:[.+\-/][A-Za-z0-9가-힣_#%]+)*(?:\+\+|--)?/g
/** 흔한 조사. 긴 것부터 */
const PARTICLES = ['에서는', '으로는', '에서', '으로', '에는', '에도', '까지', '부터', '처럼', '이다', '이며', '은', '는', '이', '가', '을', '를', '의', '에', '로', '과', '와', '도', '만', '다']
/** 명사 끝에 잘 안 오는 조사. 이건 뗀 말이 다른 곳에 없어도 뗀다 */
const SAFE_PARTICLES = new Set(['에서는', '으로는', '에서', '으로', '에는', '에도', '까지', '부터', '처럼', '이다', '이며', '은', '는', '이', '가', '을', '를', '의'])

/**
 * 클릭한 단어에서 조사를 뗀다. "다이어그램은" → "다이어그램", "응집도는" → "응집도".
 * 도·로·과·와·만·다·에처럼 명사 끝에도 오는 글자는 뗀 말이 다른 곳(본문·정답·태그)에도 나올 때만 뗀다("응집도"가 "응집"이 되지 않게).
 */
export function trimParticle(word: string, context: string): string {
  if (!/[가-힣]$/.test(word)) return word
  for (const p of PARTICLES) {
    if (!word.endsWith(p)) continue
    const stem = word.slice(0, -p.length)
    if (stem.length < 2) continue
    if (SAFE_PARTICLES.has(p)) return stem
    const idx = context.indexOf(stem)
    const elsewhere = idx >= 0 && (context.indexOf(stem, idx + 1) >= 0 || !context.slice(idx).startsWith(word))
    if (elsewhere) return stem
  }
  return word
}

/** 클릭 한 번으로 빈칸 추가/제거. 이미 그 자리를 덮는 빈칸이 있으면 뺀다 */
export function toggleBlankAt(html: string, blanks: Blank[], at: Blank, context: string): Blank[] {
  const hit = blanks.find((b) => b.node === at.node && b.start <= at.start && at.end <= b.end)
  if (hit) return blanks.filter((b) => b !== hit)
  const nodes = textNodes(parse(html))
  const word = nodes[at.node]?.data.slice(at.start, at.end) ?? ''
  const trimmed = trimParticle(word, context)
  const next = { node: at.node, start: at.start, end: at.start + trimmed.length }
  // 겹치는 기존 빈칸은 치운다
  return sortBlanks([...blanks.filter((b) => !(b.node === next.node && b.start < next.end && next.start < b.end)), next])
}

// ---- 렌더 ----

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * 텍스트 노드를 조각으로 나눠 다시 쓴다. blank 자리는 wrapBlank, 나머지 단어는 wrapWord(없으면 그대로)로 감싼다.
 */
function rewrite(
  html: string,
  blanks: Blank[],
  wrapBlank: (text: string, b: Blank) => string,
  wrapWord?: (text: string, b: Blank) => string,
): string {
  const doc = parse(html)
  const nodes = textNodes(doc)
  const byNode = new Map<number, Blank[]>()
  for (const b of sortBlanks(blanks)) byNode.set(b.node, [...(byNode.get(b.node) ?? []), b])

  nodes.forEach((node, i) => {
    const list = byNode.get(i) ?? []
    if (list.length === 0 && !wrapWord) return
    const text = node.data
    let out = ''
    let pos = 0
    const plain = (from: number, to: number) => {
      const seg = text.slice(from, to)
      if (!wrapWord) return escapeHtml(seg)
      let s = ''
      let last = 0
      for (const m of seg.matchAll(WORD_RE)) {
        s += escapeHtml(seg.slice(last, m.index))
        s += wrapWord(m[0], { node: i, start: from + m.index, end: from + m.index + m[0].length })
        last = m.index + m[0].length
      }
      return s + escapeHtml(seg.slice(last))
    }
    for (const b of list) {
      if (b.start < pos) continue
      out += plain(pos, b.start)
      out += wrapBlank(text.slice(b.start, b.end), b)
      pos = b.end
    }
    out += plain(pos, text.length)
    const span = doc.createElement('span')
    span.innerHTML = out
    node.replaceWith(...Array.from(span.childNodes))
  })
  return doc.body.innerHTML
}

/** Anki용: {{cN::단어}}. perTerm이면 같은 단어(대소문자 무시)끼리 같은 번호, 아니면 전부 c1 */
export function renderAnki(html: string, blanks: Blank[], options: { perTerm: boolean }): { html: string; blanks: number; cards: number } {
  if (blanks.length === 0) return { html, blanks: 0, cards: 0 }
  const numbers = new Map<string, number>()
  const out = rewrite(html, blanks, (text) => {
    const key = text.toLowerCase()
    if (!numbers.has(key)) numbers.set(key, options.perTerm ? numbers.size + 1 : 1)
    return `{{c${numbers.get(key)}::${escapeHtml(text)}}}`
  })
  return { html: out, blanks: blanks.length, cards: options.perTerm ? numbers.size : 1 }
}

const dataT = (b: Blank) => `data-t="${b.node}:${b.start}:${b.end}"`

/** 화면용: 빈칸은 <mark class="cloze">, 나머지 단어는 클릭할 수 있는 <span data-t> */
export function renderPreview(html: string, blanks: Blank[]): string {
  return rewrite(
    html,
    blanks,
    (text, b) => `<mark class="cloze" ${dataT(b)}>${escapeHtml(text)}</mark>`,
    (text, b) => `<span class="word" ${dataT(b)}>${escapeHtml(text)}</span>`,
  )
}

/** data-t="node:start:end" → Blank */
export function parseDataT(value: string | null | undefined): Blank | null {
  const m = /^(\d+):(\d+):(\d+)$/.exec(value ?? '')
  return m ? { node: Number(m[1]), start: Number(m[2]), end: Number(m[3]) } : null
}

// ---- 파일 ----

/** HTML을 탭 구분 파일의 한 칸에 넣을 수 있게 한 줄로. <pre> 안 줄바꿈은 <br>로 살린다 */
export function flattenHtml(html: string): string {
  const doc = parse(html)
  for (const pre of doc.body.querySelectorAll('pre')) pre.innerHTML = pre.innerHTML.replace(/\n/g, '<br>')
  return doc.body.innerHTML.replace(/[\r\n]+/g, ' ').replace(/\t/g, '  ')
}

/** Anki 카드에는 표·코드 스타일이 없어서 테두리가 안 보인다. 인라인 style로 심는다(밝은/어두운 테마 모두 보이게 반투명 회색) */
export function styleForAnki(html: string): string {
  const doc = parse(html)
  for (const el of doc.body.querySelectorAll('table')) el.setAttribute('style', 'border-collapse:collapse;margin:0.5em 0;text-align:left')
  for (const el of doc.body.querySelectorAll('th,td')) el.setAttribute('style', 'border:1px solid #999;padding:3px 8px;text-align:left;vertical-align:top')
  for (const el of doc.body.querySelectorAll('th')) el.setAttribute('style', (el.getAttribute('style') ?? '') + ';background:rgba(128,128,128,0.18);font-weight:600')
  for (const el of doc.body.querySelectorAll('pre')) el.setAttribute('style', 'background:rgba(128,128,128,0.15);padding:8px 10px;border-radius:4px;text-align:left;overflow-x:auto')
  for (const el of doc.body.querySelectorAll('code')) if (!el.closest('pre')) el.setAttribute('style', 'background:rgba(128,128,128,0.15);padding:0 4px;border-radius:3px')
  for (const el of doc.body.querySelectorAll('ul,ol')) el.setAttribute('style', 'text-align:left')
  return doc.body.innerHTML
}

/** Anki 태그는 공백으로 나뉘므로 태그 안 공백은 _로 */
export function ankiTag(s: string): string {
  return s.trim().replace(/\s+/g, '_')
}

export interface AnkiRow {
  /** 빈칸이 들어간 HTML (Text 필드) */
  text: string
  /** 뒷면 추가 내용 HTML (Back Extra 필드) */
  backExtra: string
  tags: string[]
  /** 다시 내보냈을 때 같은 노트를 갱신하게 하는 고유 id */
  guid: string
}

export interface AnkiFileOptions {
  deck: string
  /** 비우면 헤더에 넣지 않는다(가져오기 창에서 직접 고름) */
  noteType: string
}

/** Anki "파일 가져오기"가 읽는 텍스트. 첫 줄들의 #헤더로 구분자·HTML·덱·열 역할을 알려 준다 */
export function buildAnkiFile(rows: AnkiRow[], options: AnkiFileOptions): string {
  const header = ['#separator:tab', '#html:true']
  if (options.noteType.trim()) header.push(`#notetype:${options.noteType.trim()}`)
  if (options.deck.trim()) header.push(`#deck:${options.deck.trim()}`)
  header.push('#tags column:3', '#guid column:4')
  const lines = rows.map((r) =>
    [flattenHtml(styleForAnki(r.text)), flattenHtml(styleForAnki(r.backExtra)), r.tags.map(ankiTag).filter(Boolean).join(' '), r.guid].join('\t'),
  )
  return [...header, ...lines].join('\n') + '\n'
}

export function ankiFilename(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `anki-review-notes-${y}-${m}-${d}.txt`
}

/** 뒷면 추가 내용: (문제 본문) + 정답 + 출처 */
export function buildBackExtra(problem: Problem, questionHtml: string | null, category?: Category): string {
  const parts: string[] = []
  if (questionHtml) parts.push(`<div class="rn-question">${questionHtml}</div>`)
  parts.push(`<div class="rn-answer"><b>정답</b> ${escapeHtml(problem.correctAnswer || '(없음)')}</div>`)
  const meta = [category?.name, problem.source].filter(Boolean).map((s) => escapeHtml(String(s)))
  if (meta.length) parts.push(`<div class="rn-meta" style="color:#777;font-size:0.85em">${meta.join(' · ')}</div>`)
  return parts.join('')
}

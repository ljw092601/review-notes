#!/usr/bin/env node
// 사진 폴더 + inbox/out/<날짜>.problems.json → inbox/out/<날짜>.json (이미지 base64 포함)
// 사용: node .claude/skills/import-problems/build.mjs inbox/2026-10-09 [--keep]
//   --keep : 처리한 사진을 done/ 으로 옮기지 않는다
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'

const CATEGORY_IDS = new Set([
  'programming', 'sql', 'database', 'network', 'security', 'os', 'design',
  'testing', 'methodology', 'interface', 'release', 'terminology', 'etc',
])
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.heic': 'image/heic' }

const args = process.argv.slice(2)
const keep = args.includes('--keep')
const dir = args.find((a) => !a.startsWith('--'))
if (!dir) fail('사용법: node build.mjs inbox/<날짜> [--keep]')

const photoDir = resolve(dir)
const date = basename(photoDir)
const outDir = resolve(photoDir, '..', 'out')
const inputPath = join(outDir, `${date}.problems.json`)
if (!existsSync(inputPath)) fail(`중간 파일이 없습니다: ${inputPath}`)

const raw = JSON.parse(readFileSync(inputPath, 'utf8'))
if (raw.version !== 1 || !Array.isArray(raw.problems)) fail('version: 1 과 problems 배열이 필요합니다')

const errors = []
const used = new Set()
const problems = raw.problems.map((p, i) => {
  const at = `problems[${i}]`
  const req = (k) => { if (typeof p[k] !== 'string' || !p[k].trim()) errors.push(`${at}.${k}: 비어 있음`) }
  req('question')
  req('category')
  if (!CATEGORY_IDS.has(p.category)) errors.push(`${at}.category: 모르는 유형 '${p.category}' (앱에서 기타로 바뀜)`)
  if (!['short', 'essay', 'choice'].includes(p.answerType)) errors.push(`${at}.answerType: short|essay|choice 중 하나`)
  if (p.answerType === 'choice' && !(Array.isArray(p.choices) && p.choices.length)) errors.push(`${at}.choices: 객관식은 보기 배열이 필요`)
  if (p.answerConfidence !== undefined && !['high', 'medium', 'low'].includes(p.answerConfidence)) errors.push(`${at}.answerConfidence: high|medium|low`)
  if (!Array.isArray(p.tags)) errors.push(`${at}.tags: 배열이어야 함`)

  const files = Array.isArray(p.imageFiles) ? p.imageFiles : []
  const images = files.map((name) => {
    const path = join(photoDir, name)
    if (!existsSync(path)) {
      errors.push(`${at}.imageFiles: 파일 없음 ${name}`)
      return null
    }
    const mime = MIME[extname(name).toLowerCase()]
    if (!mime) errors.push(`${at}.imageFiles: 지원하지 않는 확장자 ${name}`)
    used.add(name)
    return { name: basename(name), dataUrl: `data:${mime};base64,${readFileSync(path).toString('base64')}` }
  })

  // 사용자 몫인 필드는 제거하고 draft로 들어가게 한다
  const { imageFiles: _f, explanation: _e, wrongReason: _w, status: _s, ...rest } = p
  return {
    certification: '정보처리기사',
    source: '',
    myAnswer: '',
    correctAnswer: '',
    tags: [],
    ...rest,
    choices: p.answerType === 'choice' ? p.choices : undefined,
    images: images.filter(Boolean),
  }
})

if (errors.length) fail('검증 실패:\n  ' + errors.join('\n  '))

let outPath = join(outDir, `${date}.json`)
for (let n = 2; existsSync(outPath); n++) outPath = join(outDir, `${date}-${n}.json`)
writeFileSync(outPath, JSON.stringify({ version: 1, exportedAt: Date.now(), problems }, null, 2))

if (!keep && used.size) {
  const done = join(photoDir, 'done')
  mkdirSync(done, { recursive: true })
  for (const name of used) renameSync(join(photoDir, name), join(done, basename(name)))
}

const bytes = statSizeMB(outPath)
console.log(`완료: ${outPath} (문제 ${problems.length}개, 사진 ${used.size}장, ${bytes}MB)`)
if (!keep && used.size) console.log(`사진 ${used.size}장을 ${join(photoDir, 'done')} 으로 옮겼습니다`)

function statSizeMB(path) {
  return (readFileSync(path).length / 1024 / 1024).toFixed(1)
}
function fail(msg) {
  console.error(msg)
  process.exit(1)
}

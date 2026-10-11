/**
 * 자동 백업: IndexedDB 내용을 사용자가 고른 PC 폴더에 파일로 둔다.
 *
 *   <폴더>/review-notes.json                 ← 항상 최신 상태(덮어쓰기). 사진은 경로로만 참조
 *   <폴더>/images/<imageId>.<ext>            ← 사진 원본. 새 사진만 추가, 지운 문제의 사진은 정리
 *   <폴더>/history/review-notes-YYYY-MM-DD.json ← 날짜가 바뀌기 직전 상태의 스냅샷. 최근 30일치만 보관
 *
 * 검색·필터·복습은 계속 IndexedDB로 돌고, 이 폴더는 사람이 보는 사본이자 복구용이다.
 */
import Dexie from 'dexie'
import { db } from './db'
import { setSetting } from './settings'
import { parseImportFile } from './transfer'
import { blobToDataUrl } from '@/models/dataUrl'
import type { ImportFile } from '@/models/schemas'
import type { ImageRecord } from '@/models/types'
import { fileExists, listFiles, readFile, writeFile } from '@/lib/fsAccess'

export const BACKUP_FILE = 'review-notes.json'
export const IMAGES_DIR = 'images'
export const HISTORY_DIR = 'history'
export const HISTORY_KEEP = 30

const HISTORY_RE = /^review-notes-(\d{4}-\d{2}-\d{2})\.json$/
const IMAGE_FILE_RE = /^[0-9a-f-]{36}\.[a-z0-9]+$/i
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/avif': 'avif',
}

export interface BackupReport {
  problems: number
  images: number
  /** 이번에 새로 쓴 사진 수 */
  wroteImages: number
  /** 지운 문제의 사진 등 정리한 파일 수 */
  removedImages: number
  /** 이번에 history/로 옮긴 스냅샷 파일 이름 */
  snapshot?: string
  /** 한 번도 스냅샷을 만들지 못하게 한 오류 등, 치명적이지 않은 문제 */
  warnings: string[]
  /** 덮어쓰지 않고 건너뛴 이유. 앱이 비어 있는데 폴더에는 문제가 남아 있을 때(브라우저 데이터를 지운 직후 등) */
  skipped?: string
}

/** 로컬 날짜 키 YYYY-MM-DD */
export function localDateKey(ts: number): string {
  const d = new Date(ts)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export function historyFileName(ts: number): string {
  return `review-notes-${localDateKey(ts)}.json`
}

/** 사진 파일 이름: <id>.<확장자>. 확장자는 MIME → 원본 이름 → bin 순으로 정한다 */
export function imageFileName(image: Pick<ImageRecord, 'id' | 'name' | 'blob'>): string {
  const fromMime = EXT_BY_MIME[image.blob.type]
  const fromName = /\.([a-z0-9]+)$/i.exec(image.name)?.[1]?.toLowerCase()
  return `${image.id}.${fromMime ?? fromName ?? 'bin'}`
}

/** 폴더용 백업 데이터. exportAll과 같지만 사진은 base64 대신 images/ 안의 경로를 가리킨다 */
export async function buildFolderBackup(now = Date.now()): Promise<{ file: ImportFile; images: ImageRecord[] }> {
  const [problems, images, attempts, categories] = await Promise.all([
    db.problems.orderBy('createdAt').toArray(),
    db.images.toArray(),
    db.attempts.orderBy('attemptedAt').toArray(),
    db.categories.orderBy('order').toArray(),
  ])
  const byProblem = new Map<string, ImageRecord[]>()
  for (const img of images) byProblem.set(img.problemId, [...(byProblem.get(img.problemId) ?? []), img])
  const file: ImportFile = {
    version: 1,
    exportedAt: now,
    categories,
    problems: problems.map((p) => ({
      ...p,
      images: (byProblem.get(p.id) ?? []).map((img) => ({ name: img.name, file: `${IMAGES_DIR}/${imageFileName(img)}` })),
    })),
    attempts,
  }
  return { file, images }
}

/** 날짜가 바뀌었으면 지금 있는 review-notes.json을 history/로 복사하고 오래된 스냅샷을 지운다 */
async function rotateHistory(dir: FileSystemDirectoryHandle, now: number, report: BackupReport): Promise<void> {
  const current = await readFile(dir, BACKUP_FILE)
  if (!current) return
  let exportedAt: number | undefined
  const text = await current.text()
  try {
    const parsed = JSON.parse(text) as { exportedAt?: unknown }
    if (typeof parsed.exportedAt === 'number') exportedAt = parsed.exportedAt
  } catch {
    report.warnings.push('기존 review-notes.json을 읽을 수 없어 스냅샷을 만들지 않았어요')
    return
  }
  if (exportedAt === undefined || localDateKey(exportedAt) === localDateKey(now)) return

  const history = await dir.getDirectoryHandle(HISTORY_DIR, { create: true })
  const name = historyFileName(exportedAt)
  if (!(await fileExists(history, name))) {
    await writeFile(history, name, text)
    report.snapshot = name
  }
  const snapshots = (await listFiles(history)).filter((n) => HISTORY_RE.test(n)).sort()
  for (const old of snapshots.slice(0, Math.max(0, snapshots.length - HISTORY_KEEP))) await history.removeEntry(old)
}

/** 사진을 images/에 맞춘다. 없는 것만 쓰고, DB에 더 이상 없는 사진 파일은 지운다 */
async function syncImages(dir: FileSystemDirectoryHandle, images: ImageRecord[], report: BackupReport): Promise<void> {
  const imagesDir = await dir.getDirectoryHandle(IMAGES_DIR, { create: true })
  const existing = new Set(await listFiles(imagesDir))
  const wanted = new Set<string>()
  for (const img of images) {
    const name = imageFileName(img)
    wanted.add(name)
    if (existing.has(name)) continue
    await writeFile(imagesDir, name, img.blob)
    report.wroteImages++
  }
  for (const name of existing) {
    if (wanted.has(name) || !IMAGE_FILE_RE.test(name)) continue
    await imagesDir.removeEntry(name)
    report.removedImages++
  }
}

/** 폴더의 review-notes.json에 든 문제 수. 파일이 없거나 못 읽으면 0 */
async function countProblemsInFolder(dir: FileSystemDirectoryHandle): Promise<number> {
  const current = await readFile(dir, BACKUP_FILE)
  if (!current) return 0
  try {
    const parsed = JSON.parse(await current.text()) as { problems?: unknown }
    return Array.isArray(parsed.problems) ? parsed.problems.length : 0
  } catch {
    return 0
  }
}

/**
 * 폴더에 전체 백업을 쓴다. 권한은 호출 전에 확인해 둔다.
 * 앱이 비어 있는데 폴더에는 문제가 있으면(브라우저 데이터를 지운 뒤 폴더를 다시 연결한 경우) 유일한 사본을 지우지 않도록 건너뛴다.
 */
export async function writeBackup(dir: FileSystemDirectoryHandle, now = Date.now()): Promise<BackupReport> {
  const { file, images } = await buildFolderBackup(now)
  const report: BackupReport = { problems: file.problems.length, images: images.length, wroteImages: 0, removedImages: 0, warnings: [] }
  if (file.problems.length === 0) {
    const inFolder = await countProblemsInFolder(dir)
    if (inFolder > 0) {
      report.skipped = `폴더에 문제 ${inFolder}개가 있는데 앱은 비어 있어서 덮어쓰지 않았어요. 먼저 "폴더에서 복원"을 하세요`
      return report
    }
  }
  await rotateHistory(dir, now, report)
  await syncImages(dir, images, report)
  await writeFile(dir, BACKUP_FILE, JSON.stringify(file, null, 2))
  await setSetting('backupLastAt', now)
  return report
}

/** 경로 'images/a.png'를 따라가 파일을 읽는다. 없으면 null */
async function readPath(dir: FileSystemDirectoryHandle, path: string): Promise<File | null> {
  const parts = path.split('/').filter(Boolean)
  const name = parts.pop()
  if (!name) return null
  let cur = dir
  try {
    for (const part of parts) cur = await cur.getDirectoryHandle(part)
  } catch (e) {
    if (e instanceof DOMException && e.name === 'NotFoundError') return null
    throw e
  }
  return readFile(cur, name)
}

/**
 * 백업 폴더의 review-notes.json을 읽어 가져오기용 JSON으로 만든다.
 * 사진 경로는 실제 파일을 읽어 base64로 바꾼다. 결과는 previewImport에 그대로 넘기면 된다.
 */
export async function readBackupFromFolder(
  dir: FileSystemDirectoryHandle,
  fileName = BACKUP_FILE,
): Promise<{ json: ImportFile; missingImages: number }> {
  const file = await readFile(dir, fileName)
  if (!file) throw new Error(`폴더에 ${fileName} 파일이 없어요`)
  let raw: unknown
  try {
    raw = JSON.parse(await file.text())
  } catch {
    throw new Error(`${fileName}의 JSON 문법이 잘못되었어요`)
  }
  const parsed = parseImportFile(raw)
  let missingImages = 0
  const problems = await Promise.all(
    parsed.problems.map(async (p) => {
      const images = await Promise.all(
        p.images.map(async (img) => {
          if ('dataUrl' in img) return img
          const f = await readPath(dir, img.file)
          if (!f) {
            missingImages++
            return null
          }
          return { name: img.name, dataUrl: await blobToDataUrl(f) }
        }),
      )
      return { ...p, images: images.filter((i) => i !== null) }
    }),
  )
  return { json: { ...parsed, problems }, missingImages }
}

/**
 * 이 앱 DB의 문제·사진·복습·유형 테이블이 바뀔 때마다 cb를 부른다(settings는 제외). 해제 함수를 돌려준다.
 * Dexie가 liveQuery용으로 쏘는 전역 storagemutated 이벤트를 쓴다.
 */
export function onDataChanged(cb: () => void): () => void {
  const prefix = `idb://${db.name}/`
  const handler = (parts: Record<string, unknown>) => {
    for (const key of Object.keys(parts)) {
      if (!key.startsWith(prefix)) continue
      if (key.slice(prefix.length).split('/')[0] === 'settings') continue
      cb()
      return
    }
  }
  Dexie.on('storagemutated', handler)
  return () => Dexie.on('storagemutated').unsubscribe(handler)
}

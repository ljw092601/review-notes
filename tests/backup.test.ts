// @vitest-environment node
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
  addAttempt,
  addImage,
  BACKUP_FILE,
  createProblem,
  db,
  deleteProblem,
  getSetting,
  HISTORY_DIR,
  HISTORY_KEEP,
  historyFileName,
  IMAGES_DIR,
  importProblems,
  localDateKey,
  onDataChanged,
  previewImport,
  readBackupFromFolder,
  setSetting,
  writeBackup,
} from '@/db'
import type { ImportFileInput } from '@/models/schemas'
import type { ProblemInput } from '@/models/types'

// ---- 메모리 파일시스템 (FileSystemDirectoryHandle 흉내) ----

class MemFile {
  readonly kind = 'file' as const
  name: string
  data: Blob = new Blob([])
  constructor(name: string) {
    this.name = name
  }
  async getFile(): Promise<File> {
    return new File([this.data], this.name, { type: this.data.type })
  }
  async createWritable() {
    const chunks: Array<Blob | string> = []
    return {
      write: async (chunk: Blob | string) => {
        chunks.push(chunk)
      },
      close: async () => {
        const type = chunks.find((c): c is Blob => c instanceof Blob)?.type ?? ''
        this.data = new Blob(chunks, { type })
      },
    }
  }
  async text(): Promise<string> {
    return this.data.text()
  }
}

class MemDir {
  readonly kind = 'directory' as const
  name: string
  entries = new Map<string, MemFile | MemDir>()
  constructor(name: string) {
    this.name = name
  }
  async getFileHandle(name: string, options?: { create?: boolean }): Promise<MemFile> {
    const found = this.entries.get(name)
    if (found instanceof MemFile) return found
    if (found) throw new DOMException(`${name}은 폴더`, 'TypeMismatchError')
    if (!options?.create) throw new DOMException(`${name} 없음`, 'NotFoundError')
    const file = new MemFile(name)
    this.entries.set(name, file)
    return file
  }
  async getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<MemDir> {
    const found = this.entries.get(name)
    if (found instanceof MemDir) return found
    if (found) throw new DOMException(`${name}은 파일`, 'TypeMismatchError')
    if (!options?.create) throw new DOMException(`${name} 없음`, 'NotFoundError')
    const dir = new MemDir(name)
    this.entries.set(name, dir)
    return dir
  }
  async removeEntry(name: string): Promise<void> {
    if (!this.entries.delete(name)) throw new DOMException(`${name} 없음`, 'NotFoundError')
  }
  async *[Symbol.asyncIterator](): AsyncGenerator<[string, MemFile | MemDir]> {
    for (const [name, handle] of this.entries) yield [name, handle]
  }
  /** 테스트 편의: 경로로 파일 찾기. 없으면 undefined */
  file(path: string): MemFile | undefined {
    const parts = path.split('/')
    const last = parts.pop()!
    const parent = parts.length ? this.dir(parts.join('/')) : this
    const f = parent?.entries.get(last)
    return f instanceof MemFile ? f : undefined
  }
  dir(path: string): MemDir | undefined {
    return path.split('/').reduce<MemDir | undefined>((cur, p) => {
      const next = cur?.entries.get(p)
      return next instanceof MemDir ? next : undefined
    }, this)
  }
  handle(): FileSystemDirectoryHandle {
    return this as unknown as FileSystemDirectoryHandle
  }
}

// ---- 공통 데이터 ----

const base: ProblemInput = {
  certification: '정보처리기사',
  category: 'network',
  answerType: 'short',
  question: 'OSI 7계층에서 3계층의 이름은?',
  myAnswer: '전송 계층',
  correctAnswer: '네트워크 계층',
  explanation: '',
  wrongReason: '',
  status: 'draft',
  tags: ['OSI'],
}

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])
const D1 = new Date(2026, 9, 9, 15, 0, 0).getTime() // 2026-10-09 15:00 로컬
const DAY = 24 * 60 * 60 * 1000

/** 문제 2개(첫 번째에 사진 1장), 복습 기록 1개 */
async function seed() {
  const p1 = await createProblem(base)
  const p2 = await createProblem({ ...base, question: '서브넷 마스크 255.255.255.0의 프리픽스는?', correctAnswer: '/24' })
  const img = await addImage(p1.id, new Blob([PNG_BYTES], { type: 'image/png' }), 'IMG_001.png')
  await addAttempt(p1.id, { answer: '네트워크', result: 'correct' })
  return { p1, p2, img }
}

async function readJson(root: MemDir, path = BACKUP_FILE) {
  const f = root.file(path)
  if (!f) throw new Error(`${path} 없음`)
  return JSON.parse(await f.text()) as ImportFileInput & { exportedAt: number }
}

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('날짜 유틸', () => {
  test('localDateKey와 historyFileName은 로컬 날짜 기준', () => {
    expect(localDateKey(D1)).toBe('2026-10-09')
    expect(historyFileName(D1)).toBe('review-notes-2026-10-09.json')
    expect(localDateKey(new Date(2026, 0, 5, 0, 30).getTime())).toBe('2026-01-05')
  })
})

describe('writeBackup', () => {
  test('review-notes.json, images/, settings.backupLastAt을 쓴다', async () => {
    const { img } = await seed()
    const root = new MemDir('root')
    const report = await writeBackup(root.handle(), D1)

    expect(report).toMatchObject({ problems: 2, images: 1, wroteImages: 1, removedImages: 0, warnings: [] })
    expect(report.snapshot).toBeUndefined()

    const json = await readJson(root)
    expect(json.version).toBe(1)
    expect(json.exportedAt).toBe(D1)
    expect(json.problems).toHaveLength(2)
    expect(json.attempts).toHaveLength(1)
    expect(json.categories?.length).toBeGreaterThan(0)
    const withImage = json.problems.find((p) => p.images && p.images.length > 0)!
    expect(withImage.images).toEqual([{ name: 'IMG_001.png', file: `${IMAGES_DIR}/${img.id}.png` }])

    const file = root.file(`${IMAGES_DIR}/${img.id}.png`)
    expect(file).toBeDefined()
    expect(new Uint8Array(await file!.data.arrayBuffer())).toEqual(PNG_BYTES)
    expect(file!.data.type).toBe('image/png')

    expect(await getSetting('backupLastAt')).toBe(D1)
  })

  test('앱이 비어 있는데 폴더에 문제가 있으면 덮어쓰지 않는다', async () => {
    const { p1, p2 } = await seed()
    const root = new MemDir('root')
    await writeBackup(root.handle(), D1)
    const before = await root.file(BACKUP_FILE)!.data.text()

    // 브라우저 데이터를 지운 상황: DB는 비고 폴더만 남음
    await deleteProblem(p1.id)
    await deleteProblem(p2.id)
    const report = await writeBackup(root.handle(), D1 + 1000)

    expect(report.skipped).toMatch(/문제 2개/)
    expect(report.problems).toBe(0)
    expect(await root.file(BACKUP_FILE)!.data.text()).toBe(before)
    expect(await getSetting('backupLastAt')).toBe(D1)
  })

  test('앱도 비고 폴더도 비었으면 그냥 쓴다', async () => {
    const root = new MemDir('root')
    const report = await writeBackup(root.handle(), D1)
    expect(report.skipped).toBeUndefined()
    expect((await readJson(root)).problems).toHaveLength(0)
  })

  test('같은 날 두 번째 백업은 사진을 다시 쓰지 않고 history/도 만들지 않는다', async () => {
    await seed()
    const root = new MemDir('root')
    await writeBackup(root.handle(), D1)
    const report = await writeBackup(root.handle(), D1 + 60_000)
    expect(report.wroteImages).toBe(0)
    expect(report.snapshot).toBeUndefined()
    expect(root.dir(HISTORY_DIR)).toBeUndefined()
    expect((await readJson(root)).exportedAt).toBe(D1 + 60_000)
  })

  test('지운 문제의 사진 파일은 정리하고, 사용자가 넣은 다른 파일은 남긴다', async () => {
    const { p1, img } = await seed()
    const root = new MemDir('root')
    await writeBackup(root.handle(), D1)
    const imagesDir = root.dir(IMAGES_DIR)!
    const memo = await imagesDir.getFileHandle('memo.txt', { create: true })
    memo.data = new Blob(['내 메모'])

    await deleteProblem(p1.id)
    const report = await writeBackup(root.handle(), D1 + 1000)
    expect(report.removedImages).toBe(1)
    expect(root.file(`${IMAGES_DIR}/${img.id}.png`)).toBeUndefined()
    expect(root.file(`${IMAGES_DIR}/memo.txt`)).toBeDefined()
    expect((await readJson(root)).problems).toHaveLength(1)
  })

  test('날짜가 바뀌면 직전 상태를 history/에 스냅샷으로 남기고, 같은 날엔 중복 생성하지 않는다', async () => {
    await seed()
    const root = new MemDir('root')
    await writeBackup(root.handle(), D1)
    const day1Text = await root.file(BACKUP_FILE)!.text()

    const report = await writeBackup(root.handle(), D1 + DAY)
    expect(report.snapshot).toBe('review-notes-2026-10-09.json')
    const snapshot = root.file(`${HISTORY_DIR}/review-notes-2026-10-09.json`)
    expect(snapshot).toBeDefined()
    expect(await snapshot!.text()).toBe(day1Text)
    expect(JSON.parse(await snapshot!.text()).exportedAt).toBe(D1)
    expect((await readJson(root)).exportedAt).toBe(D1 + DAY)

    // 같은 날(D1+1일) 또 써도 스냅샷은 그대로 하나
    await createProblem({ ...base, question: '세 번째 문제' })
    const again = await writeBackup(root.handle(), D1 + DAY + 3600_000)
    expect(again.snapshot).toBeUndefined()
    const names = [...root.dir(HISTORY_DIR)!.entries.keys()]
    expect(names).toEqual(['review-notes-2026-10-09.json'])
    expect(await snapshot!.text()).toBe(day1Text)
  })

  test(`history/는 최근 ${HISTORY_KEEP}개만 남긴다`, async () => {
    await seed()
    const root = new MemDir('root')
    const history = await root.getDirectoryHandle(HISTORY_DIR, { create: true })
    // 2026-08-01부터 35일치 가짜 스냅샷
    const start = new Date(2026, 7, 1).getTime()
    const fake: string[] = []
    for (let i = 0; i < 35; i++) {
      const name = historyFileName(start + i * DAY)
      fake.push(name)
      const f = await history.getFileHandle(name, { create: true })
      f.data = new Blob(['{}'])
    }
    const other = await history.getFileHandle('notes.txt', { create: true })
    other.data = new Blob(['x'])

    await writeBackup(root.handle(), D1)
    await writeBackup(root.handle(), D1 + DAY) // 회전 발생 → 36개 → 30개로 정리

    const names = [...history.entries.keys()].filter((n) => n !== 'notes.txt').sort()
    expect(names).toHaveLength(HISTORY_KEEP)
    expect(names.at(-1)).toBe('review-notes-2026-10-09.json')
    // 가장 오래된 6개가 지워짐
    for (const old of fake.slice(0, 6)) expect(history.entries.has(old)).toBe(false)
    expect(history.entries.has(fake[6])).toBe(true)
    expect(history.entries.has('notes.txt')).toBe(true)
  })
})

describe('readBackupFromFolder', () => {
  test('사진 경로를 base64로 바꿔 가져오기용 JSON을 만든다', async () => {
    await seed()
    const root = new MemDir('root')
    await writeBackup(root.handle(), D1)

    const { json, missingImages } = await readBackupFromFolder(root.handle())
    expect(missingImages).toBe(0)
    expect(json.problems).toHaveLength(2)
    const images = json.problems.flatMap((p) => p.images)
    expect(images).toHaveLength(1)
    expect(images[0]).toMatchObject({ name: 'IMG_001.png', dataUrl: expect.stringMatching(/^data:image\/png;base64,/) })

    // 그대로 가져오기 파이프라인에 넣으면 사진까지 복원된다
    await db.delete()
    await db.open()
    const preview = await previewImport(json)
    expect(preview.missingImages).toBe(0)
    const result = await importProblems(preview)
    expect(result.added).toBe(2)
    expect(await db.images.count()).toBe(1)
    expect(await db.attempts.count()).toBe(1)
  })

  test('사진 파일이 없으면 missingImages를 세고 그 사진은 뺀다', async () => {
    const { img } = await seed()
    const root = new MemDir('root')
    await writeBackup(root.handle(), D1)
    await root.dir(IMAGES_DIR)!.removeEntry(`${img.id}.png`)

    const { json, missingImages } = await readBackupFromFolder(root.handle())
    expect(missingImages).toBe(1)
    expect(json.problems.flatMap((p) => p.images)).toHaveLength(0)
  })

  test('review-notes.json이 없으면 파일명이 든 에러', async () => {
    const root = new MemDir('root')
    await expect(readBackupFromFolder(root.handle())).rejects.toThrow(BACKUP_FILE)
  })

  test('JSON 문법이 깨졌으면 에러', async () => {
    const root = new MemDir('root')
    const f = await root.getFileHandle(BACKUP_FILE, { create: true })
    f.data = new Blob(['{ not json'])
    await expect(readBackupFromFolder(root.handle())).rejects.toThrow('JSON 문법')
  })
})

describe('가져오기에 파일 경로만 있는 사진', () => {
  test('previewImport가 세고, importProblems는 건너뛴다', async () => {
    const file: ImportFileInput = {
      version: 1,
      problems: [
        {
          certification: '정보처리기사',
          category: 'network',
          answerType: 'short',
          question: '라우터의 계층은?',
          correctAnswer: '네트워크 계층',
          images: [{ name: 'a.png', file: 'images/a.png' }],
        },
      ],
    }
    const preview = await previewImport(file)
    expect(preview.missingImages).toBe(1)
    const result = await importProblems(preview)
    expect(result.added).toBe(1)
    expect(await db.problems.count()).toBe(1)
    expect(await db.images.count()).toBe(0)
  })
})

describe('onDataChanged', () => {
  test('문제 변경에는 불리고, settings만 바뀌면 안 불리고, 해제 후엔 안 불린다', async () => {
    const cb = vi.fn()
    const off = onDataChanged(cb)
    try {
      await createProblem(base)
      await vi.waitFor(() => expect(cb).toHaveBeenCalled())
      const after = cb.mock.calls.length

      await setSetting('backupLastAt', D1)
      await new Promise((r) => setTimeout(r, 20))
      expect(cb.mock.calls.length).toBe(after)
    } finally {
      off()
    }
    const before = cb.mock.calls.length
    await createProblem({ ...base, question: '해제 후' })
    await new Promise((r) => setTimeout(r, 20))
    expect(cb.mock.calls.length).toBe(before)
  })
})

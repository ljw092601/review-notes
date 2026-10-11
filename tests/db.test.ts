// @vitest-environment node
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, test } from 'vitest'
import {
  addAttempt,
  addCategory,
  addImage,
  createProblem,
  db,
  deleteCategory,
  deleteProblem,
  exportAll,
  ImportFormatError,
  importProblems,
  listAttempts,
  listCategories,
  listImages,
  listTags,
  previewImport,
  queryProblems,
  renameCategory,
  updateProblem,
} from '@/db'
import { DEFAULT_CATEGORIES } from '@/models/categories'
import type { ImportFileInput } from '@/models/schemas'
import type { ProblemInput } from '@/models/types'

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

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('유형 시드', () => {
  test('새 DB에 기본 유형이 들어 있다', async () => {
    const categories = await listCategories()
    expect(categories.map((c) => c.id)).toEqual(DEFAULT_CATEGORIES.map((c) => c.id))
  })

  test('유형 추가·이름 변경·삭제(문제는 기타로 이동)', async () => {
    const added = await addCategory('클라우드')
    expect(added.id).toMatch(/^cat-/)
    await renameCategory(added.id, '클라우드·가상화')
    expect((await db.categories.get(added.id))?.name).toBe('클라우드·가상화')

    const p = await createProblem({ ...base, category: added.id })
    await deleteCategory(added.id)
    expect((await db.problems.get(p.id))?.category).toBe('etc')
    await expect(deleteCategory('etc')).rejects.toThrow()
  })
})

describe('문제 CRUD', () => {
  test('생성·수정·조회', async () => {
    const p = await createProblem(base)
    expect(p.id).toBeTruthy()
    const updated = await updateProblem(p.id, { explanation: '3계층은 네트워크', status: 'done' })
    expect(updated.status).toBe('done')
    expect(updated.updatedAt).toBeGreaterThanOrEqual(p.updatedAt)
    expect((await db.problems.get(p.id))?.explanation).toBe('3계층은 네트워크')
  })

  test('검증 실패 시 저장되지 않는다', async () => {
    await expect(createProblem({ ...base, question: '   ' })).rejects.toThrow()
    expect(await db.problems.count()).toBe(0)
  })

  test('태그는 중복이 제거된다', async () => {
    const p = await createProblem({ ...base, tags: ['OSI', 'OSI', ' TCP '] })
    expect(p.tags).toEqual(['OSI', 'TCP'])
  })

  test('삭제하면 이미지와 시도 기록도 지워진다', async () => {
    const p = await createProblem(base)
    await addImage(p.id, new Blob(['x'], { type: 'image/png' }), 'a.png')
    await addAttempt(p.id, { answer: 'x', result: 'wrong' })
    await deleteProblem(p.id)
    expect(await db.problems.count()).toBe(0)
    expect(await db.images.count()).toBe(0)
    expect(await db.attempts.count()).toBe(0)
  })
})

describe('조회·필터', () => {
  beforeEach(async () => {
    await createProblem({ ...base, question: 'A 서브넷 마스크', tags: ['IP', '서브넷'] })
    await createProblem({ ...base, category: 'security', question: 'B AES 키 길이', tags: ['암호화'], status: 'done' })
    await createProblem({ ...base, category: 'security', question: 'C XSS 방어', tags: ['암호화', '웹'], source: '2024년 1회 3번' })
  })

  test('유형 필터', async () => {
    const r = await queryProblems({ category: 'security' })
    expect(r.map((p) => p.question[0]).sort()).toEqual(['B', 'C'])
  })

  test('유형 + 상태 필터', async () => {
    const r = await queryProblems({ category: 'security', status: 'draft' })
    expect(r.map((p) => p.question[0])).toEqual(['C'])
  })

  test('태그는 AND 조건', async () => {
    expect((await queryProblems({ tags: ['암호화'] })).length).toBe(2)
    expect((await queryProblems({ tags: ['암호화', '웹'] })).length).toBe(1)
  })

  test('검색은 본문·출처·태그를 대소문자 무시하고 찾는다', async () => {
    expect((await queryProblems({ search: 'aes' })).map((p) => p.question[0])).toEqual(['B'])
    expect((await queryProblems({ search: '2024년 1회' })).map((p) => p.question[0])).toEqual(['C'])
    expect((await queryProblems({ search: '서브넷' })).map((p) => p.question[0])).toEqual(['A'])
  })

  test('복습에서 틀린 횟수 순 정렬', async () => {
    const [a, b] = await queryProblems({ sort: 'createdDesc' }).then((r) => r.reverse())
    await addAttempt(b.id, { answer: '', result: 'wrong' })
    await addAttempt(b.id, { answer: '', result: 'wrong' })
    await addAttempt(a.id, { answer: '', result: 'correct' })
    const r = await queryProblems({ sort: 'wrongCountDesc' })
    expect(r[0].id).toBe(b.id)
  })

  test('최근 복습 결과 필터', async () => {
    const [a, b] = await queryProblems({ sort: 'createdDesc' }).then((r) => r.reverse())
    const first = await addAttempt(b.id, { answer: '', result: 'wrong' })
    const second = await addAttempt(b.id, { answer: '', result: 'correct' })
    await db.attempts.update(first.id, { attemptedAt: 1000 })
    await db.attempts.update(second.id, { attemptedAt: 2000 })
    expect((await queryProblems({ result: 'correct' })).map((p) => p.id)).toEqual([b.id])
    expect((await queryProblems({ result: 'wrong' })).length).toBe(0)
    const none = await queryProblems({ result: 'none' })
    expect(none.length).toBe(2)
    expect(none.map((p) => p.id)).toContain(a.id)
  })

  test('최근 복습 순 정렬 — 안 풀어본 문제는 뒤로', async () => {
    const [a, b, c] = await queryProblems({ sort: 'createdDesc' }).then((r) => r.reverse())
    const ra = await addAttempt(a.id, { answer: '', result: 'wrong' })
    const rc = await addAttempt(c.id, { answer: '', result: 'wrong' })
    await db.attempts.update(ra.id, { attemptedAt: 5000 })
    await db.attempts.update(rc.id, { attemptedAt: 1000 })
    const r = await queryProblems({ sort: 'reviewedDesc' })
    expect(r.map((p) => p.id)).toEqual([a.id, c.id, b.id])
  })

  test('태그 목록과 사용 횟수', async () => {
    const tags = await listTags()
    expect(tags[0]).toEqual({ tag: '암호화', count: 2 })
    expect(tags.length).toBe(4)
  })
})

describe('시도 기록', () => {
  test('최근 시도가 먼저 온다', async () => {
    const p = await createProblem(base)
    const first = await addAttempt(p.id, { answer: '1', result: 'wrong' })
    await db.attempts.update(first.id, { attemptedAt: first.attemptedAt - 1000 })
    const second = await addAttempt(p.id, { answer: '2', result: 'correct' })
    const list = await listAttempts(p.id)
    expect(list.map((a) => a.id)).toEqual([second.id, first.id])
  })
})

const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgo='

function claudeFile(): ImportFileInput {
  return {
    version: 1,
    problems: [
      {
        certification: '정보처리기사',
        category: 'design',
        source: '2024년 2회 기출 3번',
        answerType: 'short',
        question: '클래스 간 관계를 나타내는 UML 다이어그램은?',
        myAnswer: '',
        correctAnswer: '클래스 다이어그램',
        answerConfidence: 'high',
        tags: ['UML'],
        images: [{ name: 'IMG_001.jpg', dataUrl: PNG_DATA_URL }],
      },
    ],
  }
}

describe('가져오기', () => {
  test('Claude 파일을 draft로 등록하고 이미지를 Blob으로 저장한다', async () => {
    const preview = await previewImport(claudeFile())
    expect(preview.items[0].duplicateOf).toBeUndefined()
    expect(preview.unknownCategories).toEqual([])
    const result = await importProblems(preview)
    expect(result).toEqual({ added: 1, skipped: 0, attemptsAdded: 0 })

    const [p] = await db.problems.toArray()
    expect(p.status).toBe('draft')
    expect(p.explanation).toBe('')
    const images = await listImages(p.id)
    expect(images.length).toBe(1)
    expect(images[0].blob.type).toBe('image/png')
    expect(images[0].blob.size).toBe(8)
  })

  test('같은 출처나 같은 본문이면 중복으로 건너뛴다', async () => {
    await importProblems(await previewImport(claudeFile()))
    const again = await previewImport(claudeFile())
    expect(again.items[0].duplicateOf).toBeDefined()
    expect(await importProblems(again)).toMatchObject({ added: 0, skipped: 1 })
    expect(await importProblems(again, { skipDuplicates: false })).toMatchObject({ added: 1 })
  })

  test('모르는 유형은 기타로 바뀐다', async () => {
    const file = claudeFile()
    file.problems[0].category = 'cloud'
    const preview = await previewImport(file)
    expect(preview.unknownCategories).toEqual(['cloud'])
    await importProblems(preview)
    expect((await db.problems.toArray())[0].category).toBe('etc')
  })

  test('형식이 틀리면 ImportFormatError', async () => {
    await expect(previewImport({ version: 2, problems: [] })).rejects.toBeInstanceOf(ImportFormatError)
    await expect(previewImport({ version: 1, problems: [{ question: '' }] })).rejects.toThrow(/category/)
  })

  test('내보내기 → 빈 DB에 가져오기 왕복', async () => {
    const p = await createProblem({ ...base, status: 'done', explanation: '풀이', wrongReason: '이유' })
    await addImage(p.id, new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }), 'x.jpg')
    await addAttempt(p.id, { answer: '네트워크', result: 'correct', memo: '기억남' })
    await addCategory('클라우드')
    const backup = await exportAll()
    expect(backup.problems[0].images[0]).toMatchObject({ dataUrl: expect.stringMatching(/^data:image\/jpeg;base64,/) })

    await db.delete()
    await db.open()
    const result = await importProblems(await previewImport(JSON.parse(JSON.stringify(backup))))
    expect(result).toEqual({ added: 1, skipped: 0, attemptsAdded: 1 })

    const [restored] = await db.problems.toArray()
    expect(restored.id).toBe(p.id)
    expect(restored.status).toBe('done')
    expect(restored.explanation).toBe('풀이')
    expect(restored.createdAt).toBe(p.createdAt)
    expect((await listImages(restored.id))[0].blob.size).toBe(3)
    expect((await listAttempts(restored.id))[0].memo).toBe('기억남')
    expect((await listCategories()).some((c) => c.name === '클라우드')).toBe(true)
  })
})

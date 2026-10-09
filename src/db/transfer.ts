import { ZodError } from 'zod'
import { db, newId } from './db'
import { blobToDataUrl, dataUrlToBlob } from '@/models/dataUrl'
import { FALLBACK_CATEGORY_ID } from '@/models/categories'
import { importFileSchema, type ImportFile, type ImportProblem } from '@/models/schemas'
import type { Problem } from '@/models/types'

export interface ImportPreview {
  file: ImportFile
  /** 가져올 문제와 중복 여부 */
  items: Array<{ problem: ImportProblem; duplicateOf?: Problem }>
  /** DB에 없는 유형 id. 가져올 때 '기타'로 바뀐다 */
  unknownCategories: string[]
}

export interface ImportResult {
  added: number
  skipped: number
  attemptsAdded: number
}

export class ImportFormatError extends Error {
  issues: string[]
  constructor(issues: string[]) {
    super(`가져오기 파일 형식이 잘못되었습니다:\n${issues.join('\n')}`)
    this.name = 'ImportFormatError'
    this.issues = issues
  }
}

export function parseImportFile(json: unknown): ImportFile {
  try {
    return importFileSchema.parse(json)
  } catch (e) {
    if (e instanceof ZodError) {
      throw new ImportFormatError(e.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`))
    }
    throw e
  }
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

/** 같은 출처(비어 있지 않을 때) 또는 같은 문제 본문이면 중복으로 본다 */
export async function previewImport(json: unknown): Promise<ImportPreview> {
  const file = parseImportFile(json)
  const existing = await db.problems.toArray()
  const bySource = new Map<string, Problem>()
  for (const p of existing) if (p.source?.trim()) bySource.set(normalize(p.source), p)
  const byQuestion = new Map(existing.map((p) => [normalize(p.question), p]))
  const categoryIds = new Set((await db.categories.toArray()).map((c) => c.id))
  const incomingCategoryIds = new Set((file.categories ?? []).map((c) => c.id))

  const items = file.problems.map((problem) => {
    const duplicateOf =
      (problem.source?.trim() ? bySource.get(normalize(problem.source)) : undefined) ??
      byQuestion.get(normalize(problem.question))
    return { problem, duplicateOf }
  })
  const unknownCategories = [
    ...new Set(
      file.problems.map((p) => p.category).filter((c) => !categoryIds.has(c) && !incomingCategoryIds.has(c)),
    ),
  ]
  return { file, items, unknownCategories }
}

export async function importProblems(
  preview: ImportPreview,
  options: { skipDuplicates?: boolean } = {},
): Promise<ImportResult> {
  const skipDuplicates = options.skipDuplicates ?? true
  const result: ImportResult = { added: 0, skipped: 0, attemptsAdded: 0 }
  const idMap = new Map<string, string>()

  await db.transaction('rw', db.problems, db.images, db.attempts, db.categories, async () => {
    for (const category of preview.file.categories ?? []) {
      if (!(await db.categories.get(category.id))) await db.categories.add(category)
    }
    const categoryIds = new Set((await db.categories.toArray()).map((c) => c.id))

    for (const { problem, duplicateOf } of preview.items) {
      if (duplicateOf && skipDuplicates) {
        result.skipped++
        continue
      }
      const { images, id: givenId, createdAt, updatedAt, ...input } = problem
      const id = givenId && !(await db.problems.get(givenId)) ? givenId : newId()
      if (givenId) idMap.set(givenId, id)
      const now = Date.now()
      await db.problems.add({
        ...input,
        category: categoryIds.has(input.category) ? input.category : FALLBACK_CATEGORY_ID,
        id,
        createdAt: createdAt ?? now,
        updatedAt: updatedAt ?? now,
      })
      for (const image of images) {
        await db.images.add({
          id: newId(),
          problemId: id,
          blob: dataUrlToBlob(image.dataUrl),
          name: image.name,
          createdAt: now,
        })
      }
      result.added++
    }

    for (const attempt of preview.file.attempts ?? []) {
      const problemId = idMap.get(attempt.problemId)
      if (!problemId) continue
      await db.attempts.add({
        id: newId(),
        problemId,
        answer: attempt.answer,
        result: attempt.result,
        memo: attempt.memo,
        attemptedAt: attempt.attemptedAt,
      })
      result.attemptsAdded++
    }
  })
  return result
}

/** 전체 백업. 이미지는 base64로 포함한다. */
export async function exportAll(): Promise<ImportFile> {
  const [problems, images, attempts, categories] = await Promise.all([
    db.problems.orderBy('createdAt').toArray(),
    db.images.toArray(),
    db.attempts.orderBy('attemptedAt').toArray(),
    db.categories.orderBy('order').toArray(),
  ])
  const imagesByProblem = new Map<string, typeof images>()
  for (const image of images) {
    const list = imagesByProblem.get(image.problemId) ?? []
    list.push(image)
    imagesByProblem.set(image.problemId, list)
  }
  return {
    version: 1,
    exportedAt: Date.now(),
    categories,
    problems: await Promise.all(
      problems.map(async (p) => ({
        ...p,
        images: await Promise.all(
          (imagesByProblem.get(p.id) ?? []).map(async (img) => ({
            name: img.name,
            dataUrl: await blobToDataUrl(img.blob),
          })),
        ),
      })),
    ),
    attempts,
  }
}

import { db } from './db'
import { FALLBACK_CATEGORY_ID } from '@/models/categories'
import type { Category } from '@/models/types'

export function listCategories(): Promise<Category[]> {
  return db.categories.orderBy('order').toArray()
}

export async function addCategory(name: string, description = ''): Promise<Category> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('유형 이름을 입력하세요')
  const all = await db.categories.toArray()
  if (all.some((c) => c.name === trimmed)) throw new Error(`이미 있는 유형입니다: ${trimmed}`)
  const base = slugify(trimmed)
  let id = base
  for (let n = 2; all.some((c) => c.id === id); n++) id = `${base}-${n}`
  const category: Category = {
    id,
    name: trimmed,
    description,
    order: Math.max(-1, ...all.map((c) => c.order)) + 1,
  }
  await db.categories.add(category)
  return category
}

export async function renameCategory(id: string, name: string, description?: string): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('유형 이름을 입력하세요')
  const patch = description === undefined ? { name: trimmed } : { name: trimmed, description }
  const count = await db.categories.update(id, patch)
  if (count === 0) throw new Error(`유형을 찾을 수 없습니다: ${id}`)
}

/** 순서를 ids 배열 순서대로 다시 매긴다 */
export async function reorderCategories(ids: string[]): Promise<void> {
  await db.transaction('rw', db.categories, async () => {
    await Promise.all(ids.map((id, order) => db.categories.update(id, { order })))
  })
}

/** 유형을 지우고 그 유형의 문제는 '기타'로 옮긴다 */
export async function deleteCategory(id: string): Promise<void> {
  if (id === FALLBACK_CATEGORY_ID) throw new Error('기타 유형은 지울 수 없습니다')
  await db.transaction('rw', db.categories, db.problems, async () => {
    await db.problems.where('category').equals(id).modify({ category: FALLBACK_CATEGORY_ID })
    await db.categories.delete(id)
  })
}

function slugify(name: string): string {
  const ascii = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return ascii || `cat-${Date.now().toString(36)}`
}

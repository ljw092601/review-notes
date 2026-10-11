import Dexie, { type EntityTable } from 'dexie'
import { DEFAULT_CATEGORIES } from '@/models/categories'
import type { Attempt, Category, ImageRecord, Problem, Setting } from '@/models/types'

export class ReviewNotesDB extends Dexie {
  problems!: EntityTable<Problem, 'id'>
  images!: EntityTable<ImageRecord, 'id'>
  attempts!: EntityTable<Attempt, 'id'>
  categories!: EntityTable<Category, 'id'>
  settings!: EntityTable<Setting, 'key'>

  constructor(name = 'review-notes') {
    super(name)
    // 스키마를 바꾸면 version을 올리고 upgrade()를 쓴다. 기존 버전 정의는 지우지 않는다.
    this.version(1).stores({
      problems: 'id, category, status, createdAt, updatedAt, source, *tags',
      images: 'id, problemId',
      attempts: 'id, problemId, attemptedAt',
      categories: 'id, order',
    })
    // v2: 앱 설정(자동 백업 폴더 핸들 등). key-value
    this.version(2).stores({
      settings: 'key',
    })
    this.on('populate', () => {
      void this.categories.bulkAdd(DEFAULT_CATEGORIES)
    })
  }
}

export const db = new ReviewNotesDB()

export function newId(): string {
  return crypto.randomUUID()
}

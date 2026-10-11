import { z } from 'zod'
import { DEFAULT_CERTIFICATION } from './categories'

export const answerTypeSchema = z.enum(['short', 'essay', 'choice'])
export const problemStatusSchema = z.enum(['draft', 'done'])
export const answerConfidenceSchema = z.enum(['high', 'medium', 'low'])
export const attemptResultSchema = z.enum(['correct', 'partial', 'wrong'])

const tagsSchema = z
  .array(z.string().trim().min(1))
  .default([])
  .transform((tags) => Array.from(new Set(tags)))

/** 편집 폼에서 저장할 때 검증 */
export const problemInputSchema = z.object({
  certification: z.string().trim().min(1, '자격증 이름을 입력하세요').default(DEFAULT_CERTIFICATION),
  category: z.string().trim().min(1, '문제 유형을 선택하세요'),
  source: z.string().trim().optional(),
  answerType: answerTypeSchema.default('short'),
  question: z.string().trim().min(1, '문제를 입력하세요'),
  choices: z.array(z.string()).optional(),
  myAnswer: z.string().default(''),
  correctAnswer: z.string().default(''),
  answerConfidence: answerConfidenceSchema.optional(),
  explanation: z.string().default(''),
  wrongReason: z.string().default(''),
  status: problemStatusSchema.default('draft'),
  tags: tagsSchema,
})

/** 사진. base64가 들어 있거나(가져오기 파일), 백업 폴더 안의 상대 경로만 있다(자동 백업 파일) */
export const importImageSchema = z.union([
  z.object({
    name: z.string().min(1),
    dataUrl: z.string().regex(/^data:[\w/+.-]+;base64,/, 'base64 data URL 형식이어야 합니다'),
  }),
  z.object({
    name: z.string().min(1),
    file: z.string().min(1),
  }),
])
export type ImportImage = z.infer<typeof importImageSchema>

/** 가져오기 파일의 문제 한 건. Claude가 만드는 파일은 explanation/wrongReason/status가 없고, 백업 파일은 전부 있다. */
export const importProblemSchema = problemInputSchema.extend({
  id: z.string().optional(),
  images: z.array(importImageSchema).default([]),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
})

export const importAttemptSchema = z.object({
  id: z.string().optional(),
  problemId: z.string(),
  answer: z.string().default(''),
  result: attemptResultSchema,
  memo: z.string().optional(),
  attemptedAt: z.number(),
})

export const importCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(''),
  order: z.number().int().default(0),
})

/** 가져오기 / 내보내기 파일 (v1) */
export const importFileSchema = z.object({
  version: z.literal(1),
  exportedAt: z.number().optional(),
  categories: z.array(importCategorySchema).optional(),
  problems: z.array(importProblemSchema),
  attempts: z.array(importAttemptSchema).optional(),
})

export type ImportFile = z.infer<typeof importFileSchema>
export type ImportProblem = z.infer<typeof importProblemSchema>
export type ImportFileInput = z.input<typeof importFileSchema>

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'

/** settings 테이블 키. 값 타입은 SettingValue로 묶어 둔다 */
export interface SettingValue {
  /** 자동 백업 폴더. File System Access API 핸들은 IndexedDB에 그대로 저장된다 */
  backupDir: FileSystemDirectoryHandle
  /** 마지막 자동 백업 완료 시각 */
  backupLastAt: number
  /** Anki 내보내기에서 문제별로 고른 빈칸 자리. 풀이 HTML의 텍스트 노드 순번 + 글자 범위 + 그때 글자 */
  ankiBlanks: Record<string, Array<{ node: number; start: number; end: number; text: string }>>
}
export type SettingKey = keyof SettingValue

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue[K] | undefined> {
  const row = await db.settings.get(key)
  return row?.value as SettingValue[K] | undefined
}

export async function setSetting<K extends SettingKey>(key: K, value: SettingValue[K]): Promise<void> {
  await db.settings.put({ key, value })
}

export async function removeSetting(key: SettingKey): Promise<void> {
  await db.settings.delete(key)
}

/** 설정 값을 라이브로 읽는다. 로딩 중이면 undefined, 없으면 null */
export function useSetting<K extends SettingKey>(key: K): SettingValue[K] | null | undefined {
  return useLiveQuery(async () => ((await getSetting(key)) ?? null) as SettingValue[K] | null, [key])
}

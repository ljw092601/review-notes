/**
 * File System Access API 얇은 래퍼. Chrome·Edge에서만 동작한다.
 * lib.dom에 없는 showDirectoryPicker / queryPermission / requestPermission 타입을 여기서 선언한다.
 */

export type PermissionState = 'granted' | 'prompt' | 'denied'

interface HandlePermissionDescriptor {
  mode?: 'read' | 'readwrite'
}

declare global {
  interface FileSystemHandle {
    queryPermission?(descriptor?: HandlePermissionDescriptor): Promise<PermissionState>
    requestPermission?(descriptor?: HandlePermissionDescriptor): Promise<PermissionState>
  }
  interface Window {
    showDirectoryPicker?(options?: { id?: string; mode?: 'read' | 'readwrite'; startIn?: string }): Promise<FileSystemDirectoryHandle>
  }
}

/** 이 브라우저가 폴더 선택·쓰기를 지원하는가 */
export function isFsAccessSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'
}

/** 폴더 선택 대화상자. 사용자가 취소하면 null */
export async function pickDirectory(id = 'reviewnotes-backup'): Promise<FileSystemDirectoryHandle | null> {
  if (!window.showDirectoryPicker) throw new Error('이 브라우저는 폴더 저장을 지원하지 않아요 (Chrome·Edge에서 쓸 수 있어요)')
  try {
    return await window.showDirectoryPicker({ id, mode: 'readwrite' })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return null
    throw e
  }
}

/** 지금 권한 상태. 묻지 않는다 */
export async function queryPermission(handle: FileSystemHandle, mode: 'read' | 'readwrite' = 'readwrite'): Promise<PermissionState> {
  if (!handle.queryPermission) return 'granted'
  return handle.queryPermission({ mode })
}

/** 권한을 요청한다. 사용자 클릭 안에서 불러야 브라우저가 물어본다 */
export async function requestPermission(handle: FileSystemHandle, mode: 'read' | 'readwrite' = 'readwrite'): Promise<PermissionState> {
  if ((await queryPermission(handle, mode)) === 'granted') return 'granted'
  if (!handle.requestPermission) return 'denied'
  return handle.requestPermission({ mode })
}

/** 파일 전체를 덮어쓴다 */
export async function writeFile(dir: FileSystemDirectoryHandle, name: string, data: Blob | string): Promise<void> {
  const handle = await dir.getFileHandle(name, { create: true })
  const stream = await handle.createWritable()
  try {
    await stream.write(data)
  } finally {
    await stream.close()
  }
}

/** 파일이 없으면 null */
export async function readFile(dir: FileSystemDirectoryHandle, name: string): Promise<File | null> {
  try {
    const handle = await dir.getFileHandle(name)
    return await handle.getFile()
  } catch (e) {
    if (e instanceof DOMException && e.name === 'NotFoundError') return null
    throw e
  }
}

export async function fileExists(dir: FileSystemDirectoryHandle, name: string): Promise<boolean> {
  try {
    await dir.getFileHandle(name)
    return true
  } catch (e) {
    if (e instanceof DOMException && e.name === 'NotFoundError') return false
    throw e
  }
}

/** 폴더 안 파일 이름 목록(하위 폴더 제외) */
export async function listFiles(dir: FileSystemDirectoryHandle): Promise<string[]> {
  const names: string[] = []
  for await (const [name, handle] of dir) if (handle.kind === 'file') names.push(name)
  return names
}

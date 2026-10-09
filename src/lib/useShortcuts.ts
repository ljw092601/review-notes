import { useEffect } from 'react'

export interface Shortcut {
  /** KeyboardEvent.key 값. 'Escape', '?', 'n' 등 */
  key: string
  label: string
  /** 입력란에 포커스가 있어도 동작시킬지 (기본 false) */
  inInputs?: boolean
  run: (e: KeyboardEvent) => void
}

export function isTypingTarget(el: Element | null): boolean {
  if (!el) return false
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true
  return el instanceof HTMLElement && el.isContentEditable
}

/** 전역 단축키. 수정키(Ctrl/Alt/Meta)가 눌린 조합은 브라우저에 맡긴다. */
export function useShortcuts(shortcuts: Shortcut[], enabled = true) {
  useEffect(() => {
    if (!enabled) return
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return
      const typing = isTypingTarget(document.activeElement)
      for (const s of shortcuts) {
        if (s.key !== e.key) continue
        if (typing && !s.inInputs) continue
        e.preventDefault()
        s.run(e)
        return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shortcuts, enabled])
}

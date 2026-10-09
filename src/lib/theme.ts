import { useSyncExternalStore } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_KEY = 'reviewnotes.theme'
const PREFS: ThemePreference[] = ['system', 'light', 'dark']
const listeners = new Set<() => void>()

export const THEME_LABEL: Record<ThemePreference, string> = {
  system: '시스템 설정 따름',
  light: '밝은 테마',
  dark: '어두운 테마',
}

export function getPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return PREFS.includes(v as ThemePreference) ? (v as ThemePreference) : 'system'
  } catch {
    return 'system'
  }
}

function systemTheme(): ResolvedTheme {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveTheme(pref = getPreference()): ResolvedTheme {
  return pref === 'system' ? systemTheme() : pref
}

/** <html data-theme>를 확정값(light/dark)으로 맞춘다. index.html의 인라인 스크립트와 같은 규칙. */
export function applyTheme(pref = getPreference()): void {
  document.documentElement.dataset.theme = resolveTheme(pref)
}

export function setPreference(pref: ThemePreference): void {
  try {
    if (pref === 'system') localStorage.removeItem(THEME_KEY)
    else localStorage.setItem(THEME_KEY, pref)
  } catch {
    /* 사생활 보호 모드 등: 이번 세션에만 적용 */
  }
  applyTheme(pref)
  for (const l of listeners) l()
}

export function nextPreference(pref: ThemePreference): ThemePreference {
  return PREFS[(PREFS.indexOf(pref) + 1) % PREFS.length]
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : undefined
  const onSystem = () => {
    if (getPreference() === 'system') applyTheme('system')
    cb()
  }
  mq?.addEventListener('change', onSystem)
  return () => {
    listeners.delete(cb)
    mq?.removeEventListener('change', onSystem)
  }
}

export function useTheme(): { preference: ThemePreference; resolved: ResolvedTheme; set: (p: ThemePreference) => void; cycle: () => void } {
  const preference = useSyncExternalStore(subscribe, getPreference, () => 'system' as const)
  return {
    preference,
    resolved: resolveTheme(preference),
    set: setPreference,
    cycle: () => setPreference(nextPreference(preference)),
  }
}

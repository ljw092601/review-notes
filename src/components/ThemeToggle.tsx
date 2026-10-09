import { Monitor, Moon, Sun } from 'lucide-react'
import { THEME_LABEL, nextPreference, useTheme } from '@/lib/theme'

const ICON = { system: Monitor, light: Sun, dark: Moon } as const

/** 시스템 → 밝게 → 어둡게 순서로 도는 버튼. 현재 상태가 라벨이고, 누르면 다음 상태로. */
export function ThemeToggle() {
  const { preference, cycle } = useTheme()
  const Icon = ICON[preference]
  const next = THEME_LABEL[nextPreference(preference)]
  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`테마: ${THEME_LABEL[preference]}. 누르면 ${next}`}
      title={`${THEME_LABEL[preference]} (클릭: ${next})`}
      className="hidden size-9 shrink-0 items-center sm:flex justify-center rounded-control text-ink-2 transition-[background-color,color] duration-(--dur-micro) hover:bg-paper-2 hover:text-ink active:translate-y-px"
    >
      <Icon className="size-[18px]" aria-hidden />
    </button>
  )
}

import { Moon, Sun } from '@phosphor-icons/react'

import { useTheme } from '@workspace/ui/components/theme-provider'

import { useContent } from '@/lib/use-locale.js'

export function ThemeToggle() {
  const { navActions } = useContent()
  const { setTheme } = useTheme()

  const toggle = () => {
    const dark = document.documentElement.classList.contains('dark')
    setTheme(dark ? 'light' : 'dark')
  }

  const glyph =
    'absolute inset-0 m-auto transition-opacity duration-200 motion-reduce:transition-none'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={navActions.themeToggle}
      className="border-line-2 bg-surface text-ink relative size-10 shrink-0 rounded-full border transition-[color,background-color,transform] duration-200 hover:bg-surface-2 active:scale-[0.98]"
    >
      <Sun aria-hidden className={`${glyph} opacity-100 dark:opacity-0`} />
      <Moon aria-hidden className={`${glyph} opacity-0 dark:opacity-100`} />
    </button>
  )
}

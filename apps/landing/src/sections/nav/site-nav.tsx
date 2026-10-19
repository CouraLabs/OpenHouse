import { House } from '@phosphor-icons/react'

import { ButtonLink } from '@/components/button-link.js'
import { useContent } from '@/lib/use-locale.js'

import { LocaleToggle } from './locale-toggle.js'
import { ThemeToggle } from './theme-toggle.js'

/**
 * The sticky top bar: wordmark, section links (hidden below `md`), the locale
 * and theme toggles, and the two account actions. The only blur on the page lives here.
 */
export function SiteNav() {
  const { navActions, navLinks } = useContent()
  return (
    <header className="border-line bg-canvas/80 sticky top-0 z-40 border-b backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-6 px-6">
        <a
          href="#top"
          className="text-ink flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <House aria-hidden size={18} />
          OpenHouse
        </a>
        <ul className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="hover:text-ink text-sm text-muted transition-colors"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-4">
          <LocaleToggle />
          <ThemeToggle />
          <a
            href={navActions.signIn.href}
            className="hover:text-ink hidden text-sm text-muted transition-colors sm:inline"
          >
            {navActions.signIn.label}
          </a>
          <ButtonLink href={navActions.start.href} className="h-8 px-3">
            {navActions.start.label}
          </ButtonLink>
        </div>
      </nav>
    </header>
  )
}

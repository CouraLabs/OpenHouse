import { ButtonLink } from '@/components/button-link.js'
import { LogoTile } from '@/components/logo-tile.js'
import { Wordmark } from '@/components/wordmark.js'
import { useContent } from '@/lib/use-locale.js'

import { LocaleToggle } from './locale-toggle.js'
import { NavMenu } from './nav-menu.js'
import { ThemeToggle } from './theme-toggle.js'

export function SiteNav() {
  const { navActions, navLinks } = useContent()
  return (
    <header className="sticky top-0 z-40 px-3 pt-3">
      <nav className="mx-auto flex h-14 max-w-(--max) items-center justify-between gap-3 rounded-full bg-(--nav-glass) pr-2 pl-3 shadow-(--shadow-soft) ring-1 ring-(--line) backdrop-blur-[18px] backdrop-saturate-[1.4] sm:gap-6">
        <a href="#top" className="flex items-center gap-2.5">
          <LogoTile />
          <Wordmark />
        </a>
        <ul className="hidden items-center gap-0.5 lg:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="hover:text-ink rounded-full px-3 py-2 text-[0.875rem] whitespace-nowrap text-muted transition-colors duration-150 hover:bg-surface-2"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <NavMenu />
          <LocaleToggle />
          <span className="max-sm:hidden">
            <ThemeToggle />
          </span>
          <a
            href={navActions.signIn.href}
            className="hover:text-ink hidden px-2 text-[0.875rem] whitespace-nowrap text-muted transition-colors sm:inline"
          >
            {navActions.signIn.label}
          </a>
          <ButtonLink
            href={navActions.start.href}
            className="h-10 px-4 text-[0.875rem] max-[380px]:px-3"
          >
            {navActions.start.label}
          </ButtonLink>
        </div>
      </nav>
    </header>
  )
}

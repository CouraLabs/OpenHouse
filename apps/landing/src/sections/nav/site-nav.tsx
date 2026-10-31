import { ButtonLink } from '@/components/button-link.js'
import { Tick } from '@/components/tick.js'
import { Wordmark } from '@/components/wordmark.js'
import { HouseGlyph } from '@/components/house-glyph.js'
import { useContent } from '@/lib/use-locale.js'

import { LocaleToggle } from './locale-toggle.js'
import { NavMenu } from './nav-menu.js'
import { ThemeToggle } from './theme-toggle.js'

export function SiteNav() {
  const { navActions, navLinks } = useContent()
  return (
    <header className="border-line sticky top-0 z-40 border-b bg-(--nav-glass) backdrop-blur-[18px] backdrop-saturate-[1.4]">
      <nav className="border-line relative mx-auto flex h-16 max-w-(--max) items-center justify-between gap-3 border-x px-(--pad) sm:gap-6">
        <Tick x="0" y="100%" />
        <Tick x="100%" y="100%" />
        <a href="#top" className="text-ink flex items-center gap-2">
          <HouseGlyph plot weight={5} className="size-6" />
          <Wordmark />
        </a>
        <ul className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="hover:bg-bone hover:text-ink text-body rounded-full px-3 py-[7px] font-mono text-[0.82rem] whitespace-nowrap transition-colors duration-200"
              >
                {`/${link.label.toLowerCase().replaceAll(' ', '-')}`}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 sm:gap-4">
          <NavMenu />
          <LocaleToggle />
          <ThemeToggle />
          <a
            href={navActions.signIn.href}
            className="hover:text-ink hidden text-sm whitespace-nowrap text-muted transition-colors sm:inline"
          >
            {navActions.signIn.label}
          </a>
          <ButtonLink
            href={navActions.start.href}
            className="h-[34px] px-4 text-[0.9rem]"
          >
            {navActions.start.label}
          </ButtonLink>
        </div>
      </nav>
    </header>
  )
}

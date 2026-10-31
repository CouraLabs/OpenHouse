import { useEffect, useId, useState } from 'react'
import { List, X } from '@phosphor-icons/react'

import { useContent } from '@/lib/use-locale.js'

export function NavMenu() {
  const { navActions, navLinks } = useContent()
  const [open, setOpen] = useState(false)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={navActions.menu}
        onClick={() => setOpen((value) => !value)}
        className="border-line-2 hover:bg-ink hover:text-on-ink text-ink aria-expanded:bg-ink aria-expanded:text-on-ink relative inline-flex size-[38px] shrink-0 items-center justify-center rounded-full border transition-[color,background-color] duration-200"
      >
        {open ? <X aria-hidden /> : <List aria-hidden />}
      </button>
      <ol
        id={panelId}
        hidden={!open}
        className="border-line bg-canvas absolute inset-x-0 top-full border-y"
      >
        {navLinks.map((link) => (
          <li key={link.href} className="border-line border-b last:border-b-0">
            <a
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-ink hover:bg-ink hover:text-on-ink block px-(--pad) py-4 font-mono text-[0.95rem] transition-colors duration-200"
            >
              {`/${link.label.toLowerCase().replaceAll(' ', '-')}`}
            </a>
          </li>
        ))}
      </ol>
    </div>
  )
}

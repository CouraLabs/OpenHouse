import { House } from '@phosphor-icons/react'

import { footer } from '@/lib/content.js'

/** Wordmark and tagline, the footer links, and the copyright line. */
export function SiteFooter() {
  return (
    <footer className="border-line border-t px-6 py-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-ink flex items-center gap-2 text-sm font-semibold">
            <House aria-hidden size={18} />
            OpenHouse
          </span>
          <span className="text-sm text-muted">{footer.tagline}</span>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <ul className="flex flex-wrap gap-6">
            {footer.links.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="hover:text-ink text-sm text-muted transition-colors"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <span className="font-mono text-xs text-muted">
            {footer.copyright}
          </span>
        </div>
      </div>
    </footer>
  )
}

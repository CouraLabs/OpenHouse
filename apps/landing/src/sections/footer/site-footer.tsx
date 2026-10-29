import { HouseGlyph } from '@/components/house-glyph.js'
import { Wordmark } from '@/components/wordmark.js'
import { Tick } from '@/components/tick.js'
import { useContent } from '@/lib/use-locale.js'

/** Wordmark and tagline, the footer links, and the copyright line. */
export function SiteFooter() {
  const { footer } = useContent()
  return (
    <footer className="cell relative px-(--pad) py-12">
      <Tick x="0" y="0" />
      <Tick x="100%" y="0" />
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-ink flex items-center gap-2">
            <HouseGlyph weight={5} className="size-5" />
            <Wordmark />
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

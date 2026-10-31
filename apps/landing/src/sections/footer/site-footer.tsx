import { LogoTile } from '@/components/logo-tile.js'
import { Wordmark } from '@/components/wordmark.js'
import { useContent } from '@/lib/use-locale.js'

export function SiteFooter() {
  const { footer } = useContent()
  return (
    <footer className="px-(--pad) pt-4 pb-10">
      <div className="bg-chrome text-chrome-ink flex flex-col gap-8 rounded-3xl p-8 md:flex-row md:items-end md:justify-between md:p-10">
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-2.5">
            <LogoTile />
            <Wordmark className="text-chrome-ink" />
          </span>
          <span className="text-chrome-muted text-sm">{footer.tagline}</span>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <ul className="flex flex-wrap gap-6">
            {footer.links.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="text-chrome-muted text-sm transition-colors hover:text-white"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <span className="text-chrome-muted text-xs">{footer.copyright}</span>
        </div>
      </div>
    </footer>
  )
}

import { cn } from 'cn'
import { Trans } from 'react-i18next'

/**
 * The OpenHouse wordmark in Jost (DESIGN.md): "Open" at 500 in the soft
 * wordmark gray, "House" at 600 in full ink.
 */
export function BrandName({ className }: { className?: string }) {
  return (
    <span className={cn('font-sans font-semibold text-foreground', className)}>
      <Trans
        i18nKey="app.name-styled"
        components={{
          accent: <span className="font-medium text-wordmark-soft" />,
        }}
      />
    </span>
  )
}

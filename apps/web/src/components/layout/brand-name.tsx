import { cn } from 'cn'
import { Trans } from 'react-i18next'

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

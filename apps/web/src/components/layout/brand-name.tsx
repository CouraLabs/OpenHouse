import { cn } from 'cn'
import { Trans } from 'react-i18next'

export function BrandName({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'font-sans font-bold tracking-[-0.02em] text-foreground',
        className
      )}
    >
      <Trans
        i18nKey="app.name-styled"
        components={{
          accent: <span className="font-bold text-brand" />,
        }}
      />
    </span>
  )
}

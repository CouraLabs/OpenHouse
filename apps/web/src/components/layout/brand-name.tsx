import { Trans } from 'react-i18next'

/** The app name with its "Open" in the brand accent color. */
export function BrandName({ className }: { className?: string }) {
  return (
    <span className={className}>
      <Trans
        i18nKey="app.name-styled"
        components={{ accent: <span className="text-primary" /> }}
      />
    </span>
  )
}

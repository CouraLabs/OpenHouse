import { useTranslation } from 'react-i18next'
import type { ImportPreview } from '@workspace/dto'

import type { ResolvedRow } from './import-rows.js'

export function ImportPreviewSummary({
  preview,
  rows,
}: {
  preview: ImportPreview
  rows: ResolvedRow[]
}) {
  const { t } = useTranslation()
  const selected = rows.filter((entry) => entry.selected).length
  const imported = rows.filter(
    (entry) => entry.row.duplicate?.kind === 'external'
  ).length
  const probable = rows.filter(
    (entry) => entry.row.duplicate?.kind === 'probable'
  ).length
  const payments = rows.filter((entry) => entry.row.billPayment).length

  return (
    <div className="flex flex-col gap-1 text-sm">
      <p>{t('imports.summary', { selected, total: rows.length })}</p>
      {imported > 0 ? (
        <p className="text-muted-foreground">
          {t('imports.summary-imported', { count: imported })}
        </p>
      ) : null}
      {probable > 0 ? (
        <p className="text-muted-foreground">
          {t('imports.summary-probable', { count: probable })}
        </p>
      ) : null}
      {payments > 0 ? (
        <p className="text-muted-foreground">
          {t('imports.summary-payments', { count: payments })}
        </p>
      ) : null}
      {preview.invalidCount > 0 ? (
        <p className="text-amber-700 dark:text-amber-400">
          {t('imports.summary-invalid', {
            count: preview.invalidCount,
            lines: preview.invalid
              .slice(0, 10)
              .map((line) => line.line)
              .join(', '),
          })}
        </p>
      ) : null}
    </div>
  )
}

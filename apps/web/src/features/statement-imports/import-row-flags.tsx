import { useTranslation } from 'react-i18next'
import type { ImportPreviewRow } from '@workspace/poco'
import { Badge } from '@workspace/ui/components/badge'

import { formatDayLabel } from '@/lib/format-date-only.js'

/** The badges under a preview row's description: why it is flagged. */
export function ImportRowFlags({ row }: { row: ImportPreviewRow }) {
  const { t, i18n } = useTranslation()

  return (
    <div className="flex flex-wrap gap-1">
      {row.duplicate?.kind === 'external' ? (
        <Badge variant="destructive">{t('imports.flag-imported')}</Badge>
      ) : null}
      {row.duplicate?.kind === 'probable' ? (
        <Badge
          variant="outline"
          title={t('imports.flag-probable-title', {
            name: row.duplicate.name,
            date: formatDayLabel(row.duplicate.transactionDt, i18n.language),
          })}
        >
          {t('imports.flag-probable')}
        </Badge>
      ) : null}
      {row.billPayment ? (
        <Badge variant="secondary">{t('imports.flag-bill-payment')}</Badge>
      ) : null}
      {row.pending ? (
        <Badge variant="outline">{t('imports.flag-pending')}</Badge>
      ) : null}
    </div>
  )
}

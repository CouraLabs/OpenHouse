import type { StatementStatus } from '@workspace/dto'
import { Badge } from '@workspace/ui/components/badge'
import { useTranslation } from 'react-i18next'

const VARIANTS: Record<
  StatementStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  Open: 'secondary',
  Closed: 'default',
  PartiallyPaid: 'default',
  Overdue: 'destructive',
  Paid: 'outline',
}

export function StatementStatusBadge({
  status,
  amountDue,
}: {
  status: StatementStatus
  amountDue?: string
}) {
  const { t } = useTranslation()

  if (amountDue !== undefined && Number(amountDue) < 0) {
    return <Badge variant="outline">{t('bills.status-credit')}</Badge>
  }

  return (
    <Badge variant={VARIANTS[status]}>
      {t(`bills.status-${status.toLowerCase()}`)}
    </Badge>
  )
}

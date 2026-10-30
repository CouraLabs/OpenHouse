import type { StatementStatus } from '@workspace/poco'
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

export function StatementStatusBadge({ status }: { status: StatementStatus }) {
  const { t } = useTranslation()

  return (
    <Badge variant={VARIANTS[status]}>
      {t(`bills.status-${status.toLowerCase()}`)}
    </Badge>
  )
}

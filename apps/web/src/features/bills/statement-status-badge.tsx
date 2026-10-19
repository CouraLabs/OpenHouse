import type { StatementStatus } from '@workspace/poco'
import { Badge } from '@workspace/ui/components/badge'
import { useTranslation } from 'react-i18next'

/** How loud each status reads: overdue alarms, open and paid stay calm. */
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

/** A bill's derived status as a badge. */
export function StatementStatusBadge({ status }: { status: StatementStatus }) {
  const { t } = useTranslation()

  return (
    <Badge variant={VARIANTS[status]}>
      {t(`bills.status-${status.toLowerCase()}`)}
    </Badge>
  )
}

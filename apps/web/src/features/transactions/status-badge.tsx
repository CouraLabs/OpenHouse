import { useTranslation } from 'react-i18next'
import type { Transaction, TransactionStatus } from '@workspace/poco'
import { transactionStatuses } from '@workspace/poco'
import { Badge } from '@workspace/ui/components/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'

/** The review workflow's badge: Verify neutral, Checked green, Canceled
 * red. Clicking it opens the other statuses — picking one changes the row
 * straight from the grid, no form needed. */
export function StatusBadge({
  status,
  onChange,
}: {
  status: Transaction['status']
  onChange: (status: TransactionStatus) => void
}) {
  const { t } = useTranslation()
  const variants = {
    Verify: 'secondary',
    Checked: 'default',
    Canceled: 'destructive',
  } as const

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('transactions.status-change')}
        className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Badge variant={variants[status]}>
          {t(`transactions.status-${status.toLowerCase()}`)}
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {transactionStatuses.map((value) => (
          <DropdownMenuItem
            key={value}
            disabled={value === status}
            onClick={() => onChange(value)}
          >
            {t(`transactions.status-${value.toLowerCase()}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

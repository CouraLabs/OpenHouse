import { useTranslation } from 'react-i18next'
import type { Transaction, TransactionStatus } from '@workspace/dto'
import { transactionStatuses } from '@workspace/dto'
import { StatusPill } from '@workspace/ui/components/status-pill'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'

export function StatusBadge({
  status,
  onChange,
}: {
  status: Transaction['status']
  onChange: (status: TransactionStatus) => void
}) {
  const { t } = useTranslation()
  const tones = {
    Verify: 'warning',
    Checked: 'positive',
    Canceled: 'neutral',
  } as const

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('transactions.status-change')}
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <StatusPill tone={tones[status]} dot>
          {t(`transactions.status-${status.toLowerCase()}`)}
        </StatusPill>
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

import type { CreditMode } from '@workspace/dto'
import { ArrowLeftRight, Ellipsis } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  ExportCsvMenuItem,
  type ExportCsv,
} from '@/components/export-csv-button.js'

export function TransactionsMoreMenu({
  exportArgs,
  csv,
  creditMode,
  onCreditModeChange,
  onTransfer,
  labels,
}: {
  exportArgs: object
  csv: ExportCsv
  creditMode: CreditMode
  onCreditModeChange: (mode: CreditMode) => void
  onTransfer: () => void
  labels: {
    trigger: string
    transfer: string
    mode: string
    accrual: string
    cash: string
  }
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            aria-label={labels.trigger}
            title={labels.trigger}
          />
        }
      >
        <Ellipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuItem className="md:hidden" onClick={onTransfer}>
          <ArrowLeftRight />
          {labels.transfer}
        </DropdownMenuItem>
        <ExportCsvMenuItem
          path="/transactions/export"
          args={exportArgs}
          csv={csv}
        />
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>{labels.mode}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={creditMode}
            onValueChange={(next) => onCreditModeChange(next as CreditMode)}
          >
            <DropdownMenuRadioItem value="accrual">
              {labels.accrual}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="cash">
              {labels.cash}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

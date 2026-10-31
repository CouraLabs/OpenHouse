import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Account } from '@workspace/dto'
import { DatePicker } from '@workspace/ui/components/date-picker'
import { Field, FieldLabel } from '@workspace/ui/components/field'

import { formatDateOnly, parseDateOnly } from '@/lib/format-date-only.js'
import { useTenantToday } from '@/lib/settings.js'
import { BalanceHistoryChart } from './balance-history-chart.js'
import { useBalanceHistory } from './use-reconciliation.js'
import { formattingLocale } from '@/lib/i18n.js'

const DEFAULT_DAYS = 30

function shiftDay(day: string, days: number): string {
  const at = Date.parse(`${day}T00:00:00Z`) + days * 86_400_000

  return new Date(at).toISOString().slice(0, 10)
}

export function BalanceHistoryBody({ account }: { account: Account }) {
  const { t } = useTranslation()
  const today = useTenantToday()
  const [from, setFrom] = useState(() => shiftDay(today, 1 - DEFAULT_DAYS))
  const [to, setTo] = useState(today)
  const history = useBalanceHistory(account.id, { from, to })

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor="history-from">
            {t('accounts.history-from')}
          </FieldLabel>
          <DatePicker
            id="history-from"
            locale={formattingLocale()}
            value={parseDateOnly(from)}
            onChange={(picked) => setFrom(formatDateOnly(picked))}
            labels={{
              placeholder: t('accounts.history-from'),
              today: t('accounts.today'),
            }}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="history-to">
            {t('accounts.history-to')}
          </FieldLabel>
          <DatePicker
            id="history-to"
            locale={formattingLocale()}
            value={parseDateOnly(to)}
            onChange={(picked) => setTo(formatDateOnly(picked))}
            labels={{
              placeholder: t('accounts.history-to'),
              today: t('accounts.today'),
            }}
          />
        </Field>
      </div>
      {from > to ? (
        <p className="text-sm text-destructive">
          {t('accounts.history-range-invalid')}
        </p>
      ) : history.isError ? (
        <p className="text-sm text-destructive">
          {history.error instanceof Error
            ? history.error.message
            : t('accounts.error')}
        </p>
      ) : history.data !== undefined ? (
        <BalanceHistoryChart history={history.data} />
      ) : (
        <p className="text-sm text-muted-foreground">
          {t('accounts.history-loading')}
        </p>
      )}
    </div>
  )
}

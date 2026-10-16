import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@workspace/ui/components/button'

/**
 * The `[<] Month Year [>]` navigator: one month at a time, defaulting to
 * the current one. Moving a month re-derives the search's date range, so
 * the page holds the anchor and reads the range off it.
 */
export function MonthFilter({
  label,
  onPrevious,
  onNext,
}: {
  /** The month's label, already localized by the page. */
  label: string
  onPrevious: () => void
  onNext: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-1 rounded-lg border p-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('transactions.month-previous')}
        title={t('transactions.month-previous')}
        onClick={onPrevious}
      >
        <ChevronLeft />
      </Button>
      <span className="min-w-36 text-center text-sm font-medium">{label}</span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('transactions.month-next')}
        title={t('transactions.month-next')}
        onClick={onNext}
      >
        <ChevronRight />
      </Button>
    </div>
  )
}

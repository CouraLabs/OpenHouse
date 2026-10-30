import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@workspace/ui/components/button'

export function MonthFilter({
  label,
  onPrevious,
  onNext,
}: {
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
      <span className="min-w-32 text-center text-sm font-medium md:min-w-36">{label}</span>
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

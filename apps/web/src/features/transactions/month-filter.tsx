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
    <div className="flex h-10 items-center gap-1 rounded-full border border-border bg-card p-1 shadow-[0_1px_2px_rgb(0_0_0/0.04)] dark:border-input dark:shadow-none">
      <Button
        variant="ghost"
        size="icon-sm"
        className="size-8"
        aria-label={t('transactions.month-previous')}
        title={t('transactions.month-previous')}
        onClick={onPrevious}
      >
        <ChevronLeft />
      </Button>
      <span className="min-w-32 text-center text-sm font-medium md:min-w-36">
        {label}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        className="size-8"
        aria-label={t('transactions.month-next')}
        title={t('transactions.month-next')}
        onClick={onNext}
      >
        <ChevronRight />
      </Button>
    </div>
  )
}

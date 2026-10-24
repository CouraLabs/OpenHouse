import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@workspace/ui/components/button'

/** Previous/next over the pages of the preview table. Renders nothing when
 * everything fits on one page. */
export function ImportPager({
  pageIndex,
  pageCount,
  onChange,
}: {
  pageIndex: number
  pageCount: number
  onChange: (pageIndex: number) => void
}) {
  const { t } = useTranslation()

  if (pageCount <= 1) {
    return null
  }

  return (
    <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
      <span>
        {t('imports.page-of', { page: pageIndex + 1, count: pageCount })}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={t('imports.previous-page')}
        disabled={pageIndex === 0}
        onClick={() => onChange(pageIndex - 1)}
      >
        <ChevronLeft />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={t('imports.next-page')}
        disabled={pageIndex >= pageCount - 1}
        onClick={() => onChange(pageIndex + 1)}
      >
        <ChevronRight />
      </Button>
    </div>
  )
}

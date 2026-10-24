import { useMutation } from '@tanstack/react-query'
import { Button } from '@workspace/ui/components/button'
import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { apiFile } from '@/lib/api.js'
import { csvLocaleOf } from '@/lib/csv-locale.js'
import { saveFile } from '@/lib/save-file.js'

/** The props `ExportCsvButton` takes. */
interface ExportCsvButtonProps {
  /** The entity's export route, e.g. `/receivers/export`. */
  path: string
  /** The page's current search args — filters and sort; paging is ignored
   * by the API. */
  args: object
}

/**
 * The toolbar button every list page carries: downloads the rows the page's
 * current filters match as a CSV, streamed by the API in the interface's
 * locale (pt-BR: `;`, decimal comma, DD/MM/YYYY; otherwise `,`, `.`, ISO).
 */
export function ExportCsvButton({ path, args }: ExportCsvButtonProps) {
  const { t, i18n } = useTranslation()
  const exportCsv = useMutation({
    mutationFn: () =>
      apiFile(
        path,
        {
          method: 'POST',
          body: JSON.stringify({ ...args, locale: csvLocaleOf(i18n.language) }),
        },
        'export.csv'
      ),
    onSuccess: saveFile,
  })

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        disabled={exportCsv.isPending}
        onClick={() => exportCsv.mutate()}
      >
        <Download />
        {exportCsv.isPending ? t('export.csv-pending') : t('export.csv')}
      </Button>
      {exportCsv.isError ? (
        <p role="alert" className="text-xs text-destructive">
          {t('export.csv-error')}
        </p>
      ) : null}
    </div>
  )
}

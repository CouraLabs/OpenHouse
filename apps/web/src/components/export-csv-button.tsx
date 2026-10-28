import { useMutation } from '@tanstack/react-query'
import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenuItem,
} from '@workspace/ui/components/dropdown-menu'
import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { apiFile } from '@/lib/api.js'
import { csvLocaleOf } from '@/lib/csv-locale.js'
import { saveFile } from '@/lib/save-file.js'
import { formattingLocale } from '@/lib/i18n.js'

/** What the export mutation exposes to whichever control renders it. */
export interface ExportCsv {
  isPending: boolean
  isError: boolean
  trigger: () => void
}

/** The props `ExportCsvButton` takes. */
interface ExportCsvButtonProps {
  /** The entity's export route, e.g. `/receivers/export`. */
  path: string
  /** The page's current search args — filters and sort; paging is ignored
   * by the API. */
  args: object
  /** A mutation the page already holds, so a second control (e.g. a
   * mobile overflow menu item) shares its state and error. */
  csv?: ExportCsv
}

/** The export mutation every list page's toolbar carries: downloads the
 * rows the page's current filters match as a CSV, streamed by the API in
 * the interface's locale (pt-BR: `;`, decimal comma, DD/MM/YYYY; otherwise
 * `,`, `.`, ISO). */
export function useExportCsv(path: string, args: object): ExportCsv {
  const exportCsv = useMutation({
    mutationFn: () =>
      apiFile(
        path,
        {
          method: 'POST',
          body: JSON.stringify({ ...args, locale: csvLocaleOf(formattingLocale()) }),
        },
        'export.csv'
      ),
    onSuccess: saveFile,
  })

  return {
    isPending: exportCsv.isPending,
    isError: exportCsv.isError,
    trigger: () => exportCsv.mutate(),
  }
}

/**
 * The toolbar button: downloads the page's rows as a CSV. The pending
 * state names itself and an error is announced under the button.
 */
export function ExportCsvButton({ path, args, csv }: ExportCsvButtonProps) {
  const localCsv = useExportCsv(path, args)
  const state = csv ?? localCsv
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" disabled={state.isPending} onClick={state.trigger}>
        <Download />
        {state.isPending ? t('export.csv-pending') : t('export.csv')}
      </Button>
      {state.isError ? (
        <p role="alert" className="text-xs text-destructive">
          {t('export.csv-error')}
        </p>
      ) : null}
    </div>
  )
}

/** The same export as an overflow-menu item, sharing the page's mutation
 * state so the pending and error states match the button's. */
export function ExportCsvMenuItem({
  path,
  args,
  csv,
}: {
  path: string
  args: object
  csv?: ExportCsv
}) {
  const localCsv = useExportCsv(path, args)
  const state = csv ?? localCsv
  const { t } = useTranslation()

  return (
    <DropdownMenuItem disabled={state.isPending} onClick={state.trigger}>
      <Download />
      {state.isPending ? t('export.csv-pending') : t('export.csv')}
    </DropdownMenuItem>
  )
}

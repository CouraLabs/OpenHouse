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

export interface ExportCsv {
  isPending: boolean
  isError: boolean
  trigger: () => void
}

interface ExportCsvButtonProps {
  path: string
  args: object
  csv?: ExportCsv
}

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

import type { TransactionLinker } from '@workspace/poco'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import type { DataTableColumn } from '@workspace/ui/components/data-table'
import { Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface LinkerRowActions {
  onEdit: (linker: TransactionLinker) => void
  onDelete: (linker: TransactionLinker) => void
}

export function buildLinkerColumns(
  t: (key: string) => string,
  actions: LinkerRowActions
): Array<DataTableColumn<TransactionLinker>> {
  return [
    {
      accessorKey: 'description',
      header: t('linkers.description'),
    },
    {
      accessorKey: 'categoryName',
      header: t('linkers.category'),
    },
    {
      accessorKey: 'receiverName',
      header: t('linkers.receiver'),
      cell: (context) =>
        context.row.original.receiverName === null ? (
          <Badge variant="outline">{t('linkers.receiver-placeholder')}</Badge>
        ) : (
          context.row.original.receiverName
        ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: (context) => (
        <LinkerActionsCell linker={context.row.original} actions={actions} />
      ),
    },
  ]
}

function LinkerActionsCell({
  linker,
  actions,
}: {
  linker: TransactionLinker
  actions: LinkerRowActions
}) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('linkers.edit')}
        title={t('linkers.edit')}
        onClick={() => actions.onEdit(linker)}
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-destructive hover:text-destructive"
        aria-label={t('linkers.delete')}
        title={t('linkers.delete')}
        onClick={() => actions.onDelete(linker)}
      >
        <Trash2 />
      </Button>
    </div>
  )
}

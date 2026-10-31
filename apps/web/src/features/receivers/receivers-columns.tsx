import type { Receiver } from '@workspace/dto'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import type { DataTableColumn } from '@workspace/ui/components/data-table'
import { Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface ReceiverRowActions {
  onEdit: (receiver: Receiver) => void
  onDelete: (receiver: Receiver) => void
}

export function buildReceiverColumns(
  t: (key: string) => string,
  actions: ReceiverRowActions
): Array<DataTableColumn<Receiver>> {
  return [
    {
      accessorKey: 'name',
      header: t('receivers.name'),
    },
    {
      accessorKey: 'type',
      header: t('receivers.type'),
      cell: (context) => (
        <Badge variant="outline">
          {t(`receivers.type-${context.row.original.type.toLowerCase()}`)}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: (context) => (
        <ReceiverActionsCell
          receiver={context.row.original}
          actions={actions}
        />
      ),
    },
  ]
}

function ReceiverActionsCell({
  receiver,
  actions,
}: {
  receiver: Receiver
  actions: ReceiverRowActions
}) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('receivers.edit')}
        title={t('receivers.edit')}
        onClick={() => actions.onEdit(receiver)}
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-destructive hover:text-destructive"
        aria-label={t('receivers.delete')}
        title={t('receivers.delete')}
        onClick={() => actions.onDelete(receiver)}
      >
        <Trash2 />
      </Button>
    </div>
  )
}

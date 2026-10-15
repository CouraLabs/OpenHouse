import type { Category } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import type { DataTableColumn } from '@workspace/ui/components/data-table'
import { Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** What the actions column can do to a row, reported upward. */
export interface CategoryRowActions {
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}

/**
 * The columns the categories grid shows: the id, the name, the color as a
 * swatch with its hex, and the row actions. The caller owns what edit and
 * delete do; the columns only route the events. Called during the page's
 * render, so the labels arrive translated.
 */
export function buildCategoryColumns(
  t: (key: string) => string,
  actions: CategoryRowActions
): Array<DataTableColumn<Category>> {
  return [
    {
      id: 'id',
      header: '#',
      enableSorting: false,
      cell: (context) => context.row.original.id,
    },
    {
      accessorKey: 'name',
      header: t('categories.name'),
    },
    {
      id: 'color',
      header: t('categories.color'),
      enableSorting: false,
      cell: (context) => (
        <span className="inline-flex items-center gap-2">
          <span
            className="size-4 shrink-0 rounded-full border"
            style={{ backgroundColor: context.row.original.color }}
          />
          {context.row.original.color}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: (context) => (
        <CategoryActionsCell
          category={context.row.original}
          actions={actions}
        />
      ),
    },
  ]
}

/** The actions cell: the edit and delete buttons, one per row. */
function CategoryActionsCell({
  category,
  actions,
}: {
  category: Category
  actions: CategoryRowActions
}) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('categories.edit')}
        title={t('categories.edit')}
        onClick={() => actions.onEdit(category)}
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-destructive hover:text-destructive"
        aria-label={t('categories.delete')}
        title={t('categories.delete')}
        onClick={() => actions.onDelete(category)}
      >
        <Trash2 />
      </Button>
    </div>
  )
}

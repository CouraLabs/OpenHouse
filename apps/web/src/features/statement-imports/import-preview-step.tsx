import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Account, ImportCommitRow, ImportPreview } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import {
  NativeSelect,
  NativeSelectOption,
} from '@workspace/ui/components/native-select'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { ImportStepActions } from './import-step-actions.js'
import { ImportPager } from './import-pager.js'
import { ImportPreviewSummary } from './import-preview-summary.js'
import { ImportRowLine } from './import-row-line.js'
import {
  missingCategoryCount,
  resolveRows,
  toCommitRows,
  type RowEdit,
} from './import-rows.js'
import {
  useActiveCategories,
  useActiveReceivers,
} from './use-statement-imports.js'
import { formattingLocale } from '@/lib/i18n.js'

/** How many rows one page of the preview table holds. */
const PAGE_SIZE = 50

/**
 * The preview: every parsed row with its suggested category and receiver,
 * duplicate flags, the bill it lands on (a card), and an installment link.
 * The user unticks rows and edits categories and receivers in place; rows
 * with no suggestion take the category picked above the table. The edits
 * live here, so going back discards them.
 */
export function ImportPreviewStep({
  account,
  preview,
  isCommitting,
  isReading,
  error,
  reconciledThrough,
  onCommit,
  onRemap,
  onBack,
}: {
  account: Account
  preview: ImportPreview
  isCommitting: boolean
  isReading: boolean
  /** Why the last commit failed, from the API. */
  error: string | undefined
  /** The day through which the account is reconciled, when the commit asked
   * for a confirmation. */
  reconciledThrough: string | null
  onCommit: (rows: ImportCommitRow[], confirmReconciled: boolean) => void
  /** Goes back to the mapping step; only a CSV has one. */
  onRemap: (() => void) | undefined
  onBack: () => void
}) {
  const { t } = useTranslation()
  const categories = useActiveCategories()
  const receivers = useActiveReceivers()
  const [edits, setEdits] = useState<Record<number, RowEdit>>({})
  const [fallback, setFallback] = useState<number | null>(null)
  const [pageIndex, setPageIndex] = useState(0)

  const rows = resolveRows(preview.rows, edits, fallback)
  const missing = missingCategoryCount(rows)
  const selected = rows.filter((entry) => entry.selected).length
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const pageRows = rows.slice(
    pageIndex * PAGE_SIZE,
    (pageIndex + 1) * PAGE_SIZE
  )

  const edit = (index: number, change: RowEdit) =>
    setEdits((current) => ({
      ...current,
      [index]: { ...current[index], ...change },
    }))

  const selectAll = (picked: boolean) =>
    setEdits((current) =>
      Object.fromEntries(
        preview.rows.map((row) => [
          row.index,
          { ...current[row.index], selected: picked },
        ])
      )
    )

  const categoryList = categories.data ?? []
  const receiverList = receivers.data ?? []
  const canCommit = selected > 0 && missing === 0 && !isCommitting

  return (
    <div className="flex flex-col gap-4">
      <ImportPreviewSummary preview={preview} rows={rows} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Field className="w-64">
          <FieldLabel htmlFor="import-fallback-category">
            {t('imports.fallback-category')}
          </FieldLabel>
          <NativeSelect
            id="import-fallback-category"
            className="w-full"
            value={fallback === null ? '' : String(fallback)}
            onChange={(event) =>
              setFallback(
                event.target.value === '' ? null : Number(event.target.value)
              )
            }
          >
            <NativeSelectOption value="">
              {t('imports.category-pick')}
            </NativeSelectOption>
            {categoryList.map((category) => (
              <NativeSelectOption key={category.id} value={String(category.id)}>
                {category.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => selectAll(true)}
          >
            {t('imports.select-all')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => selectAll(false)}
          >
            {t('imports.select-none')}
          </Button>
        </div>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>{t('imports.col-date')}</TableHead>
              <TableHead>{t('imports.col-description')}</TableHead>
              <TableHead className="text-right">
                {t('imports.col-amount')}
              </TableHead>
              <TableHead>{t('imports.col-category')}</TableHead>
              <TableHead>{t('imports.col-receiver')}</TableHead>
              {preview.isCard ? (
                <TableHead>{t('imports.col-bill')}</TableHead>
              ) : null}
              {preview.isCard ? (
                <TableHead>{t('imports.col-installment')}</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((entry) => (
              <ImportRowLine
                key={entry.row.index}
                entry={entry}
                currency={account.currency}
                isCard={preview.isCard}
                categories={categoryList}
                receivers={receiverList}
                onEdit={edit}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      <ImportPager
        pageIndex={pageIndex}
        pageCount={pageCount}
        onChange={setPageIndex}
      />
      {missing > 0 ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          {t('imports.missing-category', { count: missing })}
        </p>
      ) : null}
      {reconciledThrough !== null ? (
        <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">
          {t('imports.reconciled-conflict', {
            date: formatDayLabel(reconciledThrough, formattingLocale(), {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }),
          })}
        </p>
      ) : null}
      {error !== undefined ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <ImportStepActions>
        <Button type="button" variant="outline" onClick={onBack}>
          {t('imports.back')}
        </Button>
        {onRemap !== undefined ? (
          <Button
            type="button"
            variant="outline"
            disabled={isReading}
            onClick={onRemap}
          >
            {t('imports.change-mapping')}
          </Button>
        ) : null}
        <Button
          type="button"
          disabled={!canCommit}
          onClick={() =>
            onCommit(toCommitRows(rows), reconciledThrough !== null)
          }
        >
          {isCommitting
            ? t('imports.importing')
            : reconciledThrough !== null
              ? t('imports.import-anyway', { count: selected })
              : t('imports.import', { count: selected })}
        </Button>
      </ImportStepActions>
    </div>
  )
}

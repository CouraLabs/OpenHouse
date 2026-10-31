import { useTranslation } from 'react-i18next'
import type { CategoryRef, Currency, ReceiverRef } from '@workspace/dto'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import {
  NativeSelect,
  NativeSelectOption,
} from '@workspace/ui/components/native-select'
import { TableCell, TableRow } from '@workspace/ui/components/table'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { formatMoney } from '@/lib/format-money.js'
import { ImportRowFlags } from './import-row-flags.js'
import type { ResolvedRow, RowEdit } from './import-rows.js'
import { formattingLocale } from '@/lib/i18n.js'

export function ImportRowLine({
  entry,
  currency,
  isCard,
  categories,
  receivers,
  onEdit,
}: {
  entry: ResolvedRow
  currency: Currency
  isCard: boolean
  categories: CategoryRef[]
  receivers: ReceiverRef[]
  onEdit: (index: number, edit: RowEdit) => void
}) {
  const { t } = useTranslation()
  const { row } = entry
  const signed = row.type === 'Expense' ? `-${row.amount}` : row.amount

  return (
    <TableRow className={entry.selected ? undefined : 'opacity-50'}>
      <TableCell>
        <Checkbox
          aria-label={t('imports.pick-row', { name: row.name })}
          checked={entry.selected}
          onCheckedChange={(checked) =>
            onEdit(row.index, { selected: checked === true })
          }
        />
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {formatDayLabel(row.transactionDt, formattingLocale(), {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
      </TableCell>
      <TableCell className="max-w-64">
        <div className="flex flex-col gap-1">
          <span className="truncate" title={row.name}>
            {row.name}
          </span>
          <ImportRowFlags row={row} />
        </div>
      </TableCell>
      <TableCell
        className={
          row.type === 'Income'
            ? 'text-right whitespace-nowrap text-positive'
            : 'text-right whitespace-nowrap'
        }
      >
        {formatMoney(signed, formattingLocale(), currency)}
      </TableCell>
      <TableCell>
        <NativeSelect
          size="sm"
          className="w-40"
          aria-label={t('imports.category-for', { name: row.name })}
          aria-invalid={entry.selected && entry.categoryId === null}
          value={entry.categoryId === null ? '' : String(entry.categoryId)}
          onChange={(event) =>
            onEdit(row.index, {
              categoryId:
                event.target.value === '' ? null : Number(event.target.value),
            })
          }
        >
          <NativeSelectOption value="">
            {t('imports.category-pick')}
          </NativeSelectOption>
          {categories.map((category) => (
            <NativeSelectOption key={category.id} value={String(category.id)}>
              {category.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </TableCell>
      <TableCell>
        <NativeSelect
          size="sm"
          className="w-36"
          aria-label={t('imports.receiver-for', { name: row.name })}
          value={entry.receiverId === null ? '' : String(entry.receiverId)}
          onChange={(event) =>
            onEdit(row.index, {
              receiverId:
                event.target.value === '' ? null : Number(event.target.value),
            })
          }
        >
          <NativeSelectOption value="">
            {t('imports.receiver-none')}
          </NativeSelectOption>
          {receivers.map((receiver) => (
            <NativeSelectOption key={receiver.id} value={String(receiver.id)}>
              {receiver.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </TableCell>
      {isCard ? (
        <TableCell className="text-sm whitespace-nowrap">
          {row.statement === null
            ? '—'
            : t('imports.bill-due', {
                date: formatDayLabel(
                  row.statement.dueDate,
                  formattingLocale(),
                  {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  }
                ),
              })}
        </TableCell>
      ) : null}
      {isCard ? (
        <TableCell className="text-sm">
          {row.installment === null ? null : (
            <Field orientation="horizontal">
              <Checkbox
                id={`import-link-${row.index}`}
                checked={entry.linked}
                onCheckedChange={(checked) =>
                  onEdit(row.index, { linked: checked === true })
                }
              />
              <FieldLabel htmlFor={`import-link-${row.index}`}>
                {t('imports.link-installment', {
                  number: row.installment.number,
                  count: row.installment.count,
                })}
              </FieldLabel>
            </Field>
          )}
        </TableCell>
      ) : null}
    </TableRow>
  )
}

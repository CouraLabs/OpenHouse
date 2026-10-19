import { useTranslation } from 'react-i18next'
import type { Currency, CurrencyChangeConflict } from '@workspace/poco'
import { ConfirmDialog } from '@workspace/ui/components/confirm-dialog'

/** The props `CurrencyChangeDialog` takes. */
interface CurrencyChangeDialogProps {
  /** What the change would re-denominate, or nothing while closed. */
  conflict: CurrencyChangeConflict | null
  /** The main currency being switched to. */
  currency: Currency
  isPending: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Asks before the main currency changes: limits and goals are denominated
 * in it, so their amounts are read in the new currency as they stand —
 * nothing is converted — and goals whose account is in another currency
 * stop tracking it.
 */
export function CurrencyChangeDialog({
  conflict,
  currency,
  isPending,
  onCancel,
  onConfirm,
}: CurrencyChangeDialogProps) {
  const { t } = useTranslation()

  const description =
    conflict === null
      ? ''
      : [
          t('settings.currency-change.description', {
            limits: t('settings.currency-change.limits', {
              count: conflict.limits,
            }),
            goals: t('settings.currency-change.goals', {
              count: conflict.goals,
            }),
            currency,
          }),
          conflict.goalsOffCurrency > 0
            ? t('settings.currency-change.off-currency', {
                count: conflict.goalsOffCurrency,
              })
            : '',
        ]
          .filter(Boolean)
          .join(' ')

  return (
    <ConfirmDialog
      open={conflict !== null}
      title={t('settings.currency-change.title', { currency })}
      description={description}
      confirmLabel={t('settings.currency-change.confirm')}
      pendingLabel={t('settings.saving')}
      cancelLabel={t('settings.cancel')}
      isPending={isPending}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}

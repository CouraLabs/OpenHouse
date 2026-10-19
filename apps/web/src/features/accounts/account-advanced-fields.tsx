import { useState, type ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { SPREAD_WARNING_PCT } from '@workspace/poco'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import { FieldDescription } from '@workspace/ui/components/field'
import { TextField } from '@workspace/ui/components/text-field'
import { ChevronRight } from 'lucide-react'

/** The props `AccountAdvancedFields` takes. */
interface AccountAdvancedFieldsProps {
  /** The spread as typed, to warn about while the user types. */
  spreadPct: string | undefined
  /** The registration of the spread input — the form owns its state. */
  spreadPctInput: Omit<ComponentProps<typeof TextField>, 'type' | 'labelFor'>
  error?: { message?: string }
}

/**
 * The account form's Advanced group, closed until asked for: the spread the
 * bank or card adds when it converts a foreign amount. Most accounts never
 * convert, so it defaults to 0 and stays out of the way. A spread above
 * `SPREAD_WARNING_PCT` is almost always a typo — the group warns, never
 * refuses. Open from the start when the account already carries a spread.
 */
export function AccountAdvancedFields({
  spreadPct,
  spreadPctInput,
  error,
}: AccountAdvancedFieldsProps) {
  const { t } = useTranslation()
  const spread = Number(spreadPct)
  const isHigh = Number.isFinite(spread) && spread > SPREAD_WARNING_PCT
  // Decided once, from the value the form opened with: typing a spread must
  // not flip the group's initial state under the user.
  const [initiallyOpen] = useState(spread > 0)

  return (
    <Collapsible defaultOpen={initiallyOpen}>
      <CollapsibleTrigger className="group flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronRight
          aria-hidden
          className="size-4 transition-transform group-data-[panel-open]:rotate-90"
        />
        {t('accounts.advanced')}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        <div className="grid grid-cols-2 items-start gap-3 md:grid-cols-4">
          <div className="flex flex-col gap-1">
            <TextField
              type="text"
              inputMode="decimal"
              className="h-8"
              label={t('accounts.spread')}
              labelFor="account-spread"
              placeholder={t('accounts.spread-placeholder')}
              error={error}
              {...spreadPctInput}
            />
            {error?.message === undefined && (
              <FieldDescription>
                {isHigh
                  ? t('accounts.spread-high', { pct: SPREAD_WARNING_PCT })
                  : t('accounts.spread-hint')}
              </FieldDescription>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

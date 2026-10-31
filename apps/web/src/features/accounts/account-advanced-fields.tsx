import { useState, type ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/collapsible'
import { FieldDescription } from '@workspace/ui/components/field'
import { TextField } from '@workspace/ui/components/text-field'
import { ChevronRight } from 'lucide-react'

import { useDebouncedValue } from '@/lib/use-debounced-value.js'
import { useAccountPreview } from './use-accounts.js'

interface AccountAdvancedFieldsProps {
  spreadPct: string | undefined
  spreadPctInput: Omit<ComponentProps<typeof TextField>, 'type' | 'labelFor'>
  error?: { message?: string }
}

export function AccountAdvancedFields({
  spreadPct,
  spreadPctInput,
  error,
}: AccountAdvancedFieldsProps) {
  const { t } = useTranslation()
  const [initiallyOpen] = useState(
    spreadPct !== undefined &&
      spreadPct !== '' &&
      spreadPct !== '0' &&
      spreadPct !== '0.00'
  )
  const settledSpread = useDebouncedValue(spreadPct ?? '')
  const preview = useAccountPreview(
    { spreadPct: settledSpread },
    settledSpread !== ''
  )
  const isHigh = settledSpread !== '' && preview.data?.spreadWarning === true

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
                  ? t('accounts.spread-high', {
                      pct: preview.data?.spreadWarningPct ?? 20,
                    })
                  : t('accounts.spread-hint')}
              </FieldDescription>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

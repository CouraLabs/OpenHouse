import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  importDateFormats,
  importDecimalSeparators,
  importDelimiters,
  importEncodings,
  importSignConventions,
  type ImportDelimiter,
  type ImportEncoding,
  type ImportMapping,
  type ImportPreview,
} from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { Field, FieldLabel } from '@workspace/ui/components/field'

import { ImportStepActions } from './import-step-actions.js'
import {
  draftToMapping,
  initialDraft,
  type MappingDraft,
} from './import-mapping-draft.js'
import { ImportSampleTable } from './import-sample-table.js'
import { ImportSelectField, type SelectChoice } from './import-select-field.js'

const DELIMITER_KEYS: Record<ImportDelimiter, string> = {
  auto: 'auto',
  ',': 'comma',
  ';': 'semicolon',
  '\t': 'tab',
}

export function ImportMappingStep({
  preview,
  isReading,
  error,
  onReencode,
  onSubmit,
  onBack,
}: {
  preview: ImportPreview
  isReading: boolean
  error: string | undefined
  onReencode: (encoding: ImportEncoding, delimiter: ImportDelimiter) => void
  onSubmit: (mapping: ImportMapping) => void
  onBack: () => void
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<MappingDraft>(() =>
    initialDraft(preview.headers, preview.mapping)
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = <K extends keyof MappingDraft>(key: K, value: MappingDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const columns = (optional: boolean): SelectChoice[] => [
    {
      value: '',
      label: optional ? t('imports.column-none') : t('imports.column-pick'),
    },
    ...preview.headers.map((header, index) => ({
      value: String(index),
      label: header,
    })),
  ]

  const submit = () => {
    const result = draftToMapping(draft)

    if (result.ok) {
      setErrors({})
      onSubmit(result.mapping)
    } else {
      setErrors(result.errors)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        {t('imports.mapping-hint')}
      </p>
      <ImportSampleTable headers={preview.headers} sample={preview.sample} />
      <Field orientation="horizontal">
        <Checkbox
          id="import-has-header"
          checked={draft.hasHeader}
          onCheckedChange={(checked) => set('hasHeader', checked === true)}
        />
        <FieldLabel htmlFor="import-has-header">
          {t('imports.has-header')}
        </FieldLabel>
      </Field>
      <div className="grid gap-4 md:grid-cols-3">
        <ImportSelectField
          id="import-date-column"
          label={t('imports.date-column')}
          required
          value={draft.dateColumn}
          choices={columns(false)}
          error={errors.dateColumn}
          onChange={(value) => set('dateColumn', value)}
        />
        <ImportSelectField
          id="import-description-column"
          label={t('imports.description-column')}
          required
          value={draft.descriptionColumn}
          choices={columns(false)}
          error={errors.descriptionColumn}
          onChange={(value) => set('descriptionColumn', value)}
        />
        <ImportSelectField
          id="import-amount-layout"
          label={t('imports.amount-layout')}
          value={draft.amountLayout}
          choices={[
            { value: 'single', label: t('imports.amount-single') },
            { value: 'split', label: t('imports.amount-split') },
          ]}
          onChange={(value) =>
            set('amountLayout', value === 'split' ? 'split' : 'single')
          }
        />
        {draft.amountLayout === 'single' ? (
          <ImportSelectField
            id="import-amount-column"
            label={t('imports.amount-column')}
            value={draft.amountColumn}
            choices={columns(false)}
            error={errors.amountColumn}
            onChange={(value) => set('amountColumn', value)}
          />
        ) : (
          <>
            <ImportSelectField
              id="import-debit-column"
              label={t('imports.debit-column')}
              value={draft.debitColumn}
              choices={columns(false)}
              error={errors.amountColumn}
              onChange={(value) => set('debitColumn', value)}
            />
            <ImportSelectField
              id="import-credit-column"
              label={t('imports.credit-column')}
              value={draft.creditColumn}
              choices={columns(false)}
              error={errors.amountColumn}
              onChange={(value) => set('creditColumn', value)}
            />
          </>
        )}
        <ImportSelectField
          id="import-category-column"
          label={t('imports.category-column')}
          value={draft.categoryColumn}
          choices={columns(true)}
          onChange={(value) => set('categoryColumn', value)}
        />
        <ImportSelectField
          id="import-pending-column"
          label={t('imports.pending-column')}
          value={draft.pendingColumn}
          choices={columns(true)}
          onChange={(value) => set('pendingColumn', value)}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <ImportSelectField
          id="import-date-format"
          label={t('imports.date-format')}
          required
          value={draft.dateFormat}
          choices={importDateFormats.map((value) => ({ value, label: value }))}
          onChange={(value) =>
            set('dateFormat', value as MappingDraft['dateFormat'])
          }
        />
        <ImportSelectField
          id="import-decimal-separator"
          label={t('imports.decimal-separator')}
          required
          value={draft.decimalSeparator}
          choices={importDecimalSeparators.map((value) => ({
            value,
            label: t(
              value === ',' ? 'imports.decimal-comma' : 'imports.decimal-dot'
            ),
          }))}
          onChange={(value) =>
            set('decimalSeparator', value as MappingDraft['decimalSeparator'])
          }
        />
        {draft.amountLayout === 'single' ? (
          <ImportSelectField
            id="import-sign-convention"
            label={t('imports.sign-convention')}
            required
            value={draft.signConvention}
            choices={importSignConventions.map((value) => ({
              value,
              label: t(`imports.sign-${value}`),
            }))}
            onChange={(value) =>
              set('signConvention', value as MappingDraft['signConvention'])
            }
          />
        ) : null}
        <ImportSelectField
          id="import-encoding"
          label={t('imports.encoding')}
          required
          value={draft.encoding}
          choices={importEncodings.map((value) => ({
            value,
            label: t(`imports.encoding-${value}`),
          }))}
          onChange={(value) => {
            const encoding = value as ImportEncoding

            set('encoding', encoding)
            onReencode(encoding, draft.delimiter)
          }}
        />
        <ImportSelectField
          id="import-delimiter"
          label={t('imports.delimiter')}
          required
          value={draft.delimiter}
          choices={importDelimiters.map((value) => ({
            value,
            label: t(`imports.delimiter-${DELIMITER_KEYS[value]}`),
          }))}
          onChange={(value) => {
            const delimiter = value as ImportDelimiter

            set('delimiter', delimiter)
            onReencode(draft.encoding, delimiter)
          }}
        />
      </div>
      {error !== undefined ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <ImportStepActions>
        <Button type="button" variant="outline" onClick={onBack}>
          {t('imports.back')}
        </Button>
        <Button type="button" disabled={isReading} onClick={submit}>
          {isReading ? t('imports.reading') : t('imports.preview')}
        </Button>
      </ImportStepActions>
    </div>
  )
}

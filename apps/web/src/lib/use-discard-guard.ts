import { useTranslation } from 'react-i18next'

import type { FormSheetDiscardLabels } from '@workspace/ui/components/form-sheet'

export function useDiscardGuard(isDirty: boolean): {
  isDirty: boolean
  discard: FormSheetDiscardLabels
} {
  const { t } = useTranslation()

  return {
    isDirty,
    discard: {
      title: t('discard.title'),
      description: t('discard.description'),
      confirmLabel: t('discard.confirm'),
      cancelLabel: t('discard.keep-editing'),
    },
  }
}

import { Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@workspace/ui/components/button'

import { setAmountsHidden, useAmountsHidden } from '@/lib/privacy.js'

export function PrivacyToggle() {
  const { t } = useTranslation()
  const hidden = useAmountsHidden()
  const label = hidden ? t('shell.show-amounts') : t('shell.hide-amounts')

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={label}
      aria-pressed={hidden}
      title={label}
      className="max-sm:hidden"
      onClick={() => setAmountsHidden(!hidden)}
    >
      {hidden ? <EyeOff /> : <Eye />}
    </Button>
  )
}

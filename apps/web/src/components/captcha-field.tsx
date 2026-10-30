import { useTranslation } from 'react-i18next'
import { TurnstileWidget } from '@workspace/ui/components/turnstile-widget'
import { useTheme } from '@workspace/ui/components/theme-provider'

interface CaptchaFieldProps {
  siteKey: string
  action: string
  onToken: (token: string | null) => void
  resetKey: number
  error?: string
}

export function CaptchaField({
  siteKey,
  action,
  onToken,
  resetKey,
  error,
}: CaptchaFieldProps) {
  const { i18n } = useTranslation()
  const { theme } = useTheme()

  return (
    <div className="flex flex-col gap-1.5">
      <TurnstileWidget
        siteKey={siteKey}
        action={action}
        onToken={onToken}
        resetKey={resetKey}
        theme={theme === 'system' ? 'auto' : theme}
        language={i18n.language}
        className="min-h-[65px]"
      />
      {error !== undefined && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

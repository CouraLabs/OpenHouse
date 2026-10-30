import { zodResolver } from '@hookform/resolvers/zod'
import type { TFunction } from 'i18next'
import { useCallback, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { resendVerificationSchema } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import { TextField } from '@workspace/ui/components/text-field'
import { TurnstileWidget } from '@workspace/ui/components/turnstile-widget'
import { ApiError } from '@/lib/api.js'
import { useResendVerification } from '@/lib/auth.js'
import { TURNSTILE_SITE_KEY } from '@/lib/turnstile.js'

function buildResendSchema(t: TFunction) {
  return resendVerificationSchema
    .omit({ turnstileToken: true })
    .extend({ email: z.string().email(t('verify-email.email-invalid')) })
}

type ResendFormValues = z.infer<ReturnType<typeof buildResendSchema>>

interface ResendVerificationFormProps {
  defaultEmail?: string
}

export function ResendVerificationForm({
  defaultEmail,
}: ResendVerificationFormProps) {
  const { t } = useTranslation()
  const resend = useResendVerification()
  const schema = useMemo(() => buildResendSchema(t), [t])
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileReset, setTurnstileReset] = useState(0)
  const [sent, setSent] = useState(false)
  const onTurnstileToken = useCallback(
    (token: string | null) => setTurnstileToken(token),
    []
  )
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResendFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: defaultEmail ?? '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    if (turnstileToken === null) {
      setError('email', { message: t('verify-email.bot-check-required') })
      return
    }

    setSent(false)

    try {
      await resend.mutateAsync({ email: values.email, turnstileToken })
      setSent(true)
    } catch (error) {
      setError('email', {
        message:
          error instanceof ApiError ? error.message : t('verify-email.error'),
      })
    } finally {
      setTurnstileReset((count) => count + 1)
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <TextField
        type="email"
        labelFor="verify-email-email"
        label={t('verify-email.email')}
        placeholder="you@example.com"
        autoComplete="email"
        required
        error={errors.email}
        {...register('email')}
      />
      <TurnstileWidget
        siteKey={TURNSTILE_SITE_KEY}
        action="verify-resend"
        onToken={onTurnstileToken}
        resetKey={turnstileReset}
        className="min-h-[65px]"
      />
      {sent && (
        <p role="status" className="text-sm text-muted-foreground">
          {t('verify-email.resent')}
        </p>
      )}
      <Button
        type="submit"
        variant="outline"
        disabled={isSubmitting || resend.isPending}
      >
        {isSubmitting || resend.isPending
          ? t('verify-email.resending')
          : t('verify-email.resend')}
      </Button>
    </form>
  )
}

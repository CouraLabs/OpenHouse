import { zodResolver } from '@hookform/resolvers/zod'
import type { TFunction } from 'i18next'
import { useCallback, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { resendVerificationSchema } from '@workspace/dto'
import { Button } from '@workspace/ui/components/button'
import { TextField } from '@workspace/ui/components/text-field'
import { ApiError } from '@/lib/api.js'
import { useResendVerification } from '@/lib/auth.js'
import { CaptchaField } from '@/components/captcha-field.js'
import { useAuthConfig } from '@/lib/auth-config.js'
import { isCaptchaError } from '@/lib/captcha-error.js'

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
  const siteKey = useAuthConfig().data?.captcha?.siteKey
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [captchaError, setCaptchaError] = useState(false)
  const [captchaFailure, setCaptchaFailure] = useState<string>()
  const [turnstileReset, setTurnstileReset] = useState(0)
  const [sent, setSent] = useState(false)
  const onTurnstileToken = useCallback((token: string | null) => {
    setTurnstileToken(token)
    if (token !== null) {
      setCaptchaError(false)
    }
  }, [])
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
    setCaptchaFailure(undefined)
    if (siteKey !== undefined && turnstileToken === null) {
      setCaptchaError(true)
      return
    }

    setSent(false)

    try {
      await resend.mutateAsync({
        email: values.email,
        turnstileToken: turnstileToken ?? undefined,
      })
      setSent(true)
    } catch (error) {
      if (isCaptchaError(error)) {
        setCaptchaFailure((error as Error).message)
        return
      }
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
      {siteKey !== undefined && (
        <CaptchaField
          siteKey={siteKey}
          action="verify-resend"
          onToken={onTurnstileToken}
          resetKey={turnstileReset}
          error={
            captchaError ? t('verify-email.bot-check-required') : captchaFailure
          }
        />
      )}
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

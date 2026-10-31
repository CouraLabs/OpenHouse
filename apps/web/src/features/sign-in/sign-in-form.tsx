import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { EMAIL_UNVERIFIED, signInSchema } from '@workspace/dto'
import { Button } from '@workspace/ui/components/button'
import { ApiError } from '@/lib/api.js'
import { useSignIn } from '@/lib/auth.js'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { TextField } from '@workspace/ui/components/text-field'
import { CaptchaField } from '@/components/captcha-field.js'
import { useAuthConfig } from '@/lib/auth-config.js'
import { isCaptchaError } from '@/lib/captcha-error.js'

const signInFormSchema = signInSchema.extend({
  email: z.string().email('Enter a valid email.'),
  password: z.string().min(1, 'Enter your password.'),
  rememberMe: z.boolean(),
})

type SignInFormValues = z.infer<typeof signInFormSchema>

interface SignInFormProps {
  onSuccess: () => void
  onUnverified: (email: string) => void
}

function isUnverified(error: ApiError): boolean {
  return (
    error.status === 403 &&
    (error.body as { code?: string } | undefined)?.code === EMAIL_UNVERIFIED
  )
}

export function SignInForm({ onSuccess, onUnverified }: SignInFormProps) {
  const { t } = useTranslation()
  const signIn = useSignIn()
  const siteKey = useAuthConfig().data?.captcha?.siteKey
  const [captchaAsked, setCaptchaAsked] = useState(false)
  const [captchaMissing, setCaptchaMissing] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileReset, setTurnstileReset] = useState(0)
  const onTurnstileToken = useCallback((token: string | null) => {
    setTurnstileToken(token)
    if (token !== null) {
      setCaptchaMissing(false)
    }
  }, [])
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInFormSchema),
    defaultValues: { rememberMe: false },
  })

  const showCaptcha = siteKey !== undefined && captchaAsked

  const onSubmit = handleSubmit(async (values) => {
    if (showCaptcha && turnstileToken === null) {
      setCaptchaMissing(true)
      return
    }

    try {
      await signIn.mutateAsync({
        ...values,
        turnstileToken: showCaptcha ? (turnstileToken ?? undefined) : undefined,
      })
      onSuccess()
    } catch (error) {
      if (showCaptcha) {
        setTurnstileReset((count) => count + 1)
      }
      if (isCaptchaError(error)) {
        setCaptchaAsked(true)
        setCaptchaMissing(true)
      } else if (error instanceof ApiError && isUnverified(error)) {
        onUnverified(values.email)
      } else if (error instanceof ApiError) {
        setError('password', { message: error.message })
      } else {
        setError('password', { message: 'Something went wrong. Try again.' })
      }
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <TextField
        type="email"
        labelFor="sign-in-email"
        placeholder={t('sign-in.email-placeholder')}
        autoComplete="email"
        required
        error={errors.email}
        {...register('email')}
      />
      <TextField
        type="password"
        labelFor="sign-in-password"
        placeholder={t('sign-in.password-placeholder')}
        autoComplete="current-password"
        required
        error={errors.password}
        {...register('password')}
      />
      <Field orientation="horizontal">
        <Checkbox
          id="sign-in-remember"
          checked={watch('rememberMe')}
          onCheckedChange={(checked) =>
            setValue('rememberMe', checked === true)
          }
        />
        <FieldLabel htmlFor="sign-in-remember">
          {t('sign-in.remember-me')}
        </FieldLabel>
      </Field>
      {showCaptcha && (
        <CaptchaField
          siteKey={siteKey}
          action="login"
          onToken={onTurnstileToken}
          resetKey={turnstileReset}
          error={captchaMissing ? t('sign-in.bot-check-required') : undefined}
        />
      )}
      <Button type="submit" disabled={isSubmitting || signIn.isPending}>
        {t('sign-in.submit')}
      </Button>
    </form>
  )
}

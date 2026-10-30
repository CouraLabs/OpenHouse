import { zodResolver } from '@hookform/resolvers/zod'
import type { TFunction } from 'i18next'
import { useCallback, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { hasExactlyOneTenantField, type SignUpResponse } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import { cn } from 'cn'
import { ApiError } from '@/lib/api.js'
import { useSignUp } from '@/lib/auth.js'
import { TextField } from '@workspace/ui/components/text-field'
import { CaptchaField } from '@/components/captcha-field.js'
import { useAuthConfig } from '@/lib/auth-config.js'
import { isCaptchaError } from '@/lib/captcha-error.js'

type HouseholdChoice = 'join' | 'create'

function buildSignUpSchema(t: TFunction) {
  return z
    .object({
      tenantName: z
        .string()
        .max(120)
        .refine(
          (value) => value.trim() === '' || value.length > 0,
          t('sign-up.household-name-required')
        ),
      tenantCode: z.string().max(120),
      name: z.string().min(1, t('sign-up.name-required')).max(120),
      email: z.string().email(t('sign-up.email-invalid')),
      password: z.string().min(8, t('sign-up.password-short')).max(72),
    })
    .superRefine((values, ctx) => {
      const hasName = values.tenantName.trim() !== ''
      const hasCode = values.tenantCode.trim() !== ''
      if (
        !hasExactlyOneTenantField({
          tenantName: hasName ? values.tenantName : undefined,
          tenantCode: hasCode ? values.tenantCode : undefined,
        })
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['tenantCode'],
          message: t('sign-up.choice-error'),
        })
      }
    })
}

type SignUpFormValues = z.infer<ReturnType<typeof buildSignUpSchema>>

interface SignUpFormProps {
  onSuccess: (response: SignUpResponse) => void
  defaultTenantCode?: string
}

export function SignUpForm({ onSuccess, defaultTenantCode }: SignUpFormProps) {
  const { t } = useTranslation()
  const signUp = useSignUp()
  const [choice, setChoice] = useState<HouseholdChoice>(
    defaultTenantCode !== undefined && defaultTenantCode !== ''
      ? 'join'
      : 'create'
  )
  const schema = useMemo(() => buildSignUpSchema(t), [t])
  const siteKey = useAuthConfig().data?.captcha?.siteKey
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileReset, setTurnstileReset] = useState(0)
  const [botCheckMissing, setBotCheckMissing] = useState(false)
  const [captchaFailure, setCaptchaFailure] = useState<string>()
  const onTurnstileToken = useCallback((token: string | null) => {
    setTurnstileToken(token)
    if (token !== null) {
      setBotCheckMissing(false)
    }
  }, [])
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { tenantName: '', tenantCode: defaultTenantCode ?? '' },
  })

  const switchChoice = (next: HouseholdChoice) => {
    setChoice(next)
    if (next === 'join') {
      setValue('tenantName', '')
    } else {
      setValue('tenantCode', '')
    }
    clearErrors(['tenantName', 'tenantCode'])
  }

  const onSubmit = handleSubmit(async (values) => {
    setCaptchaFailure(undefined)
    if (siteKey !== undefined && turnstileToken === null) {
      setBotCheckMissing(true)
      return
    }

    const body =
      values.tenantCode.trim() !== ''
        ? {
            tenantCode: values.tenantCode.trim(),
            name: values.name,
            email: values.email,
            password: values.password,
            turnstileToken: turnstileToken ?? undefined,
          }
        : {
            tenantName: values.tenantName.trim(),
            name: values.name,
            email: values.email,
            password: values.password,
            turnstileToken: turnstileToken ?? undefined,
          }

    try {
      onSuccess(await signUp.mutateAsync(body))
    } catch (error) {
      setTurnstileReset((count) => count + 1)
      if (isCaptchaError(error)) {
        setCaptchaFailure((error as Error).message)
        return
      }

      if (error instanceof ApiError) {
        const codeFieldIssue = error.issues?.find((issue) =>
          issue.path.includes('tenantCode')
        )

        if (codeFieldIssue !== undefined) {
          setError('tenantCode', { message: codeFieldIssue.message })
        } else {
          setError('email', { message: error.message })
        }
      } else {
        setError('email', { message: t('sign-up.error') })
      }
    }
  })

  const choiceItem = (value: HouseholdChoice, label: string) => (
    <button
      key={value}
      type="button"
      role="radio"
      aria-checked={choice === value}
      onClick={() => switchChoice(value)}
      className={cn(
        'flex h-9 w-full cursor-pointer items-center justify-center rounded-full px-3 text-sm font-medium transition-colors sm:w-auto sm:flex-1 sm:px-2',
        'focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
        choice === value
          ? 'bg-card text-foreground shadow-soft'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
    </button>
  )

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div
        role="radiogroup"
        aria-label={t('sign-up.choice-label')}
        className="flex w-full flex-col gap-1 rounded-2xl bg-foreground/[0.03] p-1 ring-1 ring-foreground/[0.06] sm:flex-row sm:rounded-full"
      >
        {choiceItem('join', t('sign-up.choice-join'))}
        {choiceItem('create', t('sign-up.choice-create'))}
      </div>
      <p className="text-sm text-muted-foreground">
        {choice === 'join' ? t('sign-up.join-hint') : t('sign-up.create-hint')}
      </p>
      {choice === 'join' ? (
        <TextField
          type="tenantCode"
          labelFor="sign-up-tenant-code"
          label={t('sign-up.code')}
          placeholder={t('sign-up.code-placeholder')}
          error={errors.tenantCode}
          {...register('tenantCode')}
        />
      ) : (
        <TextField
          type="text"
          labelFor="sign-up-tenant-name"
          label={t('sign-up.household-name')}
          placeholder={t('sign-up.household-name-placeholder')}
          error={errors.tenantName}
          {...register('tenantName')}
        />
      )}
      <TextField
        type="text"
        labelFor="sign-up-name"
        label={t('sign-up.name')}
        placeholder="Ana Owner"
        autoComplete="name"
        required
        error={errors.name}
        {...register('name')}
      />
      <TextField
        type="email"
        labelFor="sign-up-email"
        placeholder="you@example.com"
        autoComplete="email"
        required
        error={errors.email}
        {...register('email')}
      />
      <TextField
        type="password"
        labelFor="sign-up-password"
        placeholder={t('sign-up.password-hint')}
        autoComplete="new-password"
        required
        error={errors.password}
        {...register('password')}
      />
      {siteKey !== undefined && (
        <CaptchaField
          siteKey={siteKey}
          action="signup"
          onToken={onTurnstileToken}
          resetKey={turnstileReset}
          error={
            botCheckMissing ? t('sign-up.bot-check-required') : captchaFailure
          }
        />
      )}
      <Button type="submit" disabled={isSubmitting || signUp.isPending}>
        {isSubmitting || signUp.isPending
          ? t('sign-up.submitting')
          : t('sign-up.submit')}
      </Button>
    </form>
  )
}

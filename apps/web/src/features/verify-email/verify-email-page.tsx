import {
  Link,
  useNavigate,
  useRouterState,
  useSearch,
} from '@tanstack/react-router'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Spinner } from '@workspace/ui/components/spinner'

import { AuthLayout } from '@/components/layout/auth-layout.js'
import { currentSession } from '@/lib/query.js'
import { ResendVerificationForm } from './resend-verification-form.js'
import { useConfirmEmailToken } from './use-confirm-email-token.js'

export function VerifyEmailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { token } = useSearch({ from: '/verify-email' })
  const email = useRouterState({
    select: (state) => state.location.state.email,
  })
  const onConfirmed = useCallback(
    () =>
      void navigate({
        to: currentSession()?.user.startPage ?? '/',
        replace: true,
      }),
    [navigate]
  )
  const confirm = useConfirmEmailToken(token, onConfirmed)

  const confirming = token !== undefined && !confirm.isError

  const title = confirm.isError
    ? t('verify-email.failed-title')
    : t('verify-email.check-title')
  const subtitle = confirm.isError
    ? t('verify-email.failed-subtitle')
    : email !== undefined
      ? t('verify-email.check-subtitle', { email })
      : t('verify-email.check-subtitle-generic')

  return (
    <AuthLayout>
      <div className="flex w-full max-w-sm flex-col gap-6">
        {confirming ? (
          <div
            role="status"
            className="flex items-center gap-3 text-sm text-muted-foreground"
          >
            <Spinner aria-hidden role="presentation" />
            {t('verify-email.confirming')}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-[-0.02em] text-balance">
                {title}
              </h1>
              <p className="text-sm text-pretty text-muted-foreground">
                {subtitle}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-medium">
                {t('verify-email.resend-title')}
              </h2>
              <p className="text-sm text-pretty text-muted-foreground">
                {t('verify-email.resend-hint')}
              </p>
            </div>
            <ResendVerificationForm defaultEmail={email} />
          </>
        )}
        <p className="text-sm text-muted-foreground">
          <Link
            to="/sign-in"
            className="text-foreground underline underline-offset-4"
          >
            {t('verify-email.back')}
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}

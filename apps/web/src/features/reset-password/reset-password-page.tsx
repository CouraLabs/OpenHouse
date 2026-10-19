import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { AuthLayout } from '@/components/layout/auth-layout.js'
import { currentSession } from '@/lib/query.js'
import { ResetPasswordForm } from './reset-password-form.js'

/**
 * Reads the code a reset link carries in its fragment (`#code=…`). The
 * fragment never leaves the browser, so the code stays out of server logs
 * and the Referer header.
 */
function codeFromFragment(): string | undefined {
  const code = new URLSearchParams(window.location.hash.slice(1)).get('code')

  return code === null || code === '' ? undefined : code
}

/**
 * The page a forgotten password is reset from, without email: a member
 * enters the code their household's owner issued, an owner one of their
 * recovery codes. Setting the new password signs out every other session
 * and signs this browser in.
 */
export function ResetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <AuthLayout>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-light tracking-tight">
            {t('reset-password.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('reset-password.subtitle')}
          </p>
        </div>
        <ResetPasswordForm
          initialCode={codeFromFragment()}
          onSuccess={() =>
            void navigate({ to: currentSession()?.user.startPage ?? '/' })
          }
        />
        <ul className="flex list-disc flex-col gap-1 pl-4 text-sm text-muted-foreground">
          <li>{t('reset-password.hint-member')}</li>
          <li>{t('reset-password.hint-owner')}</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          <Link
            to="/sign-in"
            className="text-foreground underline underline-offset-4"
          >
            {t('reset-password.back')}
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}

import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { AuthLayout } from '@/components/layout/auth-layout.js'
import { currentSession } from '@/lib/query.js'
import { SignInForm } from './sign-in-form.js'

export function SignInPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <AuthLayout>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <SignInForm
          onSuccess={() =>
            void navigate({ to: currentSession()?.user.startPage ?? '/' })
          }
        />
        <p className="text-sm text-muted-foreground">
          <Link
            to="/reset-password"
            className="text-foreground underline underline-offset-4"
          >
            {t('sign-in.forgot')}
          </Link>{' '}
          {t('sign-in.forgot-hint')}
        </p>
        <p className="text-sm text-muted-foreground">
          No account yet?{' '}
          <Link
            to="/sign-up"
            className="text-foreground underline underline-offset-4"
          >
            Sign up
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}

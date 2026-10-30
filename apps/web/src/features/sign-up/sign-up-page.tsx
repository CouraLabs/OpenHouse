import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { AuthLayout } from '@/components/layout/auth-layout.js'
import { SignUpForm } from './sign-up-form.js'

export function SignUpPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { code } = useSearch({ from: '/sign-up' })

  return (
    <AuthLayout>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <SignUpForm
          defaultTenantCode={code}
          onSuccess={(email) =>
            void navigate({ to: '/verify-email', state: { email } })
          }
        />
        <p className="text-sm text-muted-foreground">
          {t('sign-up.have-account')}{' '}
          <Link
            to="/sign-in"
            className="text-foreground underline underline-offset-4"
          >
            {t('sign-up.sign-in-link')}
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}

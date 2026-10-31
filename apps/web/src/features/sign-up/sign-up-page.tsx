import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AuthLayout } from '@/components/layout/auth-layout.js'
import { SignUpForm } from './sign-up-form.js'

export function SignUpPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { code } = useSearch({ from: '/sign-up' })
  const [inviteCode] = useState(code)

  useEffect(() => {
    if (code !== undefined) {
      void navigate({ to: '/sign-up', search: {}, replace: true })
    }
  }, [code, navigate])

  return (
    <AuthLayout>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <SignUpForm
          defaultTenantCode={inviteCode}
          onSuccess={(response) =>
            void (response.status === 'verificationRequired'
              ? navigate({
                  to: '/verify-email',
                  state: { email: response.email },
                })
              : navigate({ to: '/' }))
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

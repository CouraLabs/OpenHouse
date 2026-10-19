import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { AuthLayout } from '@/components/layout/auth-layout.js'
import { SignUpForm } from './sign-up-form.js'

/**
 * The page signing up from: brand and controls above, the sign-up form
 * centered, and the link back to sign-in beside it.
 */
export function SignUpPage() {
  const navigate = useNavigate()
  const { code } = useSearch({ from: '/sign-up' })

  return (
    <AuthLayout>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <SignUpForm
          defaultTenantCode={code}
          onSuccess={() => void navigate({ to: '/' })}
        />
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            to="/sign-in"
            className="text-foreground underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}

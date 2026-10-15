import { Link, useNavigate } from '@tanstack/react-router'
import { AuthLayout } from '@/components/layout/auth-layout.js'
import { SignInForm } from './sign-in-form.js'

/**
 * The page signing in from: brand and controls above, the sign-in form
 * centered, and the link to sign-up beside it.
 */
export function SignInPage() {
  const navigate = useNavigate()

  return (
    <AuthLayout>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <SignInForm onSuccess={() => void navigate({ to: '/' })} />
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

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { signInSchema } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import { ApiError } from '@/lib/api.js'
import { useSignIn } from '@/lib/auth.js'
import { TextField } from '@/components/ui/text-field.js'

/**
 * The fields the sign-in form holds. The rules come from the shared poco
 * schema — the same check the API runs — with the UX messages the form adds
 * for the empty-field cases the shared rule accepts but a form should not.
 * `rememberMe` is required here: the form always sends it, while the shared
 * schema defaults it for direct API callers.
 */
const signInFormSchema = signInSchema.extend({
  email: z.string().email('Enter a valid email.'),
  password: z.string().min(1, 'Enter your password.'),
  rememberMe: z.boolean(),
})

type SignInFormValues = z.infer<typeof signInFormSchema>

/** The props `SignInForm` takes: what to do when the credentials are good. */
interface SignInFormProps {
  onSuccess: () => void
}

/**
 * The fields of the sign-in page: email, password, remember me, and the
 * submit button. The parent page owns navigation; the form owns the fields
 * and reports success upward.
 */
export function SignInForm({ onSuccess }: SignInFormProps) {
  const signIn = useSignIn()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInFormSchema),
    defaultValues: { rememberMe: false },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await signIn.mutateAsync(values)
      onSuccess()
    } catch (error) {
      if (error instanceof ApiError) {
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
        placeholder="you@example.com"
        autoComplete="email"
        error={errors.email}
        {...register('email')}
      />
      <TextField
        type="password"
        labelFor="sign-in-password"
        placeholder="Your password"
        autoComplete="current-password"
        error={errors.password}
        {...register('password')}
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4" {...register('rememberMe')} />
        Remember me
      </label>
      <Button type="submit" disabled={isSubmitting || signIn.isPending}>
        Sign in
      </Button>
    </form>
  )
}

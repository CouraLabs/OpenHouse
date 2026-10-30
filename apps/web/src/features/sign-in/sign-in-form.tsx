import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { EMAIL_UNVERIFIED, signInSchema } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import { ApiError } from '@/lib/api.js'
import { useSignIn } from '@/lib/auth.js'
import { TextField } from '@workspace/ui/components/text-field'

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
      if (error instanceof ApiError && isUnverified(error)) {
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
        placeholder="you@example.com"
        autoComplete="email"
        required
        error={errors.email}
        {...register('email')}
      />
      <TextField
        type="password"
        labelFor="sign-in-password"
        placeholder="Your password"
        autoComplete="current-password"
        required
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

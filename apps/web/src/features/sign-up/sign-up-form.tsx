import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { hasExactlyOneTenantField } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import { ApiError } from '@/lib/api.js'
import { useSignUp } from '@/lib/auth.js'
import { TextField } from '@/components/ui/text-field.js'

/**
 * The fields the sign-up form holds. The exclusivity rule — exactly one of
 * tenant name or invite code — comes from the shared poco schema the API
 * also runs; the form only adds its UX messages for the empty cases and maps
 * the form's two always-present strings onto the shared schema's optional
 * fields.
 */
const signUpFormSchema = z
  .object({
    tenantName: z
      .string()
      .max(120)
      .refine((value) => value.trim() === '' || value.length > 0, 'Enter a tenant name.'),
    tenantCode: z.string().max(120),
    name: z.string().min(1, 'Enter your name.').max(120),
    email: z.string().email('Enter a valid email.'),
    password: z.string().min(8, 'Use at least 8 characters.').max(72),
  })
  .superRefine((values, ctx) => {
    // The shared rule, called rather than copied: it runs the same
    // predicate the API validates with. The form holds both fields as
    // plain strings, so the empty one is masked to `undefined` first.
    const hasName = values.tenantName.trim() !== ''
    const hasCode = values.tenantCode.trim() !== ''
    if (!hasExactlyOneTenantField({
      tenantName: hasName ? values.tenantName : undefined,
      tenantCode: hasCode ? values.tenantCode : undefined,
    })) {
      ctx.addIssue({
        code: 'custom',
        path: ['tenantCode'],
        message: 'Fill either a new tenant name or an invite code, not both.',
      })
    }
  })

type SignUpFormValues = z.infer<typeof signUpFormSchema>

/** The props `SignUpForm` takes: what to do when the account exists. */
interface SignUpFormProps {
  onSuccess: () => void
}

/**
 * The fields of the sign-up page: an optional invite code (which makes the
 * account join that tenant) or a new tenant name, then name, email, and
 * password.
 */
export function SignUpForm({ onSuccess }: SignUpFormProps) {
  const signUp = useSignUp()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: { tenantName: '', tenantCode: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    // The form holds both fields as strings; the API expects exactly one, so
    // the empty one is left out.
    const body = values.tenantCode.trim() !== ''
      ? { tenantCode: values.tenantCode.trim(), name: values.name, email: values.email, password: values.password }
      : { tenantName: values.tenantName.trim(), name: values.name, email: values.email, password: values.password }

    try {
      await signUp.mutateAsync(body)
      onSuccess()
    } catch (error) {
      if (error instanceof ApiError) {
        const codeFieldIssue = error.issues?.find((issue) => issue.path.includes('tenantCode'))

        if (codeFieldIssue !== undefined) {
          setError('tenantCode', { message: codeFieldIssue.message })
        } else {
          setError('email', { message: error.message })
        }
      } else {
        setError('email', { message: 'Something went wrong. Try again.' })
      }
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <TextField
        type="tenantCode"
        labelFor="sign-up-tenant-code"
        label="Tenant code (if you are joining a tenant)"
        placeholder="Paste the code the owner gave you"
        error={errors.tenantCode}
        {...register('tenantCode')}
      />
      <TextField
        type="text"
        labelFor="sign-up-tenant-name"
        label="New tenant name (if you are creating one)"
        placeholder="Acme"
        error={errors.tenantName}
        {...register('tenantName')}
      />
      <TextField
        type="text"
        labelFor="sign-up-name"
        label="Your name"
        placeholder="Ana Owner"
        autoComplete="name"
        error={errors.name}
        {...register('name')}
      />
      <TextField
        type="email"
        labelFor="sign-up-email"
        placeholder="you@example.com"
        autoComplete="email"
        error={errors.email}
        {...register('email')}
      />
      <TextField
        type="password"
        labelFor="sign-up-password"
        placeholder="At least 8 characters"
        autoComplete="new-password"
        error={errors.password}
        {...register('password')}
      />
      <Button type="submit" disabled={isSubmitting || signUp.isPending}>
        Sign up
      </Button>
    </form>
  )
}

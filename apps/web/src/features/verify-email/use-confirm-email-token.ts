import { useEffect, useRef } from 'react'
import { useVerifyEmail } from '@/lib/auth.js'

export function useConfirmEmailToken(
  token: string | undefined,
  onConfirmed: () => void
) {
  const verify = useVerifyEmail()
  const sentFor = useRef<string | undefined>(undefined)
  const onConfirmedRef = useRef(onConfirmed)

  useEffect(() => {
    onConfirmedRef.current = onConfirmed
  }, [onConfirmed])

  const { mutate } = verify

  useEffect(() => {
    if (token === undefined || sentFor.current === token) {
      return
    }

    sentFor.current = token
    mutate({ token }, { onSuccess: () => onConfirmedRef.current() })
  }, [token, mutate])

  return verify
}

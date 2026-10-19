import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@workspace/ui/components/button'
import { KeyRound } from 'lucide-react'

import { useAccountSecurity } from '@/lib/account-security.js'
import { useSession } from '@/lib/auth.js'

/** Where a dismissal is remembered, per user, on this browser. */
const dismissedKey = (userId: number) =>
  `openhouse:recovery-prompt-dismissed:${userId}`

/** Reads a remembered dismissal; storage can be unavailable (private
 * modes), which reads as not dismissed. */
function wasDismissed(userId: number | undefined): boolean {
  try {
    return (
      userId !== undefined &&
      window.localStorage.getItem(dismissedKey(userId)) !== null
    )
  } catch {
    return false
  }
}

/**
 * Prompts an owner who has never generated recovery codes — a new tenant
 * right after sign-up, or one from before codes existed — to save some:
 * without them, a forgotten owner password needs the server command.
 * Dismissed once, it stays dismissed on this browser; members never see it.
 */
export function RecoveryCodesPrompt() {
  const { t } = useTranslation()
  const session = useSession()
  const user = session.data?.user
  const security = useAccountSecurity()
  const [dismissed, setDismissed] = useState(() => wasDismissed(user?.id))

  if (
    user === undefined ||
    user.role !== 'owner' ||
    dismissed ||
    security.data === undefined ||
    security.data.recoveryCodes.generatedAt !== null
  ) {
    return null
  }

  const dismiss = () => {
    try {
      window.localStorage.setItem(
        dismissedKey(user.id),
        new Date().toISOString()
      )
    } catch {
      // Not remembered across reloads; dismissed for this visit anyway.
    }
    setDismissed(true)
  }

  return (
    <div className="mx-4 mt-4 flex flex-col gap-3 rounded-2xl bg-primary/10 p-4 ring-1 ring-primary/15 md:mx-10 md:flex-row md:items-center">
      <div className="flex flex-1 items-start gap-3">
        <KeyRound aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">
            {t('security.recovery-prompt.title')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('security.recovery-prompt.description')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={dismiss}>
          {t('security.recovery-prompt.dismiss')}
        </Button>
        <Button
          nativeButton={false}
          render={
            <Link to="/settings/$section" params={{ section: 'security' }} />
          }
          onClick={dismiss}
        >
          {t('security.recovery-prompt.action')}
        </Button>
      </div>
    </div>
  )
}

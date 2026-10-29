import { useTranslation } from 'react-i18next'
import type { InviteCode } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import { Ban } from 'lucide-react'

/** The props `PendingInvites` takes. */
interface PendingInvitesProps {
  invites: InviteCode[]
  /** Formats when a code expires, in the tenant's zone. */
  formatExpiry: (expiresAt: string) => string
  onRevoke: (invite: InviteCode) => void
  isRevoking: boolean
}

/**
 * The invitations still open — unused and unexpired — with when each one
 * expires and a revoke action. Revoking expires the code at once.
 */
export function PendingInvites({
  invites,
  formatExpiry,
  onRevoke,
  isRevoking,
}: PendingInvitesProps) {
  const { t } = useTranslation()

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-xl font-medium tracking-tight">
        {t('settings.invite.pending-title')}
      </h2>
      {invites.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('settings.invite.pending-empty')}
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-2xl ring-1 ring-foreground/[0.06]">
          {invites.map((invite) => (
            <li
              key={invite.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="flex min-w-0 flex-col">
                <code className="truncate font-mono text-sm">
                  {invite.code}
                </code>
                <span className="text-xs text-muted-foreground">
                  {invite.expiresAt === null
                    ? t('settings.invite.never-expires')
                    : t('settings.invite.expires', {
                        date: formatExpiry(invite.expiresAt),
                      })}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={isRevoking}
                onClick={() => onRevoke(invite)}
              >
                <Ban />
                {t('settings.invite.revoke')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

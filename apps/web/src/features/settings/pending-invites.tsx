import { useTranslation } from 'react-i18next'
import type { InviteCode } from '@workspace/dto'
import { Button } from '@workspace/ui/components/button'
import { Ban } from 'lucide-react'

interface PendingInvitesProps {
  invites: InviteCode[]
  formatExpiry: (expiresAt: string) => string
  onRevoke: (invite: InviteCode) => void
  isRevoking: boolean
}

export function PendingInvites({
  invites,
  formatExpiry,
  onRevoke,
  isRevoking,
}: PendingInvitesProps) {
  const { t } = useTranslation()

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold tracking-[-0.02em]">
        {t('settings.invite.pending-title')}
      </h2>
      {invites.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('settings.invite.pending-empty')}
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-[1.25rem] bg-card shadow-soft">
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

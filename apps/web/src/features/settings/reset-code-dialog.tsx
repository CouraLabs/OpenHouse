import { useTranslation } from 'react-i18next'
import type { TenantUser } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'

import { useTenantSettings } from '@/lib/settings.js'
import { CodeShare } from './code-share.js'
import { resetLinkFor, useIssueResetCode } from './use-reset-codes.js'

/** The props `ResetCodeDialog` takes. */
interface ResetCodeDialogProps {
  /** The member whose password is being reset, or nothing while closed. */
  user: TenantUser | null
  onClose: () => void
}

/**
 * Resets a member's password without email: the owner confirms, the API
 * issues a one-time code valid for 30 minutes, and the dialog shows it —
 * once — with its link, to share however the owner likes. The member's
 * current password keeps working until the code is used.
 */
export function ResetCodeDialog({ user, onClose }: ResetCodeDialogProps) {
  const { t, i18n } = useTranslation()
  const { timezone } = useTenantSettings()
  const issue = useIssueResetCode()

  const close = () => {
    issue.reset()
    onClose()
  }

  const name = user?.name ?? ''
  const until =
    issue.data === undefined
      ? ''
      : new Intl.DateTimeFormat(i18n.language, {
          timeStyle: 'short',
          timeZone: timezone,
        }).format(new Date(issue.data.expiresAt))

  return (
    <Dialog
      open={user !== null}
      onOpenChange={(next) => {
        if (!next) {
          close()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('settings.reset-code.title', { name })}</DialogTitle>
          <DialogDescription>
            {issue.data === undefined
              ? t('settings.reset-code.description', { name })
              : t('settings.reset-code.issued', { name, time: until })}
          </DialogDescription>
        </DialogHeader>
        {issue.data !== undefined ? (
          <CodeShare
            code={issue.data.code}
            link={resetLinkFor(issue.data.code)}
            labels={{
              code: t('settings.reset-code.code'),
              link: t('settings.reset-code.link'),
              shareTitle: t('settings.reset-code.share-title'),
            }}
          />
        ) : null}
        {issue.isError ? (
          <p className="text-sm text-destructive">
            {issue.error instanceof Error
              ? issue.error.message
              : t('settings.error')}
          </p>
        ) : null}
        <DialogFooter>
          {issue.data === undefined ? (
            <>
              <Button variant="outline" onClick={close}>
                {t('settings.cancel')}
              </Button>
              <Button
                disabled={issue.isPending || user === null}
                onClick={() => {
                  if (user !== null) {
                    issue.mutate({ userId: user.id })
                  }
                }}
              >
                {issue.isPending
                  ? t('settings.reset-code.generating')
                  : t('settings.reset-code.generate')}
              </Button>
            </>
          ) : (
            <Button onClick={close}>{t('settings.reset-code.done')}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

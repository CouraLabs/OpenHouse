import { useTranslation } from 'react-i18next'
import type { TenantUser } from '@workspace/dto'
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
import { formattingLocale } from '@/lib/i18n.js'

interface ResetCodeDialogProps {
  user: TenantUser | null
  onClose: () => void
}

export function ResetCodeDialog({ user, onClose }: ResetCodeDialogProps) {
  const { t } = useTranslation()
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
      : new Intl.DateTimeFormat(formattingLocale(), {
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

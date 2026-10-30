import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

import { CaptchaField } from '@/components/captcha-field.js'
import { useAuthConfig } from '@/lib/auth-config.js'
import { CodeShare } from './code-share.js'
import { inviteLinkFor, useCreateInviteCode } from './use-invite-codes.js'

const EXPIRY_CHOICES = ['1', '7', 'never'] as const

type ExpiryChoice = (typeof EXPIRY_CHOICES)[number]

interface AddUserDialogProps {
  open: boolean
  onClose: () => void
}

export function AddUserDialog({ open, onClose }: AddUserDialogProps) {
  const { t } = useTranslation()
  const create = useCreateInviteCode()
  const [expiry, setExpiry] = useState<ExpiryChoice>('7')
  const siteKey = useAuthConfig().data?.captcha?.siteKey
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileReset, setTurnstileReset] = useState(0)
  const [captchaMissing, setCaptchaMissing] = useState(false)
  const onTurnstileToken = useCallback((token: string | null) => {
    setTurnstileToken(token)
    if (token !== null) {
      setCaptchaMissing(false)
    }
  }, [])

  const close = () => {
    create.reset()
    setExpiry('7')
    setCaptchaMissing(false)
    setTurnstileToken(null)
    onClose()
  }

  const generate = () => {
    if (siteKey !== undefined && turnstileToken === null) {
      setCaptchaMissing(true)
      return
    }

    create.mutate(
      {
        expiresInDays: expiry === 'never' ? undefined : Number(expiry),
        turnstileToken: turnstileToken ?? undefined,
      },
      {
        onError: () => setTurnstileReset((count) => count + 1),
      }
    )
  }

  const expiryLabel = (choice: ExpiryChoice) =>
    t(`settings.invite.expiry-${choice}`)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          close()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('settings.invite.title')}</DialogTitle>
          <DialogDescription>
            {t('settings.invite.description')}
          </DialogDescription>
        </DialogHeader>
        {create.data === undefined ? (
          <Field>
            <FieldLabel htmlFor="invite-expiry">
              {t('settings.invite.expiry')}
            </FieldLabel>
            <Select
              value={expiry}
              onValueChange={(next) => {
                if (next !== null) {
                  setExpiry(next as ExpiryChoice)
                }
              }}
              items={EXPIRY_CHOICES.map((choice) => ({
                value: choice,
                label: expiryLabel(choice),
              }))}
            >
              <SelectTrigger id="invite-expiry" className="w-full">
                {}
                <SelectValue>{expiryLabel(expiry)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {EXPIRY_CHOICES.map((choice) => (
                  <SelectItem key={choice} value={choice}>
                    {expiryLabel(choice)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : (
          <CodeShare
            code={create.data.code}
            link={inviteLinkFor(create.data.code)}
            labels={{
              code: t('settings.invite.code'),
              link: t('settings.invite.link'),
              shareTitle: t('settings.invite.share-title'),
            }}
          />
        )}
        {create.data === undefined && siteKey !== undefined && open ? (
          <CaptchaField
            siteKey={siteKey}
            action="invite"
            onToken={onTurnstileToken}
            resetKey={turnstileReset}
            error={
              captchaMissing
                ? t('settings.invite.bot-check-required')
                : undefined
            }
          />
        ) : null}
        {create.isError ? (
          <p className="text-sm text-destructive">
            {create.error instanceof Error
              ? create.error.message
              : t('settings.error')}
          </p>
        ) : null}
        <DialogFooter>
          {create.data === undefined ? (
            <>
              <Button variant="outline" onClick={close}>
                {t('settings.cancel')}
              </Button>
              <Button disabled={create.isPending} onClick={generate}>
                {create.isPending
                  ? t('settings.invite.generating')
                  : t('settings.invite.generate')}
              </Button>
            </>
          ) : (
            <Button onClick={close}>{t('settings.invite.done')}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

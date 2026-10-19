import { useState } from 'react'
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

import { CodeShare } from './code-share.js'
import { inviteLinkFor, useCreateInviteCode } from './use-invite-codes.js'

/** The lifetimes an invite can be given; `never` sends no expiry. */
const EXPIRY_CHOICES = ['1', '7', 'never'] as const

type ExpiryChoice = (typeof EXPIRY_CHOICES)[number]

/** The props `AddUserDialog` takes. */
interface AddUserDialogProps {
  open: boolean
  onClose: () => void
}

/**
 * Adds a user without email: the owner picks how long the invite lasts
 * (24 hours, 7 days, or never; 7 days by default), generates the code, and
 * shares the code or its link however they like.
 */
export function AddUserDialog({ open, onClose }: AddUserDialogProps) {
  const { t } = useTranslation()
  const create = useCreateInviteCode()
  const [expiry, setExpiry] = useState<ExpiryChoice>('7')

  const close = () => {
    create.reset()
    setExpiry('7')
    onClose()
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
                {/* Rendered explicitly: base-ui does not derive the label of
                 * a value set while the popup was closed. */}
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
              <Button
                disabled={create.isPending}
                onClick={() =>
                  create.mutate({
                    expiresInDays:
                      expiry === 'never' ? undefined : Number(expiry),
                  })
                }
              >
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

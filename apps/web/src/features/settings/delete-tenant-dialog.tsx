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
import { TextField } from '@workspace/ui/components/text-field'

import { useSession } from '@/lib/auth.js'
import { useScheduleTenantDeletion } from './use-tenant-deletion.js'

interface DeleteTenantDialogProps {
  open: boolean
  onClose: () => void
}

export function DeleteTenantDialog({ open, onClose }: DeleteTenantDialogProps) {
  const { t } = useTranslation()
  const session = useSession()
  const schedule = useScheduleTenantDeletion()
  const tenantName = session.data?.tenant.name ?? ''
  const [typed, setTyped] = useState('')

  const close = () => {
    setTyped('')
    schedule.reset()
    onClose()
  }

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
          <DialogTitle>{t('settings.data.delete-title')}</DialogTitle>
          <DialogDescription>
            {t('settings.data.delete-description')}
          </DialogDescription>
        </DialogHeader>
        <TextField
          type="text"
          labelFor="delete-tenant-name"
          label={t('settings.data.delete-type-name', { name: tenantName })}
          autoComplete="off"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
        />
        {schedule.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {schedule.error instanceof Error
              ? schedule.error.message
              : t('settings.error')}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            {t('settings.cancel')}
          </Button>
          <Button
            variant="destructive"
            disabled={schedule.isPending || typed.trim() === ''}
            onClick={() => schedule.mutate(typed, { onSuccess: () => close() })}
          >
            {schedule.isPending
              ? t('settings.data.deleting')
              : t('settings.data.delete-confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

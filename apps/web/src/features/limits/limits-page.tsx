import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CreateLimitBody, LimitUsage } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import { ConfirmDialog } from '@workspace/ui/components/confirm-dialog'
import { Spinner } from '@workspace/ui/components/spinner'
import { Plus } from 'lucide-react'

import { PageHeader } from '@/components/page-header.js'
import { LimitForm } from './limit-form.js'
import { LimitUsageGrid } from './limit-usage-grid.js'
import {
  useLimitsUsage,
  useDeleteLimit,
  useSaveLimit,
} from './use-limits.js'
import { formattingLocale } from '@/lib/i18n.js'

/** The page the tenant's limits are managed from: one usage card per
 * ACTIVE limit — what the period has spent against the cap — with the
 * create form and the delete confirmation above it. */
export function LimitsPage() {
  const { t } = useTranslation()

  // The form, and what its buttons are about to do.
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<LimitUsage | null>(null)
  const [deleting, setDeleting] = useState<LimitUsage | null>(null)

  const usage = useLimitsUsage()
  const save = useSaveLimit()
  const remove = useDeleteLimit()

  // The errors the mutations answer with, read from the state the query
  // client already holds — no mirror of it in local state.
  const saveError = save.isError
    ? save.error instanceof Error
      ? save.error.message
      : t('limits.error')
    : undefined
  const deleteError = remove.isError
    ? remove.error instanceof Error
      ? remove.error.message
      : t('limits.error')
    : undefined

  const actions = {
    onEdit: (limit: LimitUsage) => {
      setEditing(limit)
      setFormOpen(true)
    },
    onDelete: (limit: LimitUsage) => {
      // Deleting any card cancels the edit in progress: the form would
      // otherwise keep editing a row the grid no longer holds.
      setFormOpen(false)
      setEditing(null)
      save.reset()
      setDeleting(limit)
    },
  }

  // Saving needs no confirmation: the form's submit is the intent. A failure
  // leaves the form open, holding the values, with the error shown.
  const submitSave = (body: CreateLimitBody) => {
    save.mutate(editing === null ? body : { ...body, id: editing.id }, {
      onSuccess: () => {
        setFormOpen(false)
        setEditing(null)
      },
    })
  }

  const confirmDelete = () => {
    if (deleting === null) {
      return
    }

    remove.mutate(deleting.id, {
      onSuccess: () => setDeleting(null),
    })
  }

  // The page's action, on the header line: the insert.
  const toolbar = (
    <Button
      onClick={() => {
        setEditing(null)
        setFormOpen(true)
      }}
    >
      <Plus />
      {t('limits.new')}
    </Button>
  )

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 animate-page-in flex-col gap-8 px-4 py-8 md:px-10 md:py-12">
      <PageHeader
        title={t('limits.title')}
        subtitle={t('limits.subtitle')}
        actions={toolbar}
      />
      {formOpen ? (
        <LimitForm
          key={editing?.id ?? 'new'}
          limit={editing}
          error={saveError}
          isSaving={save.isPending}
          onSubmit={submitSave}
          onCancel={() => {
            setFormOpen(false)
            setEditing(null)
            save.reset()
          }}
        />
      ) : null}
      {usage.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner className="size-6" />
        </div>
      ) : (usage.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('limits.empty')}</p>
      ) : (
        <LimitUsageGrid
          usage={usage.data ?? []}
          locale={formattingLocale()}
          actions={actions}
        />
      )}
      {deleteError ? (
        <p className="text-sm text-destructive">{deleteError}</p>
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        destructive
        title={t('limits.delete-title')}
        description={t('limits.delete-description', {
          name:
            deleting === null
              ? ''
              : t(`limits.type-${deleting.type.toLowerCase()}`),
        })}
        confirmLabel={t('limits.delete-confirm')}
        pendingLabel={t('limits.deleting')}
        cancelLabel={t('limits.cancel')}
        isPending={remove.isPending}
        onCancel={() => {
          setDeleting(null)
          remove.reset()
        }}
        onConfirm={confirmDelete}
      />
    </main>
  )
}

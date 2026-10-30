import { useRef } from 'react'
import type { FormEventHandler, ReactNode } from 'react'

import { Button } from '@workspace/ui/components/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'

interface FormSheetProps {
  open?: boolean
  title: string
  description?: string
  submitLabel: string
  cancelLabel: string
  closeLabel?: string
  isSaving?: boolean
  error?: string
  onSubmit: FormEventHandler<HTMLFormElement>
  onCancel: () => void
  children: ReactNode
}

const FIRST_FIELD =
  'input:not([type=hidden]):not([readonly]):not(:disabled), textarea:not(:disabled), button[role=combobox]:not(:disabled)'

export function FormSheet({
  open = true,
  title,
  description,
  submitLabel,
  cancelLabel,
  closeLabel,
  isSaving = false,
  error,
  onSubmit,
  onCancel,
  children,
}: FormSheetProps) {
  const bodyRef = useRef<HTMLDivElement>(null)

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onCancel()
        }
      }}
    >
      <SheetContent
        side="right"
        gap="none"
        closeLabel={closeLabel}
        initialFocus={() =>
          bodyRef.current?.querySelector<HTMLElement>(FIRST_FIELD) ?? true
        }
        className="w-full max-w-none data-[side=right]:w-full sm:max-w-md data-[side=right]:sm:max-w-md"
      >
        <form
          onSubmit={onSubmit}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          <SheetHeader className="px-6 pt-6 pr-14 pb-4">
            <SheetTitle className="text-lg">{title}</SheetTitle>
            {description !== undefined ? (
              <SheetDescription>{description}</SheetDescription>
            ) : null}
          </SheetHeader>
          <div
            ref={bodyRef}
            className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-2"
          >
            {children}
            {error !== undefined ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
          <SheetFooter className="sticky bottom-0 flex-row items-center justify-between gap-3 border-t bg-popover px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 md:min-h-9"
              disabled={isSaving}
              onClick={onCancel}
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              className="min-h-11 md:min-h-9"
              disabled={isSaving}
            >
              {submitLabel}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

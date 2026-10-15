import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'

/** The props the confirm dialog takes. */
interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  /** The label the confirm button carries. */
  confirmLabel: string
  /** The label the confirm button carries while a request runs. */
  pendingLabel: string
  /** The label the cancel button carries. */
  cancelLabel: string
  /** The pending state, which disables the buttons while a request runs. */
  isPending: boolean
  /** Whether the action is destructive, which the confirm button shows. */
  destructive?: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * The dialog an action the user must confirm passes through: the caller
 * owns what the action is, what the buttons say, and what happens on
 * confirm — this only asks. A destructive confirm renders in the danger
 * color.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pendingLabel,
  cancelLabel,
  isPending,
  destructive = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onCancel()
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} onClick={onCancel}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? 'destructive' : 'default'}
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? pendingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

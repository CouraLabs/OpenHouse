import type { SettleSuggestion } from '@workspace/poco'
import { Dialog, DialogContent } from '@workspace/ui/components/dialog'

import { SettleForm } from './settle-form.js'

/** The props `SettleDialog` takes. */
interface SettleDialogProps {
  /** The suggestion being settled, or nothing while closed. */
  suggestion: SettleSuggestion | null
  onClose: () => void
}

/**
 * Records a settle-up: the payer's account, and optionally the receiver's —
 * with both it is a transfer, with only the payer's an expense to the
 * member. The amount is the suggestion's.
 */
export function SettleDialog({ suggestion, onClose }: SettleDialogProps) {
  return (
    <Dialog
      open={suggestion !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent>
        {suggestion !== null ? (
          <SettleForm
            key={`${suggestion.fromUserId}-${suggestion.toUserId}-${suggestion.currency}`}
            suggestion={suggestion}
            onClose={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

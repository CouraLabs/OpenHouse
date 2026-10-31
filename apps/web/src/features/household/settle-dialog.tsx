import type { SettleSuggestion } from '@workspace/dto'
import { Dialog, DialogContent } from '@workspace/ui/components/dialog'

import { SettleForm } from './settle-form.js'

interface SettleDialogProps {
  suggestion: SettleSuggestion | null
  onClose: () => void
}

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

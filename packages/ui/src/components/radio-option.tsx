import type { ReactNode } from 'react'

import { RadioGroupItem } from '@workspace/ui/components/radio-group'

export function RadioOption({
  value,
  children,
}: {
  value: string
  children: ReactNode
}) {
  return (
    <label className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm has-[[data-checked]]:border-primary has-[[data-disabled]]:cursor-not-allowed">
      <RadioGroupItem value={value} />
      <span className="min-w-0 flex-1 break-words">{children}</span>
    </label>
  )
}

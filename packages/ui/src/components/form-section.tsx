import type { ReactNode } from 'react'
import { cn } from 'cn'

interface FormSectionProps {
  legend?: string
  className?: string
  children: ReactNode
}

export function FormSection({ legend, className, children }: FormSectionProps) {
  return (
    <fieldset className={cn('flex min-w-0 flex-col gap-4', className)}>
      {legend !== undefined ? (
        <legend className="mb-1 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
          {legend}
        </legend>
      ) : null}
      {children}
    </fieldset>
  )
}

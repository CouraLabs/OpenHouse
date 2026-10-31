import { cn } from 'cn'

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'text-ink font-sans text-[1.0625rem] font-bold tracking-[-0.02em]',
        className
      )}
    >
      kantim
      <span className="text-brand">.</span>
    </span>
  )
}

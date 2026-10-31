import { cn } from 'cn'

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-[0.625rem] bg-primary-soft text-primary',
        className
      )}
    >
      <svg
        aria-hidden
        viewBox="-6 -6 112 112"
        fill="none"
        stroke="currentColor"
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-[58%]"
      >
        <path d="M50 12 L86 44 H14 Z" />
        <path d="M22 52 H78 V88 H22 Z" />
        <circle cx="50" cy="12" r="7" fill="var(--brand)" stroke="none" />
      </svg>
    </div>
  )
}

import { cn } from 'cn'

/**
 * The logo mark from `logos/openhouse-glyph.svg`: a stroked roof over a
 * square with one filled node dot at the ridge, in ink, inside a hairline
 * ring. Sized by the caller.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full text-foreground ring-1 ring-input',
        className
      )}
    >
      <svg
        aria-hidden
        viewBox="-6 -6 112 112"
        fill="none"
        stroke="currentColor"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-[58%]"
      >
        <path d="M50 12 L86 44 H14 Z" />
        <path d="M22 52 H78 V88 H22 Z" />
        <circle cx="50" cy="12" r="6" fill="currentColor" stroke="none" />
      </svg>
    </div>
  )
}

import type { ReactNode } from 'react'
import { cn } from 'cn'

export type PaymentCardVariant = 'emerald' | 'coral' | 'onyx' | 'olive' | 'ice'

const gradients: Record<PaymentCardVariant, string> = {
  emerald:
    'bg-[linear-gradient(135deg,#2f6f5a_0%,#1d4a3c_100%)] text-[#f4f8f5]',
  coral: 'bg-[linear-gradient(135deg,#ebaa90_0%,#d7826a_100%)] text-[#2a1710]',
  onyx: 'bg-[linear-gradient(135deg,#2b2727_0%,#110f0f_100%)] text-[#f3f1ee]',
  olive: 'bg-[linear-gradient(135deg,#4f6e2f_0%,#2c4519_100%)] text-[#f4f6ef]',
  ice: 'bg-[linear-gradient(135deg,#d3e3e9_0%,#a8c6d0_100%)] text-[#3b4f57]',
}

export function PaymentCard({
  variant,
  brand,
  tier,
  title,
  caption,
  corner,
  identifier,
  className,
}: {
  variant: PaymentCardVariant
  brand: ReactNode
  tier?: ReactNode
  title: ReactNode
  caption?: ReactNode
  corner?: ReactNode
  identifier?: ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="payment-card"
      data-variant={variant}
      className={cn(
        'relative isolate flex aspect-[1.586] w-full flex-col justify-between overflow-hidden rounded-2xl p-5 shadow-[0_1px_2px_rgb(0_0_0/0.08),0_14px_30px_-16px_rgb(20_30_25/0.5)]',
        gradients[variant],
        className
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 200 200"
        className="pointer-events-none absolute top-1/2 -right-[28%] -z-10 h-[150%] -translate-y-1/2 opacity-[0.14]"
        fill="none"
        stroke="currentColor"
      >
        <circle cx="100" cy="100" r="96" strokeWidth="1.2" />
        <circle cx="100" cy="100" r="72" strokeWidth="1.2" />
        <circle cx="100" cy="100" r="48" strokeWidth="1.2" />
      </svg>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 truncate text-sm font-semibold">{brand}</div>
        {tier !== undefined ? (
          <div className="max-w-[45%] shrink-0 truncate text-[0.625rem] font-semibold tracking-[0.16em] uppercase opacity-80">
            {tier}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="h-6 w-8 rounded-[5px] bg-[linear-gradient(135deg,#e9d18f_0%,#c9a24f_55%,#e4c77c_100%)] shadow-[inset_0_0_0_1px_rgb(120_90_30/0.35)]"
        />
        {identifier !== undefined ? (
          <span className="font-mono text-[0.8125rem] tracking-[0.12em] opacity-90">
            {identifier}
          </span>
        ) : null}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          {caption !== undefined ? (
            <span className="text-[0.625rem] font-semibold tracking-[0.14em] uppercase opacity-70">
              {caption}
            </span>
          ) : null}
          <span className="truncate text-[0.9375rem] font-semibold">
            {title}
          </span>
        </div>
        {corner !== undefined ? (
          <div className="shrink-0 text-right text-xs font-medium tabular-nums opacity-90">
            {corner}
          </div>
        ) : null}
      </div>
    </div>
  )
}

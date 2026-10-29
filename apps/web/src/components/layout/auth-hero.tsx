import { useTranslation } from 'react-i18next'

/**
 * The drawing half of the signed-out pages: a graph-paper sheet with the
 * OpenHouse primitive (a roof over a square) plotted stroke by stroke, a mono
 * tag, the mono headline, and the tagline. Hidden below `md`, where the form
 * takes the full width.
 */
export function AuthHero() {
  const { t } = useTranslation()

  return (
    <section className="relative hidden overflow-hidden rounded-[20px] bg-background p-12 ring-1 ring-input md:flex md:flex-col md:justify-between lg:p-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(var(--muted-foreground)_1px,transparent_1.2px)] [mask-image:linear-gradient(to_bottom,black,transparent_85%)] [background-size:24px_24px] opacity-40"
      />
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        className="relative size-40 self-end text-foreground lg:size-52"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          className="plot-stroke"
          pathLength={1}
          strokeWidth={1.5}
          d="M50 12 L86 44 H14 Z"
        />
        <path
          className="plot-stroke [animation-delay:380ms]"
          pathLength={1}
          strokeWidth={1.5}
          d="M22 52 H78 V88 H22 Z"
        />
        <circle cx="50" cy="12" r="3.2" fill="currentColor" stroke="none" />
      </svg>
      <div className="relative flex max-w-lg animate-page-in flex-col gap-6">
        <span className="w-max rounded-full px-3 py-0.5 font-mono text-xs text-ink-2 ring-1 ring-input">
          {t('app.eyebrow')}
        </span>
        <h1 className="text-5xl leading-[1.02] tracking-[-0.045em] text-balance lg:text-6xl">
          {t('app.headline')}
        </h1>
        <p className="max-w-md text-[1.1rem] text-pretty text-ink-2">
          {t('app.tagline')}
        </p>
      </div>
    </section>
  )
}

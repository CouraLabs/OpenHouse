import { useTranslation } from 'react-i18next'

/**
 * The editorial half of the signed-out pages: an eyebrow tag, the serif
 * headline, and the tagline, set on the tray color with a soft glow behind.
 * Hidden below `md`, where the form takes the full width.
 */
export function AuthHero() {
  const { t } = useTranslation()

  return (
    <section className="relative hidden overflow-hidden rounded-[2rem] bg-sidebar p-12 ring-1 ring-foreground/[0.05] md:flex md:flex-col md:justify-end lg:p-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 size-[28rem] rounded-full bg-primary/15 blur-3xl"
      />
      <div className="relative flex max-w-lg animate-page-in flex-col gap-6">
        <span className="w-max rounded-full bg-primary/10 px-3 py-1 text-[10px] font-medium tracking-[0.2em] text-primary uppercase ring-1 ring-primary/15">
          {t('app.eyebrow')}
        </span>
        <h1 className="font-heading text-5xl leading-[1.05] font-light tracking-tight text-balance lg:text-6xl">
          {t('app.headline')}
        </h1>
        <p className="max-w-md text-base text-pretty text-muted-foreground">
          {t('app.tagline')}
        </p>
      </div>
    </section>
  )
}

import { useTranslation } from 'react-i18next'

import { PaymentCard } from '@workspace/ui/components/payment-card'

export function AuthHero() {
  const { t } = useTranslation()

  return (
    <section className="relative hidden overflow-hidden rounded-3xl bg-sidebar p-12 text-sidebar-foreground ring-1 ring-sidebar-border md:flex md:flex-col md:justify-between lg:p-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(40rem_26rem_at_110%_-10%,rgb(157_216_188/0.16),transparent_60%),radial-gradient(30rem_22rem_at_-10%_110%,rgb(222_148_102/0.12),transparent_60%)]"
      />
      <div
        aria-hidden
        className="relative ml-auto h-56 w-full max-w-sm lg:h-64"
      >
        <PaymentCard
          variant="coral"
          brand="kantim."
          tier={t('auth-hero.card-tier-home')}
          identifier="•••• 4821"
          caption={t('auth-hero.card-caption')}
          title={t('auth-hero.card-holder-a')}
          corner="09/29"
          className="absolute top-0 right-0 w-[78%] rotate-[6deg]"
        />
        <PaymentCard
          variant="emerald"
          brand="kantim."
          tier={t('auth-hero.card-tier-shared')}
          identifier="•••• 5512"
          caption={t('auth-hero.card-caption')}
          title={t('auth-hero.card-holder-b')}
          corner="03/30"
          className="absolute top-12 left-0 w-[78%] -rotate-[4deg]"
        />
      </div>
      <div className="relative flex max-w-lg animate-page-in flex-col gap-5">
        <h1 className="text-[clamp(2.5rem,4.4vw,3.5rem)] leading-[1.04] font-bold tracking-[-0.03em] text-balance text-white">
          {t('app.headline')}
        </h1>
        <p className="max-w-md text-[1.0625rem] text-pretty text-sidebar-muted">
          {t('app.tagline')}
        </p>
      </div>
    </section>
  )
}

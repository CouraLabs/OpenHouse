import { UpcomingCard } from '@/features/upcoming/upcoming-card.js'

/**
 * The page a signed-in user lands on. The application shell owns the chrome
 * (sidebar, header, sign-out); this is a page slot for the dashboard cards.
 */
export function MainPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 animate-page-in flex-col gap-8 px-4 py-8 md:px-10 md:py-12">
      <UpcomingCard />
    </main>
  )
}

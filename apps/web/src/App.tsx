import { QueryClientProvider } from '@tanstack/react-query'

import { queryClient } from '@/lib/query.js'
import { RoutedApp } from '@/components/layout/routed-app.js'

/**
 * The application shell: the query client above every page, the router below
 * it. `App` renders the provider only; `RoutedApp` sits inside it and reads
 * the session through `useSession`.
 */
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RoutedApp />
    </QueryClientProvider>
  )
}

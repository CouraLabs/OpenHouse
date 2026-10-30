import { QueryClientProvider } from '@tanstack/react-query'

import { queryClient } from '@/lib/query.js'
import { RoutedApp } from '@/components/layout/routed-app.js'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RoutedApp />
    </QueryClientProvider>
  )
}

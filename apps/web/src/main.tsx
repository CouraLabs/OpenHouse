import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@workspace/ui/globals.css'
import '@/lib/i18n.js'
import { App } from './App.tsx'
import { ThemeProvider } from '@workspace/ui/components/theme-provider'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Missing #root element in index.html')
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
)

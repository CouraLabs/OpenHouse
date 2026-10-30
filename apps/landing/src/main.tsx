import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { IconContext } from '@phosphor-icons/react'

import { ThemeProvider } from '@workspace/ui/components/theme-provider'

import '@fontsource-variable/geist-mono'
import '@fontsource-variable/jost'
import './landing.css'
import { App } from './App.tsx'
import { LocaleProvider } from './components/locale-provider.tsx'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Missing #root element in index.html')
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <LocaleProvider>
        <IconContext.Provider value={{ weight: 'light', size: 16 }}>
          <App />
        </IconContext.Provider>
      </LocaleProvider>
    </ThemeProvider>
  </StrictMode>
)

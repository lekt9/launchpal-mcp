import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexReactClient } from 'convex/react'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { ThemeProvider } from './contexts/ThemeContext'
import './index.css'
import App from './App.tsx'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL || 'https://elated-oyster-227.convex.cloud')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <ThemeProvider defaultTheme="dark" storageKey="launchpal-theme">
        <App />
      </ThemeProvider>
    </ConvexAuthProvider>
  </StrictMode>,
)
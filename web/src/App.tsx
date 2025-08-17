import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { OAuthConsent } from './pages/OAuthConsent'
import { Dashboard } from './pages/Dashboard'
import { Billing } from './pages/Billing'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL || 'https://launch.convex.cloud')

function App() {
  return (
    <ConvexProvider client={convex}>
      <BrowserRouter>
        <Routes>
          <Route path="/oauth/authorize" element={<OAuthConsent />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </ConvexProvider>
  )
}

export default App
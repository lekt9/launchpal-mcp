import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Authenticated, Unauthenticated } from 'convex/react'
import { Login } from './pages/Login'
import { OAuthConsent } from './pages/OAuthConsent'
import { Dashboard } from './pages/Dashboard'
import { Billing } from './pages/Billing'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          <Unauthenticated>
            <Login />
          </Unauthenticated>
        } />
        
        <Route path="/oauth/authorize" element={<OAuthConsent />} />
        
        <Route path="/dashboard" element={
          <>
            <Authenticated>
              <Dashboard />
            </Authenticated>
            <Unauthenticated>
              <Navigate to="/login" />
            </Unauthenticated>
          </>
        } />
        
        <Route path="/billing" element={
          <>
            <Authenticated>
              <Billing />
            </Authenticated>
            <Unauthenticated>
              <Navigate to="/login" />
            </Unauthenticated>
          </>
        } />
        
        <Route path="/" element={
          <>
            <Authenticated>
              <Dashboard />
            </Authenticated>
            <Unauthenticated>
              <Navigate to="/login" />
            </Unauthenticated>
          </>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
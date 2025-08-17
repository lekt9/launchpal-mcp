import { useState } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Shield, Rocket } from 'lucide-react'

export function OAuthConsent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // Get OAuth params from URL
  const params = new URLSearchParams(window.location.search)
  const clientId = params.get('client_id')
  const redirectUri = params.get('redirect_uri')
  const state = params.get('state')
  const scope = params.get('scope')
  const codeChallenge = params.get('code_challenge')
  
  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Call Convex to authenticate and generate authorization code
    const response = await fetch('/api/oauth/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        scope,
        code_challenge: codeChallenge
      })
    })
    
    if (response.ok) {
      const { code } = await response.json()
      // Redirect back to client with authorization code
      window.location.href = `${redirectUri}?code=${code}&state=${state}`
    } else {
      setIsLoading(false)
      // Handle error
    }
  }
  
  const handleDeny = () => {
    // Redirect back with error
    window.location.href = `${redirectUri}?error=access_denied&state=${state}`
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Rocket className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Authorize LaunchPal</CardTitle>
          <CardDescription>
            {clientId} is requesting access to your LaunchPal account
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleAuthorize}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">This app will be able to:</span>
                </div>
                <ul className="text-sm text-muted-foreground ml-6 space-y-1">
                  {scope?.split(' ').map(s => (
                    <li key={s}>• {getScopeDescription(s)}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleDeny}
                disabled={isLoading}
              >
                Deny
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading ? 'Authorizing...' : 'Authorize'}
              </Button>
            </div>
          </form>
        </CardContent>
        
        <CardFooter className="text-center text-xs text-muted-foreground">
          By authorizing, you agree to share your account information with {clientId}
        </CardFooter>
      </Card>
    </div>
  )
}

function getScopeDescription(scope: string): string {
  const descriptions: Record<string, string> = {
    'read': 'Read your products and launches',
    'write': 'Create and manage products',
    'launch': 'Schedule and manage launches',
    'analytics': 'View launch analytics'
  }
  return descriptions[scope] || scope
}
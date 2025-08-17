import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthActions } from '@convex-dev/auth/react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { 
  Rocket, 
  Key, 
  CreditCard, 
  Activity,
  Package,
  TrendingUp,
  Copy,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

export function Dashboard() {
  const { signOut } = useAuthActions()
  const profile = useQuery(api.users.getProfile)
  const platforms = useQuery(api.platforms.list)
  const products = useQuery(api.products.list)
  const launches = useQuery(api.launches.list)
  
  const [copiedApiKey, setCopiedApiKey] = useState(false)
  
  const copyApiKey = () => {
    if (profile?.apiKey) {
      navigator.clipboard.writeText(profile.apiKey)
      setCopiedApiKey(true)
      setTimeout(() => setCopiedApiKey(false), 2000)
    }
  }
  
  if (!profile) {
    return <div>Loading...</div>
  }
  
  const usagePercent = profile.usage.requests / profile.limits.monthlyRequests * 100
  
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Rocket className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">LaunchPal Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{profile.email}</span>
              <Button variant="outline" size="sm" onClick={() => signOut()}>Sign Out</Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Usage Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Usage</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profile.usage.requests}/{profile.limits.monthlyRequests}</div>
              <div className="mt-2">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {profile.usage.remaining} requests remaining
              </p>
            </CardContent>
          </Card>
          
          {/* Products Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Limit: {profile.limits.products === 999 ? 'Unlimited' : profile.limits.products}
              </p>
            </CardContent>
          </Card>
          
          {/* Launches Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Launches</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {launches?.filter(l => l.status === 'active').length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Total: {launches?.length || 0} launches
              </p>
            </CardContent>
          </Card>
          
          {/* Subscription Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscription</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{profile.subscription}</div>
              <p className="text-xs text-muted-foreground">
                ${profile.usage.cost.toFixed(2)} this month
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* API Key Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Configuration
            </CardTitle>
            <CardDescription>
              Use your API key to authenticate with the LaunchPal API
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>API Key</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={profile.apiKey}
                    readOnly
                    type="password"
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyApiKey}
                  >
                    {copiedApiKey ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div>
                <Label>API Endpoint</Label>
                <Input
                  value="https://launch.getfoundry.app"
                  readOnly
                  className="font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Connected Platforms */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Connected Platforms</CardTitle>
            <CardDescription>
              Manage your platform connections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {platforms?.map(platform => (
                <div key={platform.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {platform.connected ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">{platform.name}</p>
                      <p className="text-xs text-muted-foreground">{platform.description}</p>
                    </div>
                  </div>
                  <Button
                    variant={platform.connected ? "outline" : "default"}
                    size="sm"
                  >
                    {platform.connected ? "Settings" : "Connect"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
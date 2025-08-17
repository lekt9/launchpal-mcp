import { useState } from 'react'
import { useQuery, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { Check, Zap, Rocket, Crown } from 'lucide-react'

const plans = [
  {
    name: 'Free',
    price: 0,
    description: 'Perfect for trying out LaunchPal',
    features: [
      '100 API requests/month',
      '1 platform connection',
      '3 products max',
      'Basic analytics',
      'Community support'
    ],
    icon: Zap,
    popular: false
  },
  {
    name: 'Starter',
    price: 29,
    description: 'For indie makers and small teams',
    features: [
      '1,000 API requests/month',
      '3 platform connections',
      '10 products max',
      'Advanced analytics',
      'Priority support',
      'Launch scheduling',
      'Custom branding'
    ],
    icon: Rocket,
    popular: true
  },
  {
    name: 'Pro',
    price: 99,
    description: 'For agencies and power users',
    features: [
      '10,000 API requests/month',
      'Unlimited platforms',
      'Unlimited products',
      'Real-time analytics',
      'API access',
      'Dedicated support',
      'Custom integrations',
      'White-label options'
    ],
    icon: Crown,
    popular: false
  }
]

export function Billing() {
  // For now, we'll use a placeholder userId - in production this would come from auth
  const userId = "placeholder_user_id" as any // This would normally come from auth context
  const isAuthenticated = true // Placeholder for auth status
  
  const subscription = useQuery(api.billing.getSubscription, isAuthenticated ? { userId } : "skip")
  const createCheckout = useAction(api.billing.createCheckoutSession)
  const cancelSubscription = useAction(api.billing.cancelSubscription)
  
  const [loading, setLoading] = useState<string | null>(null)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
  
  const handleSubscribe = async (plan: string) => {
    if (plan === 'free') return
    
    setLoading(plan)
    try {
      const result = await createCheckout({
        userId,
        plan: plan as 'starter' | 'pro',
        interval: billingPeriod
      })
      
      // Redirect to Polar checkout
      window.location.href = result.checkoutUrl
    } catch (error) {
      console.error('Failed to create checkout:', error)
    } finally {
      setLoading(null)
    }
  }
  
  const handleCancel = async () => {
    setLoading('cancel')
    try {
      await cancelSubscription({ userId })
    } catch (error) {
      console.error('Failed to cancel:', error)
    } finally {
      setLoading(null)
    }
  }
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Launch products across multiple platforms with ease
          </p>
          
          <div className="inline-flex items-center gap-4 p-1 bg-muted rounded-lg">
            <Button
              variant={billingPeriod === 'monthly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setBillingPeriod('monthly')}
            >
              Monthly
            </Button>
            <Button
              variant={billingPeriod === 'yearly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setBillingPeriod('yearly')}
            >
              Yearly (Save 20%)
            </Button>
          </div>
        </div>
        
        <div className="grid gap-8 lg:grid-cols-3 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon
            const isCurrentPlan = subscription?.plan.toLowerCase() === plan.name.toLowerCase()
            const yearlyPrice = plan.price * 12 * 0.8 // 20% discount
            const displayPrice = billingPeriod === 'yearly' && plan.price > 0 
              ? yearlyPrice / 12 
              : plan.price
            
            return (
              <Card 
                key={plan.name} 
                className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}
                
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <Icon className="h-8 w-8 text-primary" />
                    {isCurrentPlan && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        Current Plan
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">${displayPrice.toFixed(0)}</span>
                    <span className="text-muted-foreground">
                      /{billingPeriod === 'yearly' ? 'mo' : 'month'}
                    </span>
                    {billingPeriod === 'yearly' && plan.price > 0 && (
                      <p className="text-sm text-green-600 mt-1">
                        ${(yearlyPrice).toFixed(0)}/year (save ${(plan.price * 12 - yearlyPrice).toFixed(0)})
                      </p>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter>
                  {isCurrentPlan ? (
                    plan.price > 0 ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleCancel}
                        disabled={loading === 'cancel'}
                      >
                        {loading === 'cancel' ? 'Canceling...' : 'Cancel Subscription'}
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" disabled>
                        Current Plan
                      </Button>
                    )
                  ) : (
                    <Button
                      variant={plan.popular ? 'default' : 'outline'}
                      className="w-full"
                      onClick={() => handleSubscribe(plan.name.toLowerCase())}
                      disabled={loading === plan.name.toLowerCase()}
                    >
                      {loading === plan.name.toLowerCase() 
                        ? 'Processing...' 
                        : plan.price === 0 
                          ? 'Current Plan' 
                          : 'Get Started'}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
        
        <div className="mt-16 text-center text-muted-foreground">
          <p className="mb-4">All plans include:</p>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <span>✓ SSL encryption</span>
            <span>✓ 99.9% uptime SLA</span>
            <span>✓ GDPR compliant</span>
            <span>✓ Cancel anytime</span>
          </div>
        </div>
      </div>
    </div>
  )
}
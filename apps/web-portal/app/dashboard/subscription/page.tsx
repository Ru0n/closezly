"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { CreditCard, Check, Calendar, Download, AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"

interface Plan {
  plan_id: string
  name: string
  price_monthly: number
  price_annually: number
  feature_limits: any
  is_active: boolean
}

interface Subscription {
  subscription_id: string
  plan_id: string
  status: string
  current_period_start: string
  current_period_end: string
  trial_end?: string
}

export default function SubscriptionPage() {
  const [user, setUser] = useState<any>(null)
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null)
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null)
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [isAnnual, setIsAnnual] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient()

        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) throw error

        setUser(user)

        // Fetch available plans
        const { data: plans, error: plansError } = await supabase
          .from('plans')
          .select('*')
          .eq('is_active', true)
          .order('price_monthly', { ascending: true })

        if (plansError) throw plansError
        setAvailablePlans(plans || [])

        // Fetch current subscription
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()

        if (subscription) {
          setCurrentSubscription(subscription)

          // Fetch current plan details
          const currentPlan = plans?.find(p => p.plan_id === subscription.plan_id)
          setCurrentPlan(currentPlan || null)
        }
      } catch (error) {
        console.error('Error fetching subscription data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handlePlanChange = async (planId: string) => {
    // This would typically integrate with Stripe
    console.log('Changing to plan:', planId)
    // For now, just show a message
    alert('Plan change functionality would integrate with Stripe here')
  }

  const handleCancelSubscription = async () => {
    if (confirm('Are you sure you want to cancel your subscription?')) {
      // This would typically call Stripe to cancel
      console.log('Cancelling subscription')
      alert('Subscription cancellation would integrate with Stripe here')
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Subscription & Billing
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Manage your subscription plan and billing information
        </p>
      </div>

      <div className="space-y-8">
        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Current Plan</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentPlan ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{currentPlan.name} Plan</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      ${isAnnual ? currentPlan.price_annually : currentPlan.price_monthly}
                      {isAnnual ? '/year' : '/month'}
                    </p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>

                {currentSubscription && (
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    <p>Next billing date: {new Date(currentSubscription.current_period_end).toLocaleDateString()}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-medium">Plan Features:</h4>
                  <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                    {currentPlan.feature_limits.max_calls === -1 ? (
                      <li className="flex items-center space-x-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Unlimited calls</span>
                      </li>
                    ) : (
                      <li className="flex items-center space-x-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>{currentPlan.feature_limits.max_calls} calls per month</span>
                      </li>
                    )}
                    {currentPlan.feature_limits.ai_summaries && (
                      <li className="flex items-center space-x-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>AI-powered call summaries</span>
                      </li>
                    )}
                    {currentPlan.feature_limits.custom_knowledge && (
                      <li className="flex items-center space-x-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Custom knowledge base</span>
                      </li>
                    )}
                    {currentPlan.feature_limits.priority_support && (
                      <li className="flex items-center space-x-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Priority support</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  You're currently on the Free plan
                </p>
                <Button>Upgrade to Pro</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing Cycle Toggle */}
        <Card>
          <CardHeader>
            <CardTitle>Billing Cycle</CardTitle>
            <CardDescription>
              Switch between monthly and annual billing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <span className={!isAnnual ? "font-medium" : "text-gray-500"}>Monthly</span>
              <Switch
                checked={isAnnual}
                onCheckedChange={setIsAnnual}
              />
              <span className={isAnnual ? "font-medium" : "text-gray-500"}>
                Annual <Badge variant="secondary" className="ml-2">Save 17%</Badge>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Available Plans */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Available Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {availablePlans.map((plan) => (
              <motion.div
                key={plan.plan_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative ${
                  currentPlan?.plan_id === plan.plan_id ? 'ring-2 ring-primary' : ''
                }`}
              >
                <Card className="h-full">
                  <CardHeader className="text-center">
                    <CardTitle>{plan.name}</CardTitle>
                    <div className="text-3xl font-bold">
                      ${isAnnual ? plan.price_annually : plan.price_monthly}
                      <span className="text-sm font-normal text-gray-500">
                        {isAnnual ? '/year' : '/month'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center space-x-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>
                          {plan.feature_limits.max_calls === -1
                            ? 'Unlimited calls'
                            : `${plan.feature_limits.max_calls} calls/month`}
                        </span>
                      </li>
                      {plan.feature_limits.ai_summaries && (
                        <li className="flex items-center space-x-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span>AI summaries</span>
                        </li>
                      )}
                      {plan.feature_limits.custom_knowledge && (
                        <li className="flex items-center space-x-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span>Custom knowledge</span>
                        </li>
                      )}
                      {plan.feature_limits.priority_support && (
                        <li className="flex items-center space-x-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span>Priority support</span>
                        </li>
                      )}
                    </ul>

                    <Button
                      className="w-full"
                      variant={currentPlan?.plan_id === plan.plan_id ? "outline" : "default"}
                      onClick={() => handlePlanChange(plan.plan_id)}
                      disabled={currentPlan?.plan_id === plan.plan_id}
                    >
                      {currentPlan?.plan_id === plan.plan_id ? 'Current Plan' : `Upgrade to ${plan.name}`}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Cancel Subscription */}
        {currentSubscription && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <span>Cancel Subscription</span>
              </CardTitle>
              <CardDescription>
                Cancel your subscription. You'll continue to have access until the end of your billing period.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={handleCancelSubscription}>
                Cancel Subscription
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

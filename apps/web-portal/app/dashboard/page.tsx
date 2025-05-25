"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// Removed framer-motion for better performance
import { Download, Target, DollarSign, Users } from 'lucide-react'
import { CallAnalyticsIcon } from '@/components/icons/ai-sales-icons'

// Import new dashboard components
import { SalesMetricsCard } from '@/components/dashboard/sales-metrics-card'
import { AIInsights } from '@/components/dashboard/ai-insights'
import { QuickWins } from '@/components/dashboard/quick-wins'
import { ResponsiveContainer, ResponsiveGrid } from '@/components/ui/responsive-container'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [isFromDesktop, setIsFromDesktop] = useState(false)
  const [showDesktopAuth, setShowDesktopAuth] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    setIsMounted(true)

    // Check if this page was accessed from desktop app
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const source = urlParams.get('source')
      if (source === 'desktop') {
        setIsFromDesktop(true)
        setShowDesktopAuth(true)
      }
    }

    const checkUser = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        setUser(data.session?.user || null)
      } catch (error) {
        console.error('Error checking auth status:', error)
      }
    }

    checkUser()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [isMounted])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
  }

  // Handle desktop app authentication
  const handleDesktopAuth = () => {
    if (!user) return

    const supabase = createClient()
    // Get the current session to ensure we have fresh tokens
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        const accessToken = data.session.access_token
        const refreshToken = data.session.refresh_token
        const expiresIn = 3600 // Assuming 1 hour expiry

        // Construct the redirect URL
        const redirectUrl = `closezly://auth?access_token=${accessToken}&refresh_token=${refreshToken}&expires_in=${expiresIn}`

        // Redirect to the custom protocol
        window.location.href = redirectUrl
      }
    })
  }

  // Handle logout and login with different account
  const handleSwitchAccount = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    // After logout, the auth state change will redirect to login with source=desktop
  }

  // Dismiss desktop auth prompt
  const dismissDesktopAuth = () => {
    setShowDesktopAuth(false)
    // Remove source parameter from URL
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('source')
      window.history.replaceState({}, '', url.toString())
    }
  }

  return (
    <div className="p-6">{/* Removed the full page wrapper since layout handles it */}

      {/* Desktop App Authentication Banner */}
      {showDesktopAuth && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Desktop App Authentication
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    You're logged in as {user?.email}. Choose an option to continue with the desktop app.
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button onClick={handleDesktopAuth} size="sm" className="bg-blue-600 hover:bg-blue-700">
                  Continue with This Account
                </Button>
                <Button onClick={handleSwitchAccount} variant="outline" size="sm">
                  Switch Account
                </Button>
                <Button onClick={dismissDesktopAuth} variant="ghost" size="sm">
                  ×
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard Overview
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Welcome back, {user?.email}
        </p>
      </div>

      {/* Sales Metrics Cards */}
      <ResponsiveGrid
        cols={{ default: 1, sm: 2, lg: 4 }}
        gap="lg"
        className="mb-8"
      >
            <SalesMetricsCard
              title="Total Calls This Week"
              value="92"
              subtitle="8 more than last week"
              trend={{ value: 12.5, label: "vs last week", isPositive: true }}
              icon={<CallAnalyticsIcon size={16} />}
              delay={0}
            />

            <SalesMetricsCard
              title="Conversion Rate"
              value="74%"
              subtitle="Above target of 70%"
              trend={{ value: 5.2, label: "vs last month", isPositive: true }}
              icon={<Target className="h-4 w-4" />}
              delay={0.1}
            />

            <SalesMetricsCard
              title="Revenue This Month"
              value="$127K"
              subtitle="Pipeline value: $770K"
              trend={{ value: 18.3, label: "vs last month", isPositive: true }}
              icon={<DollarSign className="h-4 w-4" />}
              delay={0.2}
            />

            <SalesMetricsCard
              title="Active Prospects"
              value="156"
              subtitle="23 high-priority"
              trend={{ value: 8.7, label: "vs last week", isPositive: true }}
              icon={<Users className="h-4 w-4" />}
              delay={0.3}
            />
      </ResponsiveGrid>

      {/* Quick Wins Section */}
      <div className="mb-8">
        <QuickWins delay={0.4} />
      </div>

      {/* AI Insights */}
      <div className="mb-8">
        <AIInsights delay={1.0} />
      </div>

      {/* Desktop App Download */}
      <div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <Download className="h-5 w-5 text-primary" />
              <span>Desktop App</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Get real-time AI guidance during your sales calls with our desktop application
            </p>
            <Button className="w-full md:w-auto">
              Download Desktop App
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

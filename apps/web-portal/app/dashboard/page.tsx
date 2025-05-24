"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/supabaseClient'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { motion } from 'framer-motion'
import { Download, BarChart, Clock, Settings } from 'lucide-react'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isFromDesktop, setIsFromDesktop] = useState(false)
  const [showDesktopAuth, setShowDesktopAuth] = useState(false)
  const router = useRouter()

  useEffect(() => {
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

        if (!data.session?.user) {
          // If no user and from desktop, redirect to login with source parameter
          if (isFromDesktop) {
            router.push('/login?source=desktop')
          } else {
            router.push('/login')
          }
        }
      } catch (error) {
        console.error('Error checking auth status:', error)
      } finally {
        setLoading(false)
      }
    }

    checkUser()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      if (!session?.user) {
        // If no user and from desktop, redirect to login with source parameter
        if (isFromDesktop) {
          router.push('/login?source=desktop')
        } else {
          router.push('/login')
        }
      }
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [router, isFromDesktop])

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  // Handle desktop app authentication
  const handleDesktopAuth = () => {
    if (!user) return

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Desktop App Authentication Banner */}
      {showDesktopAuth && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800"
        >
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
        </motion.div>
      )}

      <main className="flex-grow py-8 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-300">Welcome back, {user?.email}</p>
            </div>
            <div className="mt-4 md:mt-0">
              <Button onClick={handleLogout} variant="outline">Sign out</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                  <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">No calls recorded yet</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Suggestions Used</CardTitle>
                  <BarChart className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">No suggestions used yet</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Desktop App</CardTitle>
                  <Download className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm" className="w-full">
                    Download App
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
                <CardDescription>Complete these steps to set up your Closezly experience</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-300">
                      1
                    </div>
                    <div className="ml-4">
                      <h3 className="font-medium text-gray-900 dark:text-white">Download the desktop app</h3>
                      <p className="text-gray-600 dark:text-gray-300">Install our desktop application to get real-time sales guidance during calls.</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-300">
                      2
                    </div>
                    <div className="ml-4">
                      <h3 className="font-medium text-gray-900 dark:text-white">Connect your CRM</h3>
                      <p className="text-gray-600 dark:text-gray-300">Link your CRM system to access customer data during calls.</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-300">
                      3
                    </div>
                    <div className="ml-4">
                      <h3 className="font-medium text-gray-900 dark:text-white">Upload product information</h3>
                      <p className="text-gray-600 dark:text-gray-300">Add your product details and sales materials for better AI suggestions.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="text-center"
          >
            <p className="text-gray-600 dark:text-gray-300">
              This dashboard is currently in development. More features coming soon!
            </p>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/src/supabaseClient'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loginSuccess, setLoginSuccess] = useState(false)
  const [redirectHandled, setRedirectHandled] = useState(false)
  const [showExistingSession, setShowExistingSession] = useState(false)
  const router = useRouter()

  // Check if this login was initiated from the desktop app
  const [isFromDesktop, setIsFromDesktop] = useState(false)
  const [isDesktopCheckComplete, setIsDesktopCheckComplete] = useState(false)

  useEffect(() => {
    // Check if the URL has a 'source=desktop' parameter
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const source = urlParams.get('source')
      setIsFromDesktop(source === 'desktop')
    }
    // Mark desktop check as complete
    setIsDesktopCheckComplete(true)
  }, [])

  // Handle successful login
  const handleSuccessfulLogin = (session: any) => {
    // Prevent multiple calls to this function
    if (redirectHandled) {
      return
    }
    setRedirectHandled(true)

    if (isFromDesktop) {
      // Show success state first
      setLoginSuccess(true)
      setUser(session.user)

      // Don't immediately redirect - let user see success state and click button
    } else {
      // Normal web login, redirect to dashboard
      router.push('/dashboard')
    }
  }

  // Handle existing session for desktop users
  const handleExistingSession = (session: any) => {
    if (isFromDesktop) {
      // Show options for existing session
      setShowExistingSession(true)
      setUser(session.user)
      setRedirectHandled(true) // Prevent auth state change listener from overriding this
    } else {
      // Normal web flow - redirect to dashboard
      router.push('/dashboard')
    }
  }

  // Continue with existing account
  const continueWithExistingAccount = () => {
    if (user) {
      setShowExistingSession(false)
      setLoginSuccess(true)
      setRedirectHandled(true)
    }
  }

  // Logout and show login form
  const logoutAndShowLogin = async () => {
    await supabase.auth.signOut()
    setShowExistingSession(false)
    setUser(null)
    setRedirectHandled(false)
  }

  // Handle desktop app redirect
  const handleDesktopRedirect = () => {
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

  useEffect(() => {
    // Don't check session until we've determined if this is from desktop
    if (!isDesktopCheckComplete) {
      return
    }

    const checkUser = async () => {
      const { data } = await supabase.auth.getSession()
      setUser(data.session?.user || null)
      if (data.session?.user && !redirectHandled) {
        // Use existing session handler for better UX
        handleExistingSession(data.session)
      }
    }

    checkUser()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      if (session?.user && !redirectHandled) {
        // Only handle actual sign-in events, not initial session detection
        if (_event === 'SIGNED_IN') {
          handleSuccessfulLogin(session)
        }
      }
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [router, isFromDesktop, redirectHandled, isDesktopCheckComplete])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        // Don't call handleSuccessfulLogin here - let the auth state change listener handle it
        // This prevents the duplicate call issue
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center py-12 bg-gray-50 dark:bg-gray-900">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md px-4"
        >
          <Card className="w-full">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">
                {loginSuccess && isFromDesktop
                  ? 'Login Successful!'
                  : showExistingSession && isFromDesktop
                  ? 'Already Logged In'
                  : 'Sign in to your account'
                }
              </CardTitle>
              <CardDescription className="text-center">
                {loginSuccess && isFromDesktop
                  ? 'You have successfully logged in. Click the button below to return to the desktop app.'
                  : showExistingSession && isFromDesktop
                  ? 'You are already logged in to this account. Choose how you want to continue.'
                  : 'Enter your email and password to access your account'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loginSuccess && isFromDesktop ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-4">
                      <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Welcome back, {user?.email}!
                    </p>
                  </div>
                  <Button onClick={handleDesktopRedirect} className="w-full">
                    Return to Desktop App
                  </Button>
                </div>
              ) : showExistingSession && isFromDesktop ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
                      <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Currently logged in as: <strong>{user?.email}</strong>
                    </p>
                  </div>
                  <div className="space-y-3">
                    <Button onClick={continueWithExistingAccount} className="w-full">
                      Continue with This Account
                    </Button>
                    <Button onClick={logoutAndShowLogin} variant="outline" className="w-full">
                      Login with Different Account
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="name@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Password
                      </label>
                      <Link href="/forgot-password" className="text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300">
                        Forgot password?
                      </Link>
                    </div>
                    <input
                      id="password"
                      type="password"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  {error && (
                    <div className="text-sm text-red-500 dark:text-red-400">
                      {error}
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign in'}
                  </Button>
                </form>
              )}
            </CardContent>
            {!(loginSuccess && isFromDesktop) && !(showExistingSession && isFromDesktop) && (
              <CardFooter className="flex flex-col space-y-4">
                <div className="text-sm text-center text-gray-500 dark:text-gray-400">
                  Don't have an account?{' '}
                  <Link href="/signup" className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300">
                    Sign up
                  </Link>
                </div>
              </CardFooter>
            )}
          </Card>
        </motion.div>
      </main>
      <Footer />
    </div>
  )
}

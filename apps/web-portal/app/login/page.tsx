"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { EnhancedInput } from '@/components/ui/enhanced-input'
import { LoadingButton } from '@/components/ui/loading-button'
import { SocialLoginSection } from '@/components/ui/social-login-section'
import { BottomTermsPrivacy } from '@/components/ui/bottom-terms-privacy'

import { motion } from 'framer-motion'
import { CheckCircle } from 'lucide-react'

export default function LoginPage() {
  const [step, setStep] = useState(1) // 1: email, 2: password
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
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
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
    const supabase = createClient()
    await supabase.auth.signOut()
    setShowExistingSession(false)
    setUser(null)
    setRedirectHandled(false)
  }

  // Handle desktop app redirect
  const handleDesktopRedirect = () => {
    if (!user) return

    // Get the current session to ensure we have fresh tokens
    const supabase = createClient()
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
    // Don't check session until we've determined if this is from desktop and component is mounted
    if (!isDesktopCheckComplete || !isMounted) {
      return
    }

    const supabase = createClient()

    const checkUser = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()

        // Handle refresh token errors by clearing the session
        if (error && error.message?.includes('refresh_token_not_found')) {
          console.log('Invalid refresh token detected, clearing session')
          await supabase.auth.signOut()
          setUser(null)
          return
        }

        if (error) {
          console.error('Session check error:', error)
          setUser(null)
          return
        }

        setUser(data.session?.user || null)
        if (data.session?.user && !redirectHandled) {
          // Use existing session handler for better UX
          handleExistingSession(data.session)
        }
      } catch (err) {
        console.error('Unexpected error checking session:', err)
        setUser(null)
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
  }, [isDesktopCheckComplete, isMounted, redirectHandled])

  // Handle email step submission
  const handleEmailStep = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setStep(2)
  }

  // Handle password step submission (final login)
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
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

  // Go back to previous step
  const goBack = () => {
    setError(null)
    setStep(step - 1)
  }

  // Prevent hydration mismatch by showing loading state until mounted
  if (!isMounted) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Closezly Logo */}
        <div className="flex justify-start pt-8 pb-4 px-4">
          <Link href="/" className="text-2xl font-bold text-foreground hover:text-primary transition-colors">
            Closezly
          </Link>
        </div>
        <main className="flex-grow flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            <Card className="border shadow-lg">
              <CardContent className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Closezly Logo */}
      <div className="flex justify-start pt-8 pb-4 px-4">
        <Link href="/" className="text-2xl font-bold text-foreground hover:text-primary transition-colors">
          Closezly
        </Link>
      </div>

      <main className="flex-grow flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <Card className="border shadow-lg">
            <CardHeader className="text-center pb-8 pt-10 px-8">
              <div>
                <CardTitle className="text-3xl font-semibold mb-3">
                  {loginSuccess && isFromDesktop
                    ? 'Login Successful!'
                    : showExistingSession && isFromDesktop
                    ? 'Already Logged In'
                    : step === 1
                    ? 'Welcome back'
                    : 'Enter your password'
                  }
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  {loginSuccess && isFromDesktop
                    ? 'You have successfully logged in. Click the button below to return to the desktop app.'
                    : showExistingSession && isFromDesktop
                    ? 'You are already logged in to this account. Choose how you want to continue.'
                    : step === 1
                    ? 'Sign in to continue to your sales dashboard'
                    : `Continue as ${email}`
                  }
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-8 pb-6">
              {loginSuccess && isFromDesktop ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                      <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Welcome back, {user?.email}!
                    </p>
                  </div>
                  <Button onClick={handleDesktopRedirect} className="w-full h-12 text-base font-semibold">
                    Return to Desktop App
                  </Button>
                </div>
              ) : showExistingSession && isFromDesktop ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-6">
                      <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">
                      Currently logged in as: <strong>{user?.email}</strong>
                    </p>
                  </div>
                  <div className="space-y-3">
                    <Button onClick={continueWithExistingAccount} className="w-full h-12 text-base font-semibold">
                      Continue with This Account
                    </Button>
                    <Button onClick={logoutAndShowLogin} variant="outline" className="w-full h-12 text-base font-semibold">
                      Login with Different Account
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Step 1: Email Collection */}
                  {step === 1 && (
                    <motion.form
                      onSubmit={handleEmailStep}
                      className="space-y-6"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <EnhancedInput
                        id="email"
                        type="email"
                        label="Email address"
                        floatingLabel
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        error={error}
                        required
                        autoFocus
                      />
                      <Button type="submit" className="w-full h-12 text-base font-semibold">
                        Continue
                      </Button>
                    </motion.form>
                  )}

                  {/* Step 2: Password Entry */}
                  {step === 2 && (
                    <motion.form
                      onSubmit={handleLogin}
                      className="space-y-6"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="space-y-4">
                        <EnhancedInput
                          id="password"
                          type="password"
                          label="Password"
                          floatingLabel
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          showPasswordToggle
                          error={error}
                          required
                          autoFocus
                        />
                        <div className="flex justify-between items-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={goBack}
                            className="text-sm text-muted-foreground hover:text-foreground"
                          >
                            ← Back
                          </Button>
                          <Link
                            href="/forgot-password"
                            className="text-sm text-primary hover:text-primary/80 transition-colors underline"
                          >
                            Forgot password?
                          </Link>
                        </div>
                      </div>
                      <LoadingButton
                        type="submit"
                        className="w-full h-12 text-base font-semibold"
                        loading={loading}
                        loadingText="Signing in..."
                        successIcon={<CheckCircle className="h-5 w-5" />}
                      >
                        Sign in
                      </LoadingButton>
                    </motion.form>
                  )}

                  {/* Social Login - Only show on step 1 */}
                  {step === 1 && (
                    <SocialLoginSection
                      mode="login"
                      onError={(error) => setError(error)}
                    />
                  )}
                </div>
              )}
            </CardContent>
            {!(loginSuccess && isFromDesktop) && !(showExistingSession && isFromDesktop) && (
              <CardFooter className="pt-4 pb-8">
                <div className="w-full text-center">
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?{' '}
                    <Link
                      href="/signup"
                      className="text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Sign up
                    </Link>
                  </p>
                </div>
              </CardFooter>
            )}
          </Card>
        </motion.div>
      </main>

      {/* Terms and Privacy Policy - Fixed at bottom */}
      <BottomTermsPrivacy />
    </div>
  )
}

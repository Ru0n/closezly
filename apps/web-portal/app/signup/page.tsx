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
import { Check, CheckCircle } from 'lucide-react'

export default function SignupPage() {
  const [step, setStep] = useState(1) // 1: email, 2: password, 3: username
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const checkUser = async () => {
      const { data } = await supabase.auth.getSession()
      setUser(data.session?.user || null)
      if (data.session?.user) {
        router.push('/dashboard')
      }
    }

    checkUser()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        router.push('/dashboard')
      }
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [router])

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

  // Handle password step submission
  const handlePasswordStep = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setStep(3)
  }

  // Handle final signup submission
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (username.length < 3) {
      setError('Username must be at least 3 characters long')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      // Sign up with email and password
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username
          }
        }
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
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
                  {success
                    ? 'Check your email'
                    : step === 1
                    ? 'Create an account'
                    : step === 2
                    ? 'Create your password'
                    : 'Choose your username'
                  }
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  {success
                    ? `We've sent a confirmation link to ${email}`
                    : step === 1
                    ? 'Create your account and start closing more deals'
                    : step === 2
                    ? 'Choose a secure password for your account'
                    : 'Pick a username that represents you professionally'
                  }
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-8 pb-6">
              {success ? (
                <div className="text-center py-6 space-y-4">
                  <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Please check your email and click the link to complete your registration.
                    </p>
                  </div>
                  <Button asChild variant="outline" className="h-12 text-base font-semibold">
                    <Link href="/login">Return to login</Link>
                  </Button>
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

                  {/* Step 2: Password Creation */}
                  {step === 2 && (
                    <motion.form
                      onSubmit={handlePasswordStep}
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
                          required
                          autoFocus
                        />
                        <EnhancedInput
                          id="confirmPassword"
                          type="password"
                          label="Confirm password"
                          floatingLabel
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          showPasswordToggle
                          error={error}
                          required
                        />
                        <div className="flex justify-start">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={goBack}
                            className="text-sm text-muted-foreground hover:text-foreground"
                          >
                            ← Back
                          </Button>
                        </div>
                      </div>
                      <Button type="submit" className="w-full h-12 text-base font-semibold">
                        Continue
                      </Button>
                    </motion.form>
                  )}

                  {/* Step 3: Username Setup */}
                  {step === 3 && (
                    <motion.form
                      onSubmit={handleSignup}
                      className="space-y-6"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="space-y-4">
                        <EnhancedInput
                          id="username"
                          type="text"
                          label="Username"
                          floatingLabel
                          value={username}
                          onChange={e => setUsername(e.target.value)}
                          error={error}
                          required
                          minLength={3}
                          autoFocus
                        />
                        <div className="flex justify-start">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={goBack}
                            className="text-sm text-muted-foreground hover:text-foreground"
                          >
                            ← Back
                          </Button>
                        </div>
                      </div>

                      <LoadingButton
                        type="submit"
                        className="w-full h-12 text-base font-semibold"
                        loading={loading}
                        loadingText="Creating account..."
                        successIcon={<CheckCircle className="h-5 w-5" />}
                      >
                        Create Account
                      </LoadingButton>
                    </motion.form>
                  )}

                  {/* Social Login - Only show on step 1 */}
                  {step === 1 && (
                    <SocialLoginSection
                      mode="signup"
                      onError={(error) => setError(error)}
                    />
                  )}
                </div>
              )}
            </CardContent>
            {!success && (
              <CardFooter className="pt-4 pb-8">
                <div className="w-full text-center">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link
                      href="/login"
                      className="text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Sign in
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

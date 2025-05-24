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
import { Check } from 'lucide-react'

export default function SignupPage() {
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

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters long')
      setLoading(false)
      return
    }

    try {
      // Sign up with email and password
      const { data, error } = await supabase.auth.signUp({
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
              <CardTitle className="text-2xl font-bold text-center">Create an account</CardTitle>
              <CardDescription className="text-center">
                Enter your email, choose a username, and create a password to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              {success ? (
                <div className="text-center py-6">
                  <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                    <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Check your email</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    We've sent a confirmation link to <strong>{email}</strong>.
                    Please check your email and click the link to complete your registration.
                  </p>
                  <Button asChild variant="outline">
                    <Link href="/login">Return to login</Link>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSignup} className="space-y-4">
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
                    <label htmlFor="username" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Username
                    </label>
                    <input
                      id="username"
                      type="text"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="johndoe"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      required
                      minLength={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  {error && (
                    <div className="text-sm text-red-500 dark:text-red-400">
                      {error}
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Creating account...' : 'Create account'}
                  </Button>
                </form>
              )}
            </CardContent>
            {!success && (
              <CardFooter className="flex flex-col space-y-4">
                <div className="text-sm text-center text-gray-500 dark:text-gray-400">
                  Already have an account?{' '}
                  <Link href="/login" className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300">
                    Sign in
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

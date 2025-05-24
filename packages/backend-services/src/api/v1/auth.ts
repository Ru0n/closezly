import { Router, Request, Response } from 'express'
import { supabase } from '../../supabaseClient'
// import { z } from 'zod' // Uncomment if zod is installed for validation

const router = Router()

// Example Zod schema (uncomment if zod is installed)
// const authSchema = z.object({
//   email: z.string().email(),
//   password: z.string().min(8)
// })

// POST /api/v1/auth/register
router.post('/register', (req: Request, res: Response) => {
  (async () => {
    const { email, password, username } = req.body
    // Uncomment for Zod validation
    // const parse = authSchema.safeParse({ email, password })
    // if (!parse.success) return res.status(400).json({ error: parse.error.errors })
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
    if (typeof email !== 'string' || !email.includes('@')) return res.status(400).json({ error: 'Invalid email format' })
    if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })

    // Check if username is provided
    if (username && typeof username === 'string') {
      if (username.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters long' })
      }

      // Check if username is already taken
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .limit(1)

      if (userError) {
        return res.status(500).json({ error: 'Error checking username availability' })
      }

      if (existingUser && existingUser.length > 0) {
        return res.status(400).json({ error: 'Username is already taken' })
      }
    }

    // Sign up the user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || undefined
        }
      }
    })

    if (error) return res.status(400).json({ error: error.message })

    // If signup was successful and we have a user, store the username in the users table
    if (data.user && username) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ username })
        .eq('id', data.user.id)

      if (updateError) {
        console.error('Error updating username:', updateError)
        // We don't return an error here as the user was created successfully
      }
    }

    res.status(201).json({ user: data.user })
  })().catch(err => res.status(500).json({ error: err.message }))
})

// POST /api/v1/auth/login
router.post('/login', (req: Request, res: Response) => {
  (async () => {
    const { email, password } = req.body
    // Uncomment for Zod validation
    // const parse = authSchema.safeParse({ email, password })
    // if (!parse.success) return res.status(400).json({ error: parse.error.errors })
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
    if (typeof email !== 'string' || !email.includes('@')) return res.status(400).json({ error: 'Invalid email format' })
    if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return res.status(401).json({ error: error.message })
    res.status(200).json({ user: data.user, access_token: data.session?.access_token, refresh_token: data.session?.refresh_token })
  })().catch(err => res.status(500).json({ error: err.message }))
})

// POST /api/v1/auth/refresh-token
router.post('/refresh-token', (req: Request, res: Response) => {
  (async () => {
    const { refresh_token } = req.body
    if (!refresh_token) return res.status(400).json({ error: 'Refresh token required' })
    const { data, error } = await supabase.auth.refreshSession({ refresh_token })
    if (error) return res.status(401).json({ error: error.message })
    res.status(200).json({ access_token: data.session?.access_token, refresh_token: data.session?.refresh_token })
  })().catch(err => res.status(500).json({ error: err.message }))
})

// POST /api/v1/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  (async () => {
    const { access_token } = req.body
    if (!access_token) return res.status(400).json({ error: 'Access token required' })
    const { error } = await supabase.auth.signOut()
    if (error) return res.status(400).json({ error: error.message })
    res.status(200).json({ message: 'Logged out' })
  })().catch(err => res.status(500).json({ error: err.message }))
})

// GET /api/v1/auth/me
router.get('/me', (req: Request, res: Response) => {
  (async () => {
    const authHeader = req.headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    // Get additional user data from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('username, full_name, profile_picture_url, subscription_status')
      .eq('id', data.user.id)
      .single()

    if (userError) {
      console.error('Error fetching user data:', userError)
      // Continue with just the auth user data
    }

    // Combine auth user data with additional user data
    const userResponse = {
      ...data.user,
      username: userData?.username || data.user.user_metadata?.username,
      full_name: userData?.full_name,
      profile_picture_url: userData?.profile_picture_url,
      subscription_status: userData?.subscription_status || 'free'
    }

    res.status(200).json({ user: userResponse })
  })().catch(err => res.status(500).json({ error: err.message }))
})

// PUT /api/v1/auth/profile
router.put('/profile', (req: Request, res: Response) => {
  (async () => {
    const authHeader = req.headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: userError } = await supabase.auth.getUser(token)

    if (userError || !userData.user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const { username, full_name } = req.body
    const updates: { username?: string, full_name?: string } = {}

    // Validate username if provided
    if (username !== undefined) {
      if (typeof username !== 'string') {
        return res.status(400).json({ error: 'Username must be a string' })
      }

      if (username && username.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters long' })
      }

      // Check if username is already taken (skip if username is empty)
      if (username) {
        const { data: existingUser, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('username', username)
          .neq('id', userData.user.id) // Exclude current user
          .limit(1)

        if (userError) {
          return res.status(500).json({ error: 'Error checking username availability' })
        }

        if (existingUser && existingUser.length > 0) {
          return res.status(400).json({ error: 'Username is already taken' })
        }
      }

      updates.username = username
    }

    // Validate full_name if provided
    if (full_name !== undefined) {
      if (typeof full_name !== 'string') {
        return res.status(400).json({ error: 'Full name must be a string' })
      }

      updates.full_name = full_name
    }

    // Update user metadata in Supabase Auth
    const { error: updateAuthError } = await supabase.auth.updateUser({
      data: {
        username: updates.username,
        full_name: updates.full_name
      }
    })

    if (updateAuthError) {
      return res.status(500).json({ error: 'Error updating user metadata' })
    }

    // Update user profile in database
    const { error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userData.user.id)

    if (updateError) {
      return res.status(500).json({ error: 'Error updating user profile' })
    }

    // Return updated user profile
    const { data: updatedUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userData.user.id)
      .single()

    if (fetchError) {
      return res.status(500).json({ error: 'Error fetching updated user profile' })
    }

    res.status(200).json({ user: updatedUser })
  })().catch(err => res.status(500).json({ error: err.message }))
})

// POST /api/v1/auth/profile/picture
router.post('/profile/picture', (req: Request, res: Response) => {
  (async () => {
    const authHeader = req.headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: userError } = await supabase.auth.getUser(token)

    if (userError || !userData.user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const { profile_picture_url } = req.body

    // Validate profile_picture_url
    if (!profile_picture_url || typeof profile_picture_url !== 'string') {
      return res.status(400).json({ error: 'Profile picture URL is required and must be a string' })
    }

    // Update user profile in database
    const { error: updateError } = await supabase
      .from('users')
      .update({ profile_picture_url })
      .eq('id', userData.user.id)

    if (updateError) {
      return res.status(500).json({ error: 'Error updating profile picture' })
    }

    // Update user metadata in Supabase Auth
    const { error: updateAuthError } = await supabase.auth.updateUser({
      data: {
        profile_picture_url
      }
    })

    if (updateAuthError) {
      return res.status(500).json({ error: 'Error updating user metadata' })
    }

    // Return updated user profile
    const { data: updatedUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userData.user.id)
      .single()

    if (fetchError) {
      return res.status(500).json({ error: 'Error fetching updated user profile' })
    }

    res.status(200).json({ user: updatedUser })
  })().catch(err => res.status(500).json({ error: err.message }))
})

export default router

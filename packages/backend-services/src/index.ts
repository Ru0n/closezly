import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import { supabase } from './supabaseClient'
import { authMiddleware } from './authMiddleware'
import v1Router from './api/v1'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV || 'development' })
})

// Example: Use Supabase in an endpoint (placeholder)
app.get('/supabase-status', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // This just checks if the client is initialized and can list tables (public schema)
    const { data, error } = await supabase.from('users').select('user_id').limit(1)
    if (error) {
      res.status(500).json({ status: 'error', error: error.message })
      return
    }
    res.json({ status: 'ok', userSample: data })
  } catch (err) {
    next(err)
  }
})

app.get('/me', authMiddleware, (req: Request, res: Response) => {
  res.json({ user: (req as any).user })
})

app.use('/api/v1', v1Router)

app.listen(PORT, () => {
  console.log(`Closezly Backend API running on port ${PORT}`)
})
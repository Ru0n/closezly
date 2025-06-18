import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import { supabase } from './supabaseClient'
import { authMiddleware } from './authMiddleware'
import v1Router from './api/v1'
import cors from 'cors'
import {
  globalErrorHandler,
  requestIdMiddleware,
  notFoundHandler
} from './utils/errorHandler'
import {
  requestLoggingMiddleware,
  logStartup,
  logger
} from './utils/logger'
import { validateEnvironmentConfig } from './utils/validation'

const app = express()
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000

// Validate environment configuration on startup
const envValidation = validateEnvironmentConfig()
if (!envValidation.isValid) {
  console.error('Environment validation failed:', envValidation.errors)
  process.exit(1)
}

if (envValidation.warnings) {
  envValidation.warnings.forEach(warning => {
    console.warn('Environment warning:', warning)
  })
}

// Middleware
app.use(requestIdMiddleware)
app.use(requestLoggingMiddleware)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cors())

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV || 'development' })
})

// Example: Use Supabase in an endpoint (placeholder)
app.get('/supabase-status', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // This just checks if the client is initialized and can list tables (public schema)
    const { data, error } = await supabase.from('users').select('id').limit(1)
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

// Error handling middleware (must be last)
app.use(notFoundHandler)
app.use(globalErrorHandler)

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully')
  process.exit(0)
})

app.listen(PORT, () => {
  logStartup()
  logger.info(`Closezly Backend API running on port ${PORT}`)
})
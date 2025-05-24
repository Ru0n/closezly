import { Router, Request, Response } from 'express'
import authRouter from './auth'

const router = Router()

// Health check endpoint for v1
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', version: 'v1' })
})

router.use('/auth', authRouter)

export default router

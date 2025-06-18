import { Router, Request, Response } from 'express'
import authRouter from './auth'
import assistRouter from './assist'

const router = Router()

// Health check endpoint for v1
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', version: 'v1' })
})

router.use('/auth', authRouter)
router.use('/assist', assistRouter)

export default router

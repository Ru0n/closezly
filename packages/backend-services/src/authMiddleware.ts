import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from './supabaseClient'

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  (async () => {
    const authHeader = req.headers['authorization']
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    // Attach user to request
    ;(req as any).user = data.user
    next()
  })().catch(next)
} 
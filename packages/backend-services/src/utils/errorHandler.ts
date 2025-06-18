import { Request, Response, NextFunction } from 'express'

export interface ErrorResponse {
  success: false
  error: string
  code: string
  details?: any
  timestamp: string
  requestId?: string
}

export class AppError extends Error {
  public statusCode: number
  public code: string
  public isOperational: boolean
  public details?: any

  constructor(message: string, statusCode: number, code: string, details?: any) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true
    this.details = details

    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Predefined error types for common scenarios
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details)
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR')
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR')
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND')
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED')
  }
}

export class LLMError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'LLM_ERROR', details)
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, details?: any) {
    super(`${service} service error: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', details)
  }
}

/**
 * Global error handler middleware
 */
export function globalErrorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Generate request ID for tracking
  const requestId = req.headers['x-request-id'] as string || generateRequestId()

  // Log the error
  logError(error, req, requestId)

  // Handle operational errors
  if (error instanceof AppError && error.isOperational) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
      timestamp: new Date().toISOString(),
      requestId
    }

    res.status(error.statusCode).json(errorResponse)
    return
  }

  // Handle programming errors and unknown errors
  const errorResponse: ErrorResponse = {
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    requestId
  }

  // In development, include stack trace
  if (process.env.NODE_ENV === 'development') {
    errorResponse.details = {
      message: error.message,
      stack: error.stack
    }
  }

  res.status(500).json(errorResponse)
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Validation error handler
 */
export function handleValidationError(validationResult: any, message: string = 'Validation failed') {
  if (!validationResult.isValid) {
    throw new ValidationError(message, {
      errors: validationResult.errors,
      warnings: validationResult.warnings
    })
  }
}

/**
 * LLM error handler
 */
export function handleLLMError(llmResponse: any, context?: string) {
  if (!llmResponse.success) {
    const errorMessage = context
      ? `${context}: ${llmResponse.error}`
      : llmResponse.error || 'LLM generation failed'

    throw new LLMError(errorMessage, {
      originalError: llmResponse.error,
      context
    })
  }
}

/**
 * External service error handler
 */
export function handleExternalServiceError(serviceName: string, error: any) {
  let message = 'Unknown service error'
  let details = {}

  if (error.response) {
    // HTTP error response
    message = error.response.data?.message || error.response.statusText || 'HTTP error'
    details = {
      status: error.response.status,
      data: error.response.data
    }
  } else if (error.request) {
    // Network error
    message = 'Network error - service unavailable'
    details = { timeout: error.timeout }
  } else if (error.message) {
    message = error.message
  }

  throw new ExternalServiceError(serviceName, message, details)
}

/**
 * Log error with context
 */
function logError(error: Error | AppError, req: Request, requestId: string): void {
  const logData = {
    requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  }

  if (error instanceof AppError) {
    (logData.error as any).statusCode = error.statusCode;
    (logData.error as any).code = error.code;
    (logData.error as any).isOperational = error.isOperational;
    (logData.error as any).details = error.details;
  }

  // Log based on severity
  if (error instanceof AppError && error.statusCode < 500) {
    console.warn('[ERROR]', JSON.stringify(logData, null, 2))
  } else {
    console.error('[CRITICAL ERROR]', JSON.stringify(logData, null, 2))
  }
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Request ID middleware
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.headers['x-request-id'] as string || generateRequestId()
  req.headers['x-request-id'] = requestId
  res.setHeader('x-request-id', requestId)
  next()
}

/**
 * Not found handler
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  throw new NotFoundError(`Route ${req.method} ${req.path} not found`)
}

/**
 * Health check error handler
 */
export function createHealthCheckError(service: string, error: any): AppError {
  return new ExternalServiceError(service, 'Health check failed', {
    originalError: error.message,
    timestamp: new Date().toISOString()
  })
}

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogEntry {
  timestamp: string
  level: string
  message: string
  service: string
  requestId?: string
  userId?: string
  metadata?: any
}

class Logger {
  private logLevel: LogLevel
  private service: string

  constructor(service: string = 'backend-services') {
    this.service = service
    this.logLevel = this.getLogLevel()
  }

  private getLogLevel(): LogLevel {
    const level = process.env.LOG_LEVEL?.toUpperCase() || 'INFO'
    switch (level) {
      case 'ERROR': return LogLevel.ERROR
      case 'WARN': return LogLevel.WARN
      case 'INFO': return LogLevel.INFO
      case 'DEBUG': return LogLevel.DEBUG
      default: return LogLevel.INFO
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel
  }

  private formatLog(level: string, message: string, metadata?: any, requestId?: string, userId?: string): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      requestId,
      userId,
      metadata
    }
  }

  private writeLog(logEntry: LogEntry): void {
    const logString = JSON.stringify(logEntry)
    
    switch (logEntry.level) {
      case 'ERROR':
        console.error(logString)
        break
      case 'WARN':
        console.warn(logString)
        break
      case 'INFO':
        console.info(logString)
        break
      case 'DEBUG':
        console.debug(logString)
        break
      default:
        console.log(logString)
    }
  }

  error(message: string, metadata?: any, requestId?: string, userId?: string): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const logEntry = this.formatLog('ERROR', message, metadata, requestId, userId)
      this.writeLog(logEntry)
    }
  }

  warn(message: string, metadata?: any, requestId?: string, userId?: string): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const logEntry = this.formatLog('WARN', message, metadata, requestId, userId)
      this.writeLog(logEntry)
    }
  }

  info(message: string, metadata?: any, requestId?: string, userId?: string): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const logEntry = this.formatLog('INFO', message, metadata, requestId, userId)
      this.writeLog(logEntry)
    }
  }

  debug(message: string, metadata?: any, requestId?: string, userId?: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const logEntry = this.formatLog('DEBUG', message, metadata, requestId, userId)
      this.writeLog(logEntry)
    }
  }

  // Specialized logging methods for different contexts
  llmRequest(prompt: string, requestId?: string, userId?: string): void {
    this.info('LLM request initiated', {
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '')
    }, requestId, userId)
  }

  llmResponse(response: any, requestId?: string, userId?: string): void {
    this.info('LLM response received', {
      success: response.success,
      textLength: response.text?.length || 0,
      usage: response.usage,
      error: response.error
    }, requestId, userId)
  }

  apiRequest(method: string, path: string, statusCode: number, duration: number, requestId?: string, userId?: string): void {
    this.info('API request completed', {
      method,
      path,
      statusCode,
      duration,
      success: statusCode < 400
    }, requestId, userId)
  }

  authEvent(event: string, userId?: string, requestId?: string, metadata?: any): void {
    this.info(`Auth event: ${event}`, metadata, requestId, userId)
  }

  validationError(errors: string[], requestId?: string, userId?: string): void {
    this.warn('Validation failed', { errors }, requestId, userId)
  }

  performanceMetric(metric: string, value: number, unit: string, requestId?: string): void {
    this.debug(`Performance metric: ${metric}`, { value, unit }, requestId)
  }
}

// Create singleton logger instance
export const logger = new Logger()

// Specialized loggers for different services
export const llmLogger = new Logger('llm-service')
export const apiLogger = new Logger('api')
export const authLogger = new Logger('auth')

// Request logging middleware
export function requestLoggingMiddleware(req: any, res: any, next: any): void {
  const startTime = Date.now()
  const requestId = req.headers['x-request-id']
  const userId = req.user?.id

  // Log incoming request
  apiLogger.info('Incoming request', {
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    query: req.query,
    bodySize: req.headers['content-length']
  }, requestId, userId)

  // Override res.json to log response
  const originalJson = res.json
  res.json = function(body: any) {
    const duration = Date.now() - startTime
    
    apiLogger.apiRequest(
      req.method,
      req.path,
      res.statusCode,
      duration,
      requestId,
      userId
    )

    // Log response details for errors
    if (res.statusCode >= 400) {
      apiLogger.warn('Error response', {
        statusCode: res.statusCode,
        error: body.error,
        code: body.code
      }, requestId, userId)
    }

    return originalJson.call(this, body)
  }

  next()
}

// Performance monitoring
export class PerformanceMonitor {
  private startTime: number
  private requestId?: string

  constructor(requestId?: string) {
    this.startTime = Date.now()
    this.requestId = requestId
  }

  end(operation: string): number {
    const duration = Date.now() - this.startTime
    logger.performanceMetric(operation, duration, 'ms', this.requestId)
    return duration
  }

  checkpoint(operation: string): number {
    const duration = Date.now() - this.startTime
    logger.performanceMetric(`${operation}_checkpoint`, duration, 'ms', this.requestId)
    return duration
  }
}

// Utility functions
export function createPerformanceMonitor(requestId?: string): PerformanceMonitor {
  return new PerformanceMonitor(requestId)
}

export function logStartup(): void {
  logger.info('Service starting up', {
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 4000,
    logLevel: process.env.LOG_LEVEL || 'INFO'
  })
}

export function logShutdown(): void {
  logger.info('Service shutting down')
}

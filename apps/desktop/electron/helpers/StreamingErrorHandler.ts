/**
 * StreamingErrorHandler.ts
 *
 * Comprehensive error handling and recovery service for streaming transcription.
 * Provides intelligent fallback mechanisms, error classification, and recovery strategies.
 */

import { EventEmitter } from 'events'

interface ErrorContext {
  component: 'streaming-processor' | 'voice-service' | 'audio-capture' | 'ui'
  operation: string
  timestamp: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  recoverable: boolean
  metadata?: any
}

interface RecoveryStrategy {
  name: string
  description: string
  execute: () => Promise<boolean>
  maxAttempts: number
  backoffMs: number
}

interface ErrorStats {
  totalErrors: number
  errorsByComponent: Record<string, number>
  errorsBySeverity: Record<string, number>
  recoveryAttempts: number
  successfulRecoveries: number
  lastError?: ErrorContext
}

class StreamingErrorHandler extends EventEmitter {
  private static instance: StreamingErrorHandler
  private errorHistory: ErrorContext[] = []
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map()
  private activeRecoveries: Set<string> = new Set()
  private maxHistorySize: number = 100
  private stats: ErrorStats = {
    totalErrors: 0,
    errorsByComponent: {},
    errorsBySeverity: {},
    recoveryAttempts: 0,
    successfulRecoveries: 0
  }

  private constructor() {
    super()
    this.setupRecoveryStrategies()
  }

  public static getInstance(): StreamingErrorHandler {
    if (!StreamingErrorHandler.instance) {
      StreamingErrorHandler.instance = new StreamingErrorHandler()
    }
    return StreamingErrorHandler.instance
  }

  /**
   * Set up recovery strategies for different types of errors
   */
  private setupRecoveryStrategies(): void {
    // Streaming processor recovery
    this.recoveryStrategies.set('streaming-processor-restart', {
      name: 'Streaming Processor Restart',
      description: 'Restart the streaming audio processor',
      execute: async () => {
        try {
          console.log('[ErrorHandler] Attempting to restart streaming processor...')
          this.emit('restart-streaming-processor')
          await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second

          console.log('[ErrorHandler] Streaming processor restart signal sent')
          return true
        } catch (error) {
          console.error('[ErrorHandler] Failed to restart streaming processor:', error)
          return false
        }
      },
      maxAttempts: 2,
      backoffMs: 3000
    })

    // Audio capture recovery
    this.recoveryStrategies.set('audio-capture-restart', {
      name: 'Audio Capture Restart',
      description: 'Restart the audio capture service',
      execute: async () => {
        try {
          const AudioCaptureService = require('./AudioCaptureService').default
          
          console.log('[ErrorHandler] Attempting to restart audio capture...')
          await AudioCaptureService.stopCapture()
          await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
          
          const restarted = await AudioCaptureService.startCapture()
          if (restarted) {
            console.log('[ErrorHandler] Audio capture restarted successfully')
            return true
          }
          return false
        } catch (error) {
          console.error('[ErrorHandler] Failed to restart audio capture:', error)
          return false
        }
      },
      maxAttempts: 2,
      backoffMs: 3000
    })

    // Streaming mode fallback
    this.recoveryStrategies.set('fallback-to-batch', {
      name: 'Fallback to Batch Mode',
      description: 'Switch to batch processing mode',
      execute: async () => {
        try {
          console.log('[ErrorHandler] Falling back to batch processing mode')
          this.emit('force-batch-mode')
          return true
        } catch (error) {
          console.error('[ErrorHandler] Failed to fallback to batch mode:', error)
          return false
        }
      },
      maxAttempts: 1,
      backoffMs: 0
    })

    // Model reload strategy
    this.recoveryStrategies.set('model-reload', {
      name: 'Model Reload',
      description: 'Reload the Whisper model',
      execute: async () => {
        try {
          console.log('[ErrorHandler] Attempting to reload Whisper model...')
          this.emit('reload-whisper-model')
          await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second

          console.log('[ErrorHandler] Whisper model reload signal sent')
          return true
        } catch (error) {
          console.error('[ErrorHandler] Failed to reload model:', error)
          return false
        }
      },
      maxAttempts: 2,
      backoffMs: 3000
    })
  }

  /**
   * Handle an error with automatic recovery attempts
   */
  public async handleError(
    error: Error | string,
    context: Partial<ErrorContext>
  ): Promise<boolean> {
    const errorContext: ErrorContext = {
      component: context.component || 'unknown' as any,
      operation: context.operation || 'unknown',
      timestamp: Date.now(),
      severity: context.severity || 'medium',
      recoverable: context.recoverable !== false,
      metadata: context.metadata
    }

    // Add to history
    this.addToHistory(errorContext)
    
    // Update stats
    this.updateStats(errorContext)

    // Log the error
    console.error(`[ErrorHandler] ${errorContext.severity.toUpperCase()} error in ${errorContext.component}:`, error)

    // Emit error event
    this.emit('error', errorContext, error)

    // Attempt recovery if the error is recoverable
    if (errorContext.recoverable) {
      return await this.attemptRecovery(errorContext)
    }

    return false
  }

  /**
   * Attempt recovery based on error context
   */
  private async attemptRecovery(errorContext: ErrorContext): Promise<boolean> {
    const recoveryKey = this.selectRecoveryStrategy(errorContext)
    
    if (!recoveryKey) {
      console.log('[ErrorHandler] No recovery strategy available for error')
      return false
    }

    // Prevent concurrent recovery attempts for the same strategy
    if (this.activeRecoveries.has(recoveryKey)) {
      console.log('[ErrorHandler] Recovery already in progress for:', recoveryKey)
      return false
    }

    const strategy = this.recoveryStrategies.get(recoveryKey)
    if (!strategy) {
      return false
    }

    this.activeRecoveries.add(recoveryKey)
    this.stats.recoveryAttempts++

    try {
      console.log(`[ErrorHandler] Attempting recovery: ${strategy.name}`)
      this.emit('recovery-started', strategy.name)

      let attempts = 0
      while (attempts < strategy.maxAttempts) {
        attempts++
        
        try {
          const success = await strategy.execute()
          
          if (success) {
            console.log(`[ErrorHandler] Recovery successful: ${strategy.name}`)
            this.stats.successfulRecoveries++
            this.emit('recovery-success', strategy.name)
            return true
          }
        } catch (recoveryError) {
          console.error(`[ErrorHandler] Recovery attempt ${attempts} failed:`, recoveryError)
        }

        // Wait before next attempt
        if (attempts < strategy.maxAttempts && strategy.backoffMs > 0) {
          await new Promise(resolve => setTimeout(resolve, strategy.backoffMs))
        }
      }

      console.error(`[ErrorHandler] Recovery failed after ${attempts} attempts: ${strategy.name}`)
      this.emit('recovery-failed', strategy.name)
      return false

    } finally {
      this.activeRecoveries.delete(recoveryKey)
    }
  }

  /**
   * Select appropriate recovery strategy based on error context
   */
  private selectRecoveryStrategy(errorContext: ErrorContext): string | null {
    const { component, operation, severity } = errorContext

    // Critical errors should fallback immediately
    if (severity === 'critical') {
      return 'fallback-to-batch'
    }

    // Component-specific strategies
    switch (component) {
      case 'streaming-processor':
        if (operation.includes('process') || operation.includes('spawn')) {
          return 'streaming-processor-restart'
        }
        if (operation.includes('model') || operation.includes('initialization')) {
          return 'model-reload'
        }
        if (operation.includes('audio') || operation.includes('chunk')) {
          return 'fallback-to-batch'
        }
        return 'streaming-processor-restart'

      case 'audio-capture':
        return 'audio-capture-restart'

      case 'voice-service':
        if (operation.includes('streaming')) {
          return 'fallback-to-batch'
        }
        return 'streaming-processor-restart'

      default:
        return 'fallback-to-batch'
    }
  }

  /**
   * Add error to history with size management
   */
  private addToHistory(errorContext: ErrorContext): void {
    this.errorHistory.push(errorContext)
    
    // Maintain history size
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift()
    }
  }

  /**
   * Update error statistics
   */
  private updateStats(errorContext: ErrorContext): void {
    this.stats.totalErrors++
    this.stats.errorsByComponent[errorContext.component] = 
      (this.stats.errorsByComponent[errorContext.component] || 0) + 1
    this.stats.errorsBySeverity[errorContext.severity] = 
      (this.stats.errorsBySeverity[errorContext.severity] || 0) + 1
    this.stats.lastError = errorContext
  }

  /**
   * Get error statistics
   */
  public getStats(): ErrorStats {
    return { ...this.stats }
  }

  /**
   * Get recent error history
   */
  public getRecentErrors(count: number = 10): ErrorContext[] {
    return this.errorHistory.slice(-count)
  }

  /**
   * Check if system is in a healthy state
   */
  public isHealthy(): boolean {
    const recentErrors = this.getRecentErrors(5)
    const recentCriticalErrors = recentErrors.filter(e => e.severity === 'critical')
    const recentHighErrors = recentErrors.filter(e => e.severity === 'high')
    
    // System is unhealthy if there are recent critical errors or too many high severity errors
    return recentCriticalErrors.length === 0 && recentHighErrors.length < 3
  }

  /**
   * Force fallback to batch mode
   */
  public forceBatchMode(): void {
    console.log('[ErrorHandler] Forcing fallback to batch mode')
    this.emit('force-batch-mode')
  }

  /**
   * Clear error history and reset stats
   */
  public reset(): void {
    this.errorHistory = []
    this.stats = {
      totalErrors: 0,
      errorsByComponent: {},
      errorsBySeverity: {},
      recoveryAttempts: 0,
      successfulRecoveries: 0
    }
    console.log('[ErrorHandler] Error history and stats reset')
  }
}

export default StreamingErrorHandler
export { ErrorContext, RecoveryStrategy, ErrorStats }

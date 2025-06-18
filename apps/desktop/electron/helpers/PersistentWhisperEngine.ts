/**
 * PersistentWhisperEngine.ts
 *
 * UPGRADED: Now implements TRUE PROCESS POOLING for concurrent whisper-cli processing.
 * Uses multiple worker processes to achieve parallel transcription and reduced queue wait times.
 *
 * Current behavior:
 * - Maintains pool of concurrent whisper-cli processes (default: 3 workers)
 * - Each worker still incurs ~878ms model loading overhead per request
 * - Provides significant performance improvement through parallelization
 * - Intelligent request routing to available workers
 * - Comprehensive worker health monitoring and management
 *
 * Performance improvements:
 * - Concurrent processing: Multiple requests processed simultaneously
 * - Reduced queue wait times: Requests don't wait for single process
 * - Better resource utilization: Uses multiple CPU cores effectively
 * - Higher throughput: Significantly improved requests/second
 *
 * Key features:
 * - True process pooling with multiple workers
 * - Intelligent request routing and load balancing
 * - Worker health monitoring and automatic replacement
 * - Comprehensive performance metrics and monitoring
 * - Configurable pool size for performance tuning
 * - Thread-safe concurrent operation
 */

import { EventEmitter } from 'events'
import { spawn, ChildProcess } from 'child_process'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { v4 as uuidv4 } from 'uuid'
import { ProcessPool, ProcessPoolOptions, PoolStats } from './WhisperProcessPool'

export interface PersistentWhisperOptions {
  modelSize?: 'tiny.en' | 'base.en' | 'small.en'
  language?: string
  maxConcurrentRequests?: number // Deprecated: now controlled by poolSize
  processTimeout?: number // Timeout for pool monitoring
  restartThreshold?: number
  requestTimeout?: number // Timeout for individual transcription requests
  poolSize?: number // Number of worker processes in the pool (default: 3)
}

export interface TranscriptionRequest {
  id: string
  audioFilePath: string
  resolve: (result: TranscriptionResult | null) => void
  reject: (error: Error) => void
  timestamp: number
}

export interface TranscriptionResult {
  success: boolean
  text: string
  segments?: any[]
  duration?: number
  processingTime?: number
}

export interface EngineStatus {
  isRunning: boolean
  isReady: boolean
  processId?: number
  modelLoaded: boolean
  requestsProcessed: number
  averageLatency: number
  lastError?: string
  // Process pool specific status
  poolStats?: PoolStats
  workerCount?: number
  availableWorkers?: number
  poolUtilization?: number
}

/**
 * Process Pool Whisper Engine
 *
 * This class manages a pool of whisper-cli worker processes for concurrent transcription.
 * Provides significant performance improvements through parallel processing.
 */
export class PersistentWhisperEngine extends EventEmitter {
  private options: Required<PersistentWhisperOptions & { requestTimeout: number; poolSize: number }>
  private processPool: ProcessPool | null = null
  private isInitialized = false
  private isReady = false
  private modelCache: any = null

  // Performance tracking (aggregated from pool)
  private lastError: string | undefined = undefined

  // Process management
  private processStartTime = 0
  private lastActivity = 0
  private activityMonitorInterval: NodeJS.Timeout | null = null
  
  constructor(options: PersistentWhisperOptions = {}) {
    super()

    this.options = {
      modelSize: options.modelSize || 'tiny.en',
      language: options.language || 'en',
      maxConcurrentRequests: options.maxConcurrentRequests || 10, // Deprecated but kept for compatibility
      processTimeout: options.processTimeout || 30000, // 30 seconds for pool monitoring
      restartThreshold: options.restartThreshold || 5, // Restart after 5 failures
      requestTimeout: options.requestTimeout || 2000, // 2 seconds for individual requests (878ms model load + transcription)
      poolSize: options.poolSize || 3 // Default pool size of 3 workers
    }

    console.log('[PersistentWhisperEngine] Initialized with process pool, options:', this.options)
  }

  /**
   * Initialize the persistent whisper engine
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      console.log('[PersistentWhisperEngine] Already initialized')
      return true
    }

    try {
      console.log('[PersistentWhisperEngine] Starting initialization...')
      
      // Initialize model cache
      await this.initializeModelCache()
      
      if (!this.modelCache) {
        throw new Error('Failed to initialize model cache')
      }
      
      // Start the process pool
      await this.startProcessPool()
      
      // Start activity monitoring
      this.startActivityMonitoring()
      
      this.isInitialized = true
      console.log('[PersistentWhisperEngine] Initialization completed successfully')
      this.emit('initialized')
      
      return true
    } catch (error) {
      console.error('[PersistentWhisperEngine] Initialization failed:', error)
      this.emit('error', error)
      return false
    }
  }

  /**
   * Initialize model cache with paths and validation
   */
  private async initializeModelCache(): Promise<void> {
    try {
      const projectRoot = path.resolve(process.cwd(), '../..')
      const whisperCppDir = path.join(projectRoot, 'node_modules', 'nodejs-whisper', 'cpp', 'whisper.cpp')
      const whisperCliPath = path.join(whisperCppDir, 'build', 'bin', 'whisper-cli')
      const modelPath = path.join(whisperCppDir, 'models', `ggml-${this.options.modelSize}.bin`)

      // Validate paths
      if (!await this.fileExists(whisperCliPath)) {
        throw new Error(`whisper-cli not found at: ${whisperCliPath}`)
      }
      if (!await this.fileExists(modelPath)) {
        throw new Error(`Model not found at: ${modelPath}`)
      }

      this.modelCache = {
        isLoaded: false,
        modelPath,
        whisperCliPath,
        whisperCppDir,
        lastUsed: Date.now()
      }

      console.log('[PersistentWhisperEngine] Model cache initialized:', {
        modelPath: this.modelCache.modelPath,
        whisperCliPath: this.modelCache.whisperCliPath
      })
    } catch (error) {
      console.error('[PersistentWhisperEngine] Failed to initialize model cache:', error)
      throw error
    }
  }

  /**
   * Initialize the process pool with multiple workers
   */
  private async startProcessPool(): Promise<void> {
    try {
      console.log(`[PersistentWhisperEngine] Initializing process pool with ${this.options.poolSize} workers...`)

      this.processPool = new ProcessPool({
        poolSize: this.options.poolSize,
        whisperCliPath: this.modelCache.whisperCliPath,
        modelPath: this.modelCache.modelPath,
        whisperCppDir: this.modelCache.whisperCppDir,
        language: this.options.language,
        requestTimeout: this.options.requestTimeout
      })

      // Listen for pool events
      this.processPool.on('initialized', () => {
        console.log('[PersistentWhisperEngine] Process pool initialized successfully')
      })

      this.processPool.on('warmedUp', (warmUpInfo) => {
        console.log(`[PersistentWhisperEngine] Pool warmed up: ${warmUpInfo.successCount}/${warmUpInfo.totalWorkers} workers in ${warmUpInfo.totalTime}ms`)

        // Mark as ready only after warm-up
        this.isReady = true
        this.processStartTime = Date.now()
        this.lastActivity = Date.now()

        console.log(`[PersistentWhisperEngine] Engine ready with ${warmUpInfo.successCount} warm workers`)
        this.emit('ready')
      })

      this.processPool.on('warmUpFailed', () => {
        console.error('[PersistentWhisperEngine] Pool warm-up failed - no workers available')
        this.lastError = 'Pool warm-up failed'
        this.emit('error', new Error('Pool warm-up failed'))
      })

      await this.processPool.initialize()

      // Note: isReady will be set to true only after warm-up completes
      console.log(`[PersistentWhisperEngine] Process pool initializing with ${this.options.poolSize} workers...`)

    } catch (error) {
      console.error('[PersistentWhisperEngine] Failed to initialize process pool:', error)
      throw error
    }
  }

  /**
   * Transcribe audio file using the process pool
   */
  async transcribe(audioFilePath: string): Promise<TranscriptionResult | null> {
    if (!this.isInitialized || !this.isReady || !this.processPool) {
      throw new Error('PersistentWhisperEngine not initialized or ready')
    }

    try {
      console.log(`[PersistentWhisperEngine] Submitting transcription request for: ${audioFilePath}`)
      this.lastActivity = Date.now()

      const result = await this.processPool.processRequest(audioFilePath)

      if (result) {
        console.log(`[PersistentWhisperEngine] Transcription completed successfully`)
        return result
      } else {
        console.warn(`[PersistentWhisperEngine] Transcription failed - no result`)
        return null
      }
    } catch (error) {
      console.error(`[PersistentWhisperEngine] Transcription failed:`, error)
      this.lastError = `Transcription failed: ${error instanceof Error ? error.message : String(error)}`
      throw error
    }
  }

  // Note: processQueue method removed - now handled by ProcessPool

  // Note: executeWhisperCli, parseWhisperOutput, and updatePerformanceMetrics methods
  // removed - now handled by ProcessWorker in ProcessPool

  /**
   * Get current engine status including process pool statistics
   */
  getStatus(): EngineStatus {
    const poolStats = this.processPool?.getStatus()

    return {
      isRunning: this.processPool !== null && this.isReady,
      isReady: this.isReady,
      processId: undefined, // Multiple processes in pool
      modelLoaded: false, // Models are loaded fresh for each request in workers
      requestsProcessed: poolStats?.totalRequestsProcessed || 0,
      averageLatency: poolStats?.averageLatency || 0,
      lastError: this.lastError,
      // Process pool specific status
      poolStats,
      workerCount: poolStats?.totalWorkers || 0,
      availableWorkers: poolStats?.availableWorkers || 0,
      poolUtilization: poolStats?.poolUtilization || 0
    }
  }

  /**
   * Start activity monitoring for the process pool
   */
  private startActivityMonitoring(): void {
    this.activityMonitorInterval = setInterval(() => {
      const now = Date.now()

      // Check for excessive inactivity
      if (this.lastActivity > 0 && (now - this.lastActivity) > this.options.processTimeout) {
        console.info('[PersistentWhisperEngine] No recent activity - process pool may be idle')
      }

      // Log pool status periodically
      if (this.processPool) {
        const poolStats = this.processPool.getStatus()
        console.log(`[PersistentWhisperEngine] Pool status: ${poolStats.warmWorkers}/${poolStats.totalWorkers} warm, ${poolStats.availableWorkers} available, ${poolStats.poolUtilization.toFixed(1)}% utilization`)
      }
    }, 30000) // Check every 30 seconds
  }

  /**
   * Restart the process pool
   */
  async restart(): Promise<boolean> {
    console.log('[PersistentWhisperEngine] Restarting process pool...')

    try {
      await this.shutdown()
      this.lastError = undefined

      return await this.initialize()
    } catch (error) {
      console.error('[PersistentWhisperEngine] Restart failed:', error)
      this.lastError = `Restart failed: ${error.message}`
      return false
    }
  }

  /**
   * Shutdown the process pool
   */
  async shutdown(): Promise<void> {
    console.log('[PersistentWhisperEngine] Shutting down process pool...')

    this.isReady = false
    this.isInitialized = false

    // Clear activity monitoring
    if (this.activityMonitorInterval) {
      clearInterval(this.activityMonitorInterval)
      this.activityMonitorInterval = null
    }

    // Shutdown process pool
    if (this.processPool) {
      await this.processPool.shutdown()
      this.processPool = null
    }

    this.emit('shutdown')
    console.log('[PersistentWhisperEngine] Process pool shutdown completed')
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get process pool queue status
   */
  getQueueStatus() {
    if (!this.processPool) {
      return { queueLength: 0, queuedRequests: [] }
    }
    return this.processPool.getQueueStatus()
  }

  /**
   * Get detailed worker statuses
   */
  getWorkerStatuses() {
    if (!this.processPool) {
      return []
    }
    return this.processPool.getWorkerStatuses()
  }

  /**
   * Clear the process pool queue (if any)
   */
  clearQueue(): void {
    // Note: ProcessPool handles its own queue management
    // This method is kept for API compatibility
    console.log('[PersistentWhisperEngine] Queue clearing handled by ProcessPool')
  }
}

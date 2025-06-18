/**
 * WhisperProcessPool.ts
 * 
 * True process pooling implementation for whisper-cli to achieve concurrent processing
 * and reduced queue wait times. While individual processes still need to load models,
 * this approach provides significant performance improvements through parallelization.
 * 
 * Architecture:
 * - ProcessWorker: Manages individual whisper-cli process lifecycle
 * - ProcessPool: Coordinates multiple workers for concurrent processing
 * - Intelligent request routing and worker health monitoring
 */

import { EventEmitter } from 'events'
import { spawn, ChildProcess } from 'child_process'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { v4 as uuidv4 } from 'uuid'

export type WorkerState = 'cold' | 'warming' | 'warm' | 'processing' | 'completed' | 'failed' | 'terminated'

export interface ProcessWorkerOptions {
  workerId: string
  whisperCliPath: string
  modelPath: string
  whisperCppDir: string
  language: string
  requestTimeout: number
}

export interface WorkerRequest {
  id: string
  audioFilePath: string
  resolve: (result: any) => void
  reject: (error: Error) => void
  timestamp: number
}

export interface WorkerStats {
  requestsProcessed: number
  totalProcessingTime: number
  averageLatency: number
  lastActivity: number
  failureCount: number
}

/**
 * ProcessWorker manages a single whisper-cli process lifecycle
 */
export class ProcessWorker extends EventEmitter {
  private options: ProcessWorkerOptions
  private state: WorkerState = 'cold'
  private currentRequest: WorkerRequest | null = null
  private currentProcess: ChildProcess | null = null
  private stats: WorkerStats
  private lastError: string | undefined
  private isWarm = false

  constructor(options: ProcessWorkerOptions) {
    super()
    this.options = options
    this.stats = {
      requestsProcessed: 0,
      totalProcessingTime: 0,
      averageLatency: 0,
      lastActivity: Date.now(),
      failureCount: 0
    }

    console.log(`[ProcessWorker:${this.options.workerId}] Initialized (cold)`)
  }

  /**
   * Check if worker is available for new requests
   */
  isAvailable(): boolean {
    return this.isWarm && (this.state === 'warm' || this.state === 'completed') && this.currentRequest === null
  }

  /**
   * Check if worker is warm (model loaded)
   */
  isWorkerWarm(): boolean {
    return this.isWarm
  }

  /**
   * Warm up the worker by processing dummy audio to load the model
   */
  async warmUp(): Promise<boolean> {
    if (this.isWarm || this.state === 'warming') {
      console.log(`[ProcessWorker:${this.options.workerId}] Already warm or warming`)
      return this.isWarm
    }

    try {
      console.log(`[ProcessWorker:${this.options.workerId}] Starting warm-up...`)
      this.state = 'warming'
      const startTime = Date.now()

      // Create dummy audio file for warm-up
      const dummyAudioPath = await this.createDummyAudioFile()

      // Process dummy audio to load model with extended timeout for warm-up
      // Warm-up needs more time: ~800-900ms model loading + file I/O + minimal inference
      const warmUpTimeout = 2500 // 2.5 seconds for warm-up (vs 2s for regular processing)
      const result = await this.executeWhisperCli(dummyAudioPath, warmUpTimeout)

      // Small delay before cleanup to ensure whisper-cli has fully released the file handle
      await new Promise(resolve => setTimeout(resolve, 100))

      // Cleanup dummy file
      await this.cleanupFile(dummyAudioPath)

      const warmUpTime = Date.now() - startTime

      if (result !== null) {
        this.isWarm = true
        this.state = 'warm'
        console.log(`[ProcessWorker:${this.options.workerId}] Warm-up completed successfully in ${warmUpTime}ms`)
        this.emit('warmedUp', this.options.workerId)
        return true
      } else {
        console.warn(`[ProcessWorker:${this.options.workerId}] Warm-up failed - no result`)
        this.state = 'failed'
        this.lastError = 'Warm-up failed'
        return false
      }
    } catch (error) {
      console.error(`[ProcessWorker:${this.options.workerId}] Warm-up error:`, error)
      this.state = 'failed'
      this.lastError = `Warm-up error: ${error instanceof Error ? error.message : String(error)}`
      return false
    }
  }

  /**
   * Create a dummy audio file for warm-up (1 second of silence)
   */
  private async createDummyAudioFile(): Promise<string> {
    const tempDir = path.join(os.tmpdir(), 'closezly-worker-warmup')

    // Ensure temp directory exists
    try {
      await fs.mkdir(tempDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }

    const fileName = `warmup_${this.options.workerId}_${Date.now()}.wav`
    const filePath = path.join(tempDir, fileName)

    // Create 1 second of silence (minimum for whisper)
    const sampleRate = 16000
    const duration = 1.0 // 1 second
    const numSamples = Math.floor(sampleRate * duration)
    const audioData = Buffer.alloc(numSamples * 2, 0) // 16-bit samples = 2 bytes each

    // Create proper WAV file
    const wavBuffer = this.createWavBuffer(audioData, sampleRate)
    await fs.writeFile(filePath, wavBuffer)

    console.log(`[ProcessWorker:${this.options.workerId}] Created dummy audio file: ${filePath}`)
    return filePath
  }

  /**
   * Create a proper WAV file buffer with header
   */
  private createWavBuffer(audioData: Buffer, sampleRate: number): Buffer {
    const numChannels = 1     // Mono
    const bitsPerSample = 16  // 16-bit samples
    const byteRate = sampleRate * numChannels * bitsPerSample / 8
    const blockAlign = numChannels * bitsPerSample / 8

    // WAV header (44 bytes)
    const header = Buffer.alloc(44)

    // RIFF chunk descriptor
    header.write('RIFF', 0)
    header.writeUInt32LE(36 + audioData.length, 4)
    header.write('WAVE', 8)

    // fmt sub-chunk
    header.write('fmt ', 12)
    header.writeUInt32LE(16, 16) // Sub-chunk size
    header.writeUInt16LE(1, 20)  // Audio format (PCM)
    header.writeUInt16LE(numChannels, 22)
    header.writeUInt32LE(sampleRate, 24)
    header.writeUInt32LE(byteRate, 28)
    header.writeUInt16LE(blockAlign, 32)
    header.writeUInt16LE(bitsPerSample, 34)

    // data sub-chunk
    header.write('data', 36)
    header.writeUInt32LE(audioData.length, 40)

    return Buffer.concat([header, audioData])
  }

  /**
   * Clean up temporary files
   */
  private async cleanupFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath)
      console.log(`[ProcessWorker:${this.options.workerId}] Cleaned up file: ${filePath}`)
    } catch (error) {
      console.warn(`[ProcessWorker:${this.options.workerId}] Failed to cleanup file ${filePath}:`, error)
    }
  }

  /**
   * Assign a request to this worker
   */
  async processRequest(request: WorkerRequest): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error(`Worker ${this.options.workerId} is not available`)
    }

    if (!this.isWarm) {
      throw new Error(`Worker ${this.options.workerId} is not warmed up`)
    }

    this.currentRequest = request
    this.state = 'processing'
    this.stats.lastActivity = Date.now()

    console.log(`[ProcessWorker:${this.options.workerId}] Processing request ${request.id} (warm worker)`)

    try {
      const result = await this.executeWhisperCli(request.audioFilePath)
      const processingTime = Date.now() - request.timestamp

      this.updateStats(processingTime, true)

      if (result) {
        result.processingTime = processingTime
        console.log(`[ProcessWorker:${this.options.workerId}] Request ${request.id} completed in ${processingTime}ms`)
        request.resolve(result)
      } else {
        console.warn(`[ProcessWorker:${this.options.workerId}] Request ${request.id} failed - no result`)
        request.resolve(null)
      }

      this.state = 'completed'
    } catch (error) {
      console.error(`[ProcessWorker:${this.options.workerId}] Request ${request.id} failed:`, error)
      this.updateStats(Date.now() - request.timestamp, false)
      this.lastError = error instanceof Error ? error.message : String(error)
      this.state = 'failed'
      request.reject(error instanceof Error ? error : new Error(String(error)))
    } finally {
      this.currentRequest = null
      this.state = 'warm' // Return to warm state after processing
      this.emit('requestCompleted', this.options.workerId)
    }
  }

  /**
   * Execute whisper-cli process for the request
   */
  private async executeWhisperCli(audioFilePath: string, customTimeout?: number): Promise<any> {
    const args = [
      '-l', this.options.language,
      '-m', this.options.modelPath,
      '-f', audioFilePath,
      '--no-timestamps',
      '--threads', '1', // Single thread for minimal overhead
      '--processors', '1',
      '--beam-size', '1', // Greedy decoding for speed
      '--best-of', '1',
      '--temperature', '0.0',
      '--no-fallback'
    ]

    console.log(`[ProcessWorker:${this.options.workerId}] Executing: ${this.options.whisperCliPath} ${args.join(' ')}`)

    return new Promise((resolve) => {
      const startTime = Date.now()
      let isResolved = false
      let timeoutHandle: NodeJS.Timeout | null = null

      this.currentProcess = spawn(this.options.whisperCliPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: this.options.whisperCppDir
      })

      let stdout = ''
      let stderr = ''

      // Helper function to resolve once and cleanup
      const resolveOnce = (result: any) => {
        if (isResolved) return
        isResolved = true

        if (timeoutHandle) {
          clearTimeout(timeoutHandle)
          timeoutHandle = null
        }

        this.currentProcess = null
        resolve(result)
      }

      if (this.currentProcess.stdout) {
        this.currentProcess.stdout.on('data', (data) => {
          stdout += data.toString()
        })
      }

      if (this.currentProcess.stderr) {
        this.currentProcess.stderr.on('data', (data) => {
          stderr += data.toString()
        })
      }

      this.currentProcess.on('close', (code) => {
        const processingTime = Date.now() - startTime

        if (code === 0) {
          const text = this.parseWhisperOutput(stdout)
          if (text && text.trim()) {
            resolveOnce({
              success: true,
              text: text.trim(),
              segments: [],
              processingTime
            })
          } else {
            this.lastError = 'No text extracted from audio'
            resolveOnce(null)
          }
        } else {
          console.error(`[ProcessWorker:${this.options.workerId}] whisper-cli failed with exit code ${code}`)
          console.error(`[ProcessWorker:${this.options.workerId}] stderr: ${stderr}`)
          this.lastError = `CLI process failed with exit code ${code}`
          resolveOnce(null)
        }
      })

      this.currentProcess.on('error', (error) => {
        console.error(`[ProcessWorker:${this.options.workerId}] whisper-cli spawn error:`, error)
        this.lastError = `CLI spawn error: ${error.message}`
        resolveOnce(null)
      })

      // Timeout handling - use custom timeout if provided (for warm-up), otherwise use default
      const timeoutMs = customTimeout || this.options.requestTimeout
      timeoutHandle = setTimeout(() => {
        if (!isResolved && this.currentProcess) {
          this.currentProcess.kill('SIGTERM')
          const timeoutTime = Date.now() - startTime
          console.warn(`[ProcessWorker:${this.options.workerId}] whisper-cli timeout after ${timeoutTime}ms (timeout: ${timeoutMs}ms)`)
          this.lastError = `CLI process timeout after ${timeoutTime}ms`
          resolveOnce(null)
        }
      }, timeoutMs)
    })
  }

  /**
   * Parse whisper-cli output to extract clean text
   */
  private parseWhisperOutput(output: string): string {
    try {
      if (!output || !output.trim()) {
        return ''
      }

      const lines = output.split('\n')
      const transcriptionLines = lines.filter(line => {
        const trimmed = line.trim()

        if (!trimmed) return false

        // Skip system info lines
        if (trimmed.includes('whisper_model_load:') ||
            trimmed.includes('system_info:') ||
            trimmed.includes('whisper_print_timings:') ||
            trimmed.includes('load time =') ||
            trimmed.includes('mel time =') ||
            trimmed.includes('sample time =') ||
            trimmed.includes('encode time =') ||
            trimmed.includes('decode time =') ||
            trimmed.includes('total time =') ||
            trimmed.includes('operator():') ||
            trimmed.includes('processing') ||
            trimmed.includes('threads') ||
            trimmed.includes('processors')) {
          return false
        }

        // Skip timestamp lines
        if (trimmed.match(/^\[\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}\]/)) {
          return false
        }

        return true
      })

      return transcriptionLines.join(' ').trim()
    } catch (error) {
      console.error(`[ProcessWorker:${this.options.workerId}] Error parsing whisper output:`, error)
      return ''
    }
  }

  /**
   * Update worker statistics
   */
  private updateStats(processingTime: number, success: boolean): void {
    if (success) {
      this.stats.requestsProcessed++
      this.stats.totalProcessingTime += processingTime
      this.stats.averageLatency = this.stats.totalProcessingTime / this.stats.requestsProcessed
      this.lastError = undefined
    } else {
      this.stats.failureCount++
    }
    this.stats.lastActivity = Date.now()
  }

  /**
   * Get worker status and statistics
   */
  getStatus() {
    return {
      workerId: this.options.workerId,
      state: this.state,
      isAvailable: this.isAvailable(),
      currentRequest: this.currentRequest?.id || null,
      stats: { ...this.stats },
      lastError: this.lastError
    }
  }

  /**
   * Terminate the worker and cleanup
   */
  terminate(): void {
    this.state = 'terminated'

    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM')
      this.currentProcess = null
    }

    if (this.currentRequest) {
      this.currentRequest.reject(new Error('Worker terminated'))
      this.currentRequest = null
    }

    console.log(`[ProcessWorker:${this.options.workerId}] Terminated`)
  }
}

export interface ProcessPoolOptions {
  poolSize?: number
  whisperCliPath: string
  modelPath: string
  whisperCppDir: string
  language: string
  requestTimeout: number
}

export interface PoolStats {
  totalWorkers: number
  availableWorkers: number
  busyWorkers: number
  warmWorkers: number
  coldWorkers: number
  totalRequestsProcessed: number
  averageLatency: number
  poolUtilization: number
  warmUpProgress: number // Percentage of workers warmed up
}

/**
 * ProcessPool manages multiple ProcessWorkers for concurrent whisper-cli processing
 */
export class ProcessPool extends EventEmitter {
  private options: ProcessPoolOptions
  private workers: Map<string, ProcessWorker> = new Map()
  private requestQueue: WorkerRequest[] = []
  private isInitialized = false
  private isWarmedUp = false
  private warmUpInProgress = false

  constructor(options: ProcessPoolOptions) {
    super()
    this.options = {
      poolSize: 3, // Default pool size
      ...options
    }

    console.log(`[ProcessPool] Initialized with pool size: ${this.options.poolSize}`)
  }

  /**
   * Initialize the process pool with workers and warm them up
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[ProcessPool] Already initialized')
      return
    }

    console.log(`[ProcessPool] Creating ${this.options.poolSize} workers...`)

    for (let i = 0; i < this.options.poolSize!; i++) {
      const workerId = `worker-${i + 1}`
      const worker = new ProcessWorker({
        workerId,
        whisperCliPath: this.options.whisperCliPath,
        modelPath: this.options.modelPath,
        whisperCppDir: this.options.whisperCppDir,
        language: this.options.language,
        requestTimeout: this.options.requestTimeout
      })

      // Listen for worker events
      worker.on('requestCompleted', () => {
        this.processQueue()
      })

      worker.on('warmedUp', (workerId) => {
        console.log(`[ProcessPool] Worker ${workerId} warmed up`)
        this.checkWarmUpCompletion()
      })

      this.workers.set(workerId, worker)
    }

    this.isInitialized = true
    console.log(`[ProcessPool] Created ${this.workers.size} workers`)

    // Start warm-up process
    await this.warmUpAllWorkers()

    this.emit('initialized')
  }

  /**
   * Warm up all workers in parallel
   */
  async warmUpAllWorkers(): Promise<void> {
    if (this.warmUpInProgress || this.isWarmedUp) {
      console.log('[ProcessPool] Warm-up already in progress or completed')
      return
    }

    this.warmUpInProgress = true
    console.log(`[ProcessPool] Starting warm-up for ${this.workers.size} workers...`)
    const startTime = Date.now()

    // Warm up all workers in parallel
    const warmUpPromises = Array.from(this.workers.values()).map(worker =>
      worker.warmUp().catch(error => {
        console.error(`[ProcessPool] Worker ${worker.getStatus().workerId} warm-up failed:`, error)
        return false
      })
    )

    const results = await Promise.all(warmUpPromises)
    const successCount = results.filter(success => success).length
    const totalTime = Date.now() - startTime

    console.log(`[ProcessPool] Warm-up completed: ${successCount}/${this.workers.size} workers warmed up in ${totalTime}ms`)

    this.warmUpInProgress = false
    this.isWarmedUp = successCount > 0 // Consider warmed up if at least one worker is warm

    if (this.isWarmedUp) {
      console.log(`[ProcessPool] Pool is ready with ${successCount} warm workers`)
      this.emit('warmedUp', { successCount, totalWorkers: this.workers.size, totalTime })
    } else {
      console.error('[ProcessPool] All workers failed to warm up')
      this.emit('warmUpFailed')
    }
  }

  /**
   * Check if all workers are warmed up
   */
  private checkWarmUpCompletion(): void {
    const warmWorkers = Array.from(this.workers.values()).filter(w => w.isWorkerWarm()).length
    const totalWorkers = this.workers.size

    if (warmWorkers === totalWorkers && !this.isWarmedUp) {
      this.isWarmedUp = true
      console.log(`[ProcessPool] All ${totalWorkers} workers are now warm`)
      this.emit('allWorkersWarm')
    }
  }

  /**
   * Submit a request to the process pool
   */
  async processRequest(audioFilePath: string): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('ProcessPool not initialized')
    }

    if (!this.isWarmedUp) {
      throw new Error('ProcessPool not warmed up - no workers ready')
    }

    return new Promise((resolve, reject) => {
      const request: WorkerRequest = {
        id: uuidv4(),
        audioFilePath,
        resolve,
        reject,
        timestamp: Date.now()
      }

      this.requestQueue.push(request)
      console.log(`[ProcessPool] Queued request ${request.id}, queue length: ${this.requestQueue.length}`)

      // Try to process immediately
      this.processQueue()
    })
  }

  /**
   * Process the request queue by assigning requests to available warm workers
   */
  private processQueue(): void {
    if (this.requestQueue.length === 0) {
      return
    }

    // Find available warm workers only
    const availableWorkers = Array.from(this.workers.values()).filter(worker =>
      worker.isAvailable() && worker.isWorkerWarm()
    )

    if (availableWorkers.length === 0) {
      const warmWorkers = Array.from(this.workers.values()).filter(w => w.isWorkerWarm()).length
      console.log(`[ProcessPool] No available warm workers (${warmWorkers} warm, ${this.requestQueue.length} requests queued)`)
      return
    }

    // Assign requests to available warm workers
    const requestsToProcess = Math.min(this.requestQueue.length, availableWorkers.length)

    for (let i = 0; i < requestsToProcess; i++) {
      const request = this.requestQueue.shift()!
      const worker = availableWorkers[i]

      console.log(`[ProcessPool] Assigning request ${request.id} to warm worker ${worker.getStatus().workerId}`)

      // Process request asynchronously
      worker.processRequest(request).catch(error => {
        console.error(`[ProcessPool] Worker processing failed:`, error)
      })
    }

    console.log(`[ProcessPool] Assigned ${requestsToProcess} requests to warm workers, ${this.requestQueue.length} remaining in queue`)
  }

  /**
   * Get pool statistics and status
   */
  getStatus(): PoolStats {
    const workers = Array.from(this.workers.values())
    const warmWorkers = workers.filter(w => w.isWorkerWarm()).length
    const coldWorkers = workers.length - warmWorkers
    const availableWorkers = workers.filter(w => w.isAvailable()).length
    const busyWorkers = workers.filter(w => w.getStatus().state === 'processing').length

    const totalRequests = workers.reduce((sum, w) => sum + w.getStatus().stats.requestsProcessed, 0)
    const totalTime = workers.reduce((sum, w) => sum + w.getStatus().stats.totalProcessingTime, 0)
    const averageLatency = totalRequests > 0 ? totalTime / totalRequests : 0

    return {
      totalWorkers: workers.length,
      availableWorkers,
      busyWorkers,
      warmWorkers,
      coldWorkers,
      totalRequestsProcessed: totalRequests,
      averageLatency,
      poolUtilization: workers.length > 0 ? (busyWorkers / workers.length) * 100 : 0,
      warmUpProgress: workers.length > 0 ? (warmWorkers / workers.length) * 100 : 0
    }
  }

  /**
   * Get detailed status of all workers
   */
  getWorkerStatuses() {
    return Array.from(this.workers.values()).map(worker => worker.getStatus())
  }

  /**
   * Get current queue status
   */
  getQueueStatus() {
    return {
      queueLength: this.requestQueue.length,
      queuedRequests: this.requestQueue.map(r => ({ id: r.id, timestamp: r.timestamp }))
    }
  }

  /**
   * Shutdown the process pool and terminate all workers
   */
  async shutdown(): Promise<void> {
    console.log('[ProcessPool] Shutting down...')

    // Reject all queued requests
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()!
      request.reject(new Error('ProcessPool shutting down'))
    }

    // Terminate all workers
    for (const worker of this.workers.values()) {
      worker.terminate()
    }

    this.workers.clear()
    this.isInitialized = false

    console.log('[ProcessPool] Shutdown completed')
    this.emit('shutdown')
  }
}

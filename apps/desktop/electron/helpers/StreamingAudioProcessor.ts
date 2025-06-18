/**
 * StreamingAudioProcessor.ts
 *
 * Simplified, high-performance audio processor for real-time transcription.
 * Implements direct MediaRecorder → nodejs-whisper pipeline without complex
 * intermediate layers, reducing latency by 50-70%.
 *
 * Key Features:
 * - Direct audio capture using MediaRecorder API
 * - Real-time audio chunk processing
 * - Local nodejs-whisper integration (no Python bridge)
 * - Event-based architecture for UI updates
 * - Efficient audio buffer management
 */

import { EventEmitter } from 'events'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { v4 as uuidv4 } from 'uuid'

// Import types for compatibility
import { TranscriptionResult, TranscriptionSegment } from './LocalWhisperService'
import { PersistentWhisperEngine, PersistentWhisperOptions } from './PersistentWhisperEngine'

// NOTE: nodejs-whisper removed - using PersistentWhisperEngine for real-time streaming
// This eliminates model reload overhead and provides persistent context for fast transcription

interface StreamingOptions {
  modelSize?: 'tiny.en' | 'base.en' | 'small.en'
  language?: string
  enableRealTimeAnalysis?: boolean
  chunkDuration?: number // milliseconds
  bufferSize?: number // number of chunks to keep in buffer
  // Phase 2.1: Streaming buffer options
  enableContinuousStreaming?: boolean
  windowSizeMs?: number // processing window size in milliseconds
  overlapMs?: number // overlap between windows in milliseconds
  confidenceThreshold?: number // minimum confidence for results
  maxBufferSizeBytes?: number // maximum circular buffer size
}

interface AudioChunk {
  data: Buffer
  timestamp: number
  duration: number
}

interface StreamingWindow {
  id: string
  startTime: number
  endTime: number
  audioData: Buffer
  isProcessing: boolean
  result?: TranscriptionResult
}

interface CircularBufferOptions {
  maxSizeBytes: number
  windowSizeMs: number
  overlapMs: number
}

/**
 * Circular audio buffer for continuous streaming
 * Maintains a rolling window of audio data with overlapping processing windows
 */
class CircularAudioBuffer {
  private buffer: Buffer
  private writePosition: number = 0
  private totalBytesWritten: number = 0
  private readonly maxSize: number
  private readonly windowSize: number // in bytes
  private readonly overlapSize: number // in bytes
  private readonly sampleRate: number = 16000
  private readonly bytesPerSample: number = 2 // 16-bit audio

  constructor(options: CircularBufferOptions) {
    this.maxSize = options.maxSizeBytes
    this.buffer = Buffer.alloc(this.maxSize)

    // Convert milliseconds to bytes (16kHz, 16-bit, mono)
    const bytesPerMs = (this.sampleRate * this.bytesPerSample) / 1000
    this.windowSize = Math.floor(options.windowSizeMs * bytesPerMs)
    this.overlapSize = Math.floor(options.overlapMs * bytesPerMs)
  }

  /**
   * Write audio data to the circular buffer
   */
  write(data: Buffer): void {
    const dataSize = data.length

    if (dataSize > this.maxSize) {
      // If data is larger than buffer, only keep the last part
      const offset = dataSize - this.maxSize
      data.copy(this.buffer, 0, offset)
      this.writePosition = this.maxSize
    } else if (this.writePosition + dataSize <= this.maxSize) {
      // Normal case: data fits without wrapping
      data.copy(this.buffer, this.writePosition)
      this.writePosition += dataSize
    } else {
      // Wrap around case
      const firstPart = this.maxSize - this.writePosition
      const secondPart = dataSize - firstPart

      data.copy(this.buffer, this.writePosition, 0, firstPart)
      data.copy(this.buffer, 0, firstPart, dataSize)
      this.writePosition = secondPart
    }

    this.totalBytesWritten += dataSize
  }

  /**
   * Extract overlapping windows for processing - OPTIMIZED FOR LOW LATENCY
   */
  getProcessingWindows(): StreamingWindow[] {
    console.log(`[CircularBuffer] Checking windows: ${this.totalBytesWritten} bytes written, need ${this.windowSize} bytes for window`)
    if (this.totalBytesWritten < this.windowSize) {
      console.log(`[CircularBuffer] Not enough data yet: ${this.totalBytesWritten}/${this.windowSize} bytes`)
      return [] // Not enough data yet
    }

    const windows: StreamingWindow[] = []
    const currentTime = Date.now()
    const stepSize = this.windowSize - this.overlapSize

    // Calculate how many complete windows we can extract
    const availableBytes = Math.min(this.totalBytesWritten, this.maxSize)

    // OPTIMIZATION: Only extract the most recent window for faster processing
    // This reduces processing overhead and improves latency
    const numWindows = 1 // Process only the latest window
    const windowStart = Math.max(0, availableBytes - this.windowSize)

    console.log(`[CircularBuffer] Extracting latest window from ${availableBytes} bytes (optimized for latency)`)

    const windowData = this.extractWindow(windowStart, this.windowSize)

    if (windowData.length === this.windowSize) {
      const windowId = `window_${currentTime}_latest`
      console.log(`[CircularBuffer] Created optimized window ${windowId} with ${windowData.length} bytes`)
      windows.push({
        id: windowId,
        startTime: currentTime - (this.windowSize * 1000) / (this.sampleRate * this.bytesPerSample),
        endTime: currentTime,
        audioData: windowData,
        isProcessing: false
      })
    } else {
      console.log(`[CircularBuffer] Window has wrong size: ${windowData.length}/${this.windowSize} bytes`)
    }

    return windows
  }

  /**
   * Extract a window of audio data from the circular buffer
   */
  private extractWindow(start: number, size: number): Buffer {
    const result = Buffer.alloc(size)
    const bufferSize = Math.min(this.totalBytesWritten, this.maxSize)

    if (start + size <= bufferSize) {
      // Simple case: no wrapping needed
      const sourceStart = (this.writePosition - bufferSize + start) % this.maxSize
      if (sourceStart + size <= this.maxSize) {
        this.buffer.copy(result, 0, sourceStart, sourceStart + size)
      } else {
        // Handle wrap around
        const firstPart = this.maxSize - sourceStart
        this.buffer.copy(result, 0, sourceStart, this.maxSize)
        this.buffer.copy(result, firstPart, 0, size - firstPart)
      }
    }

    return result
  }

  /**
   * Get current buffer status
   */
  getStatus() {
    return {
      totalBytesWritten: this.totalBytesWritten,
      bufferUtilization: Math.min(this.totalBytesWritten / this.maxSize, 1.0),
      canProcess: this.totalBytesWritten >= this.windowSize
    }
  }
}

interface ProcessingState {
  isRecording: boolean
  isProcessing: boolean
  currentChunks: AudioChunk[]
  totalDuration: number
  lastProcessedTime: number
}

/**
 * Model cache for persistent whisper-cli process
 */
interface ModelCache {
  isLoaded: boolean
  modelPath: string
  whisperCliPath: string
  whisperCppDir: string
  lastUsed: number
}

/**
 * StreamingAudioProcessor - Direct audio processing for real-time transcription
 */
export default class StreamingAudioProcessor extends EventEmitter {
  private options: StreamingOptions
  private state: ProcessingState
  private tempDir: string
  private sessionId: string
  private audioBuffer: AudioChunk[]
  private processingTimeout: NodeJS.Timeout | null = null

  // Phase 2.1: Streaming buffer components
  private circularBuffer: CircularAudioBuffer | null = null
  private activeWindows: Map<string, StreamingWindow> = new Map()
  private lastProcessedTime: number = 0
  private streamingResults: Map<string, TranscriptionResult> = new Map()
  private mergedTranscription: string = ''

  // Model persistence for faster transcription
  private static modelCache: ModelCache | null = null
  private static isInitializingModel: boolean = false

  // VAD integration for speech-triggered transcription
  private vadEnabled: boolean = true
  private speechDetected: boolean = false
  private speechStartTime: number = 0
  private speechEndTime: number = 0
  private vadSilenceThreshold: number = 750 // 0.75 second of silence before stopping transcription (optimized for persistent engine)

  // Persistent Whisper Engine for real-time transcription
  private persistentEngine: PersistentWhisperEngine | null = null
  private engineInitialized: boolean = false
  private fallbackToLegacy: boolean = false
  private optimizationInterval: NodeJS.Timeout | null = null

  constructor(options: StreamingOptions = {}) {
    super()

    this.options = {
      modelSize: 'tiny.en', // PHASE 1.3: Switch to tiny.en (39M params) for 4x faster real-time processing
      language: 'en',
      enableRealTimeAnalysis: true,
      chunkDuration: 1000, // 1 second chunks
      bufferSize: 10, // Keep last 10 chunks
      // Phase 2.1: Streaming buffer defaults - OPTIMIZED FOR PERSISTENT ENGINE
      enableContinuousStreaming: true, // Enable by default for Phase 2.2
      windowSizeMs: 750, // 0.75-second processing windows (reduced from 1s for faster response with persistent engine)
      overlapMs: 150, // 0.15-second overlap between windows (reduced for speed)
      confidenceThreshold: 0.05, // Very low confidence threshold for real-time responsiveness
      maxBufferSizeBytes: 256 * 1024, // 256KB circular buffer (smaller for faster processing with persistent engine)
      ...options
    }

    this.state = {
      isRecording: false,
      isProcessing: false,
      currentChunks: [],
      totalDuration: 0,
      lastProcessedTime: 0
    }

    this.audioBuffer = []
    this.tempDir = path.join(os.tmpdir(), 'closezly-streaming-audio')
    this.sessionId = uuidv4()

    // Ensure temp directory exists
    this.ensureTempDir()

    // Initialize model cache if not already done
    this.initializeModelCache()

    // Initialize PersistentWhisperEngine for real-time transcription
    this.initializePersistentEngine()
  }

  /**
   * Initialize model cache for faster transcription
   */
  private async initializeModelCache(): Promise<void> {
    if (StreamingAudioProcessor.modelCache?.isLoaded || StreamingAudioProcessor.isInitializingModel) {
      return
    }

    try {
      StreamingAudioProcessor.isInitializingModel = true
      console.log('[StreamingProcessor] Initializing model cache...')

      const path = require('path')
      const fs = require('fs')

      // Calculate paths once and cache them
      const projectRoot = path.resolve(process.cwd(), '../..')
      const whisperCppDir = path.join(projectRoot, 'node_modules', 'nodejs-whisper', 'cpp', 'whisper.cpp')
      const whisperCliPath = path.join(whisperCppDir, 'build', 'bin', 'whisper-cli')
      // PHASE 1.3: Use tiny.en model for 4x faster real-time processing (39M vs 74M params)
      const modelPath = path.join(whisperCppDir, 'models', `ggml-${this.options.modelSize}.bin`)

      // Validate paths
      if (!fs.existsSync(whisperCliPath)) {
        throw new Error(`whisper-cli not found at: ${whisperCliPath}`)
      }
      if (!fs.existsSync(modelPath)) {
        throw new Error(`Model not found at: ${modelPath}`)
      }

      StreamingAudioProcessor.modelCache = {
        isLoaded: true,
        modelPath,
        whisperCliPath,
        whisperCppDir,
        lastUsed: Date.now()
      }

      console.log('[StreamingProcessor] Model cache initialized successfully')
    } catch (error) {
      console.error('[StreamingProcessor] Failed to initialize model cache:', error)
      StreamingAudioProcessor.modelCache = null
    } finally {
      StreamingAudioProcessor.isInitializingModel = false
    }
  }

  /**
   * Initialize PersistentWhisperEngine for real-time transcription
   */
  private async initializePersistentEngine(): Promise<void> {
    if (this.engineInitialized || this.persistentEngine) {
      return
    }

    try {
      console.log('[StreamingProcessor] Initializing PersistentWhisperEngine...')

      this.persistentEngine = new PersistentWhisperEngine({
        modelSize: this.options.modelSize as 'tiny.en' | 'base.en' | 'small.en',
        language: this.options.language || 'en',
        maxConcurrentRequests: 8, // Increased for streaming workload
        processTimeout: 30000, // 30 seconds for pool monitoring
        restartThreshold: 5, // More tolerant for streaming
        requestTimeout: 1000, // Reduced timeout for hot workers (no model loading delay)
        poolSize: 6 // Optimal pool size for streaming: balance between performance and memory
      })

      // Set up event listeners
      this.persistentEngine.on('initialized', () => {
        console.log('[StreamingProcessor] PersistentWhisperEngine pool initialized successfully')
        // Note: Don't mark as ready yet - wait for warm-up
      })

      this.persistentEngine.on('ready', () => {
        console.log('[StreamingProcessor] PersistentWhisperEngine pool warmed up and ready')
        this.engineInitialized = true
        this.fallbackToLegacy = false

        // Log pool status
        const status = this.persistentEngine!.getStatus()
        console.log(`[StreamingProcessor] Pool ready: ${status.availableWorkers}/${status.workerCount} workers available, ${status.poolUtilization?.toFixed(1)}% utilization`)

        // Optimize buffer settings for the hot worker pool
        setTimeout(() => this.optimizeForHotWorkerPool(), 1000)
        // Start periodic pool monitoring
        this.startPoolMonitoring()
      })

      this.persistentEngine.on('error', (error) => {
        console.error('[StreamingProcessor] PersistentWhisperEngine error:', error)
        this.fallbackToLegacy = true
        // Revert to conservative settings
        this.optimizeForPersistentEngine()
      })

      this.persistentEngine.on('warning', (message) => {
        console.warn('[StreamingProcessor] PersistentWhisperEngine warning:', message)
      })

      // Initialize the engine
      const success = await this.persistentEngine.initialize()
      if (!success) {
        console.warn('[StreamingProcessor] Failed to initialize PersistentWhisperEngine, falling back to legacy approach')
        this.fallbackToLegacy = true
        this.persistentEngine = null
      }

    } catch (error) {
      console.error('[StreamingProcessor] Error initializing PersistentWhisperEngine:', error)
      this.fallbackToLegacy = true
      this.persistentEngine = null
    }
  }

  /**
   * PHASE 1.3: Comprehensive model warm-up system
   * Pre-loads the model into memory to eliminate cold-start delays
   */
  public static async warmUpModel(modelSize: 'tiny.en' | 'base.en' | 'small.en' = 'tiny.en'): Promise<boolean> {
    try {
      console.log(`[StreamingProcessor] Starting model warm-up for ${modelSize}...`)
      const startTime = Date.now()

      // Create a temporary instance to initialize the model cache
      const tempProcessor = new StreamingAudioProcessor({ modelSize })
      await tempProcessor.initializeModelCache()

      if (!StreamingAudioProcessor.modelCache?.isLoaded) {
        console.error('[StreamingProcessor] Model cache initialization failed during warm-up')
        return false
      }

      // Create a minimal test audio file for actual model loading
      const testAudioPath = await tempProcessor.createTestAudioFile()

      // Run a quick transcription to actually load the model into memory
      const result = await tempProcessor.transcribeAudio(testAudioPath)

      // Cleanup test file
      await tempProcessor.deleteTempFile(testAudioPath)

      const warmUpTime = Date.now() - startTime
      console.log(`[StreamingProcessor] Model warm-up completed in ${warmUpTime}ms`)
      console.log(`[StreamingProcessor] Warm-up result: ${result?.text || 'No result (expected for silence)'}`)

      return true
    } catch (error) {
      console.error('[StreamingProcessor] Model warm-up failed:', error)
      return false
    }
  }

  /**
   * Create a minimal test audio file for model warm-up
   */
  private async createTestAudioFile(): Promise<string> {
    const fileName = `warmup_test_${Date.now()}.wav`
    const filePath = path.join(this.tempDir, fileName)

    // Create 1 second of silence (minimum for whisper)
    const sampleRate = 16000
    const duration = 1.0 // 1 second
    const numSamples = Math.floor(sampleRate * duration)
    const audioData = Buffer.alloc(numSamples * 2, 0) // 16-bit samples = 2 bytes each

    // Create proper WAV file
    const wavBuffer = this.createWavBuffer(audioData)
    await fs.writeFile(filePath, wavBuffer)

    console.log(`[StreamingProcessor] Created test audio file: ${filePath}`)
    return filePath
  }

  /**
   * Start real-time audio processing
   */
  public async startProcessing(): Promise<boolean> {
    try {
      console.log('[StreamingProcessor] Starting real-time audio processing...')
      
      // NOTE: No longer loading nodejs-whisper module - using unified C++ whisper-cli approach
      
      // Reset state
      this.state = {
        isRecording: true,
        isProcessing: false,
        currentChunks: [],
        totalDuration: 0,
        lastProcessedTime: Date.now()
      }
      
      this.audioBuffer = []
      this.sessionId = uuidv4()

      // Phase 2.1: Initialize circular buffer for continuous streaming
      if (this.options.enableContinuousStreaming) {
        // The CircularAudioBuffer constructor converts milliseconds to bytes internally
        // So we pass the original millisecond values
        console.log(`[StreamingProcessor] Initializing circular buffer: windowSize=${this.options.windowSizeMs}ms, overlap=${this.options.overlapMs}ms`)

        this.circularBuffer = new CircularAudioBuffer({
          maxSizeBytes: this.options.maxBufferSizeBytes || 1024 * 1024,
          windowSizeMs: this.options.windowSizeMs!, // Use the configured value (2000ms)
          overlapMs: this.options.overlapMs!        // Use the configured value (500ms)
        })
        this.activeWindows.clear()
        this.streamingResults.clear()
        this.mergedTranscription = ''
        console.log('[StreamingProcessor] Continuous streaming mode enabled')
      }

      this.emit('processing-started')
      console.log('[StreamingProcessor] Real-time processing started successfully')
      return true
    } catch (error) {
      console.error('[StreamingProcessor] Failed to start processing:', error)
      this.emit('error', error)
      return false
    }
  }

  /**
   * Stop audio processing
   */
  public async stopProcessing(): Promise<TranscriptionResult | null> {
    try {
      console.log('[StreamingProcessor] Stopping audio processing...')
      
      this.state.isRecording = false
      
      // Clear any pending processing
      if (this.processingTimeout) {
        clearTimeout(this.processingTimeout)
        this.processingTimeout = null
      }

      // Process any remaining audio chunks
      const finalResult = await this.processFinalAudio()
      
      // Cleanup
      await this.cleanup()
      
      this.emit('processing-stopped', finalResult)
      console.log('[StreamingProcessor] Processing stopped successfully')
      
      return finalResult
    } catch (error) {
      console.error('[StreamingProcessor] Error stopping processing:', error)
      this.emit('error', error)
      return null
    }
  }

  /**
   * Process incoming audio chunk with VAD-based speech detection
   */
  public async processAudioChunk(audioData: Buffer, vadResult?: { isVoice: boolean; energy: number; confidence: number }): Promise<void> {
    if (!this.state.isRecording) {
      return
    }

    try {
      const chunk: AudioChunk = {
        data: audioData,
        timestamp: Date.now(),
        duration: this.options.chunkDuration || 1000
      }

      // VAD-based speech detection for optimized processing
      if (vadResult && this.vadEnabled) {
        const currentTime = Date.now()

        if (vadResult.isVoice && !this.speechDetected) {
          // Speech started
          this.speechDetected = true
          this.speechStartTime = currentTime
          console.log(`[StreamingProcessor] Speech detected, starting transcription (energy: ${vadResult.energy.toFixed(3)}, confidence: ${vadResult.confidence.toFixed(3)})`)
        } else if (!vadResult.isVoice && this.speechDetected) {
          // Check if we should stop transcription after silence
          if (currentTime - this.speechStartTime > this.vadSilenceThreshold) {
            this.speechDetected = false
            this.speechEndTime = currentTime
            console.log(`[StreamingProcessor] Speech ended after ${currentTime - this.speechStartTime}ms`)
          }
        }
      }

      console.log(`[StreamingProcessor] Processing audio chunk: ${audioData.length} bytes, speech detected: ${this.speechDetected}, VAD enabled: ${this.vadEnabled}`)

      // Phase 2.1: Use circular buffer for continuous streaming
      if (this.options.enableContinuousStreaming && this.circularBuffer) {
        // Add to circular buffer
        this.circularBuffer.write(audioData)

        // Also keep track of chunks for final processing
        this.state.currentChunks.push(chunk)
        this.state.totalDuration += chunk.duration

        // Only process if speech is detected (or VAD is disabled)
        if (!this.vadEnabled || this.speechDetected) {
          await this.processContinuousStreaming()
        } else {
          console.log('[StreamingProcessor] Skipping processing - no speech detected')
        }

        // FALLBACK: Also use legacy buffer mode for interim results
        this.audioBuffer.push(chunk)
        if (this.audioBuffer.length > (this.options.bufferSize || 10)) {
          this.audioBuffer.shift()
        }

        // Schedule interim processing only if speech is detected (reduced threshold for persistent engine)
        if (!this.state.isProcessing && this.audioBuffer.length >= 2 && (!this.vadEnabled || this.speechDetected)) {
          console.log('[StreamingProcessor] Scheduling interim processing for real-time feedback')
          this.scheduleProcessing()
        }
      } else {
        // Legacy buffer mode
        this.audioBuffer.push(chunk)
        this.state.currentChunks.push(chunk)
        this.state.totalDuration += chunk.duration

        // Maintain buffer size
        if (this.audioBuffer.length > (this.options.bufferSize || 10)) {
          this.audioBuffer.shift()
        }

        // Schedule processing only if speech is detected (or VAD is disabled)
        if (!this.state.isProcessing && (!this.vadEnabled || this.speechDetected)) {
          this.scheduleProcessing()
        }
      }

      // Emit audio analysis data if enabled
      if (this.options.enableRealTimeAnalysis) {
        this.emitAudioAnalysis(chunk)
      }

    } catch (error) {
      console.error('[StreamingProcessor] Error processing audio chunk:', error)
      this.emit('error', error)
    }
  }

  /**
   * Phase 2.1: Process continuous streaming with overlapping windows - OPTIMIZED FOR HOT WORKER POOL
   */
  private async processContinuousStreaming(): Promise<void> {
    if (!this.circularBuffer) {
      return
    }

    try {
      // Get processing windows from circular buffer
      const windows = this.circularBuffer.getProcessingWindows()

      // Check pool capacity for concurrent processing
      const poolStatus = this.persistentEngine?.getStatus()
      const availableWorkers = poolStatus?.availableWorkers || 1
      const maxConcurrentWindows = Math.max(1, Math.min(availableWorkers, 3)) // Limit to 3 concurrent windows max

      console.log(`[StreamingProcessor] Processing ${windows.length} windows, ${availableWorkers} workers available, max concurrent: ${maxConcurrentWindows}`)

      // Process new windows that haven't been processed yet
      let processedCount = 0
      for (const window of windows) {
        if (!this.activeWindows.has(window.id) && window.startTime > this.lastProcessedTime) {
          // Check if we can process more windows concurrently
          if (processedCount >= maxConcurrentWindows) {
            console.log(`[StreamingProcessor] Reached max concurrent windows (${maxConcurrentWindows}), queuing remaining windows`)
            break
          }

          console.log(`[StreamingProcessor] Starting to process window ${window.id} (${processedCount + 1}/${maxConcurrentWindows})`)
          this.activeWindows.set(window.id, window)

          // Process window asynchronously - don't await to allow concurrent processing
          this.processStreamingWindow(window).catch(error => {
            console.error(`[StreamingProcessor] Error processing window ${window.id}:`, error)
            this.activeWindows.delete(window.id)
          })

          processedCount++
        } else {
          console.log(`[StreamingProcessor] Skipping window ${window.id} (already processed or too old)`)
        }
      }

      // Update last processed time
      if (windows.length > 0) {
        this.lastProcessedTime = Math.max(...windows.map(w => w.startTime))
      }

      // Log pool utilization
      if (poolStatus && processedCount > 0) {
        console.log(`[StreamingProcessor] Submitted ${processedCount} windows to pool (${poolStatus.poolUtilization?.toFixed(1)}% utilization)`)
      }

      // Clean up old windows and merge results
      await this.cleanupAndMergeResults()

    } catch (error) {
      console.error('[StreamingProcessor] Error in continuous streaming:', error)
      this.emit('error', error)
    }
  }

  /**
   * Phase 2.1: Process a single streaming window - OPTIMIZED FOR HOT WORKER POOL
   */
  private async processStreamingWindow(window: StreamingWindow): Promise<void> {
    const startTime = Date.now()
    try {
      console.log(`[StreamingProcessor] Processing window ${window.id} with ${window.audioData.length} bytes`)
      window.isProcessing = true

      // Create temporary audio file for this window
      const tempFilePath = await this.createTempAudioFile(window.audioData)
      console.log(`[StreamingProcessor] Created temp file for window ${window.id}: ${tempFilePath}`)

      // Transcribe using hot worker pool
      const result = await this.transcribeAudio(tempFilePath)
      const processingTime = Date.now() - startTime

      console.log(`[StreamingProcessor] Window ${window.id} transcription completed in ${processingTime}ms: "${result?.text || 'No result'}"`)

      // Apply confidence filtering
      if (result && this.meetsConfidenceThreshold(result)) {
        console.log(`[StreamingProcessor] Window ${window.id} passed confidence threshold, emitting streaming-result`)
        window.result = result
        this.streamingResults.set(window.id, result)

        // Enhanced result with timing information for UI optimization
        const enhancedResult = {
          ...result,
          processingTime,
          windowId: window.id,
          isRealTime: processingTime < 1000 // Flag for real-time performance
        }

        // Emit interim result with enhanced information
        console.log(`[StreamingProcessor] Emitting streaming-result event for window ${window.id} with text: "${result.text}" (${processingTime}ms)`)
        this.emit('streaming-result', {
          windowId: window.id,
          result: enhancedResult,
          timestamp: window.startTime,
          processingTime,
          isRealTime: processingTime < 1000
        })
      } else {
        console.log(`[StreamingProcessor] Window ${window.id} failed confidence threshold or no result (${processingTime}ms)`)
      }

      // Cleanup temp file
      await this.deleteTempFile(tempFilePath)

    } catch (error) {
      const processingTime = Date.now() - startTime
      console.error(`[StreamingProcessor] Error processing streaming window ${window.id} after ${processingTime}ms:`, error)
    } finally {
      window.isProcessing = false
      const totalTime = Date.now() - startTime
      console.log(`[StreamingProcessor] Finished processing window ${window.id} (total time: ${totalTime}ms)`)

      // Remove from active windows when done
      this.activeWindows.delete(window.id)
    }
  }

  /**
   * Phase 2.1: Check if transcription result meets confidence threshold
   */
  private meetsConfidenceThreshold(result: TranscriptionResult): boolean {
    const threshold = this.options.confidenceThreshold || 0.5
    console.log(`[StreamingProcessor] Checking confidence threshold: ${threshold}`)

    if (result.segments && result.segments.length > 0) {
      // Calculate average confidence from segments
      const avgConfidence = result.segments.reduce((sum, seg) =>
        sum + (seg.confidence || 0.8), 0) / result.segments.length
      console.log(`[StreamingProcessor] Average confidence: ${avgConfidence}, threshold: ${threshold}`)
      return avgConfidence >= threshold
    }

    // If no segments, assume reasonable confidence for non-empty text
    const hasText = Boolean(result.text && result.text.trim().length > 0)
    console.log(`[StreamingProcessor] No segments, has text: ${hasText}, text: "${result.text}"`)
    return hasText
  }

  /**
   * Phase 2.1: Clean up old windows and merge transcription results
   */
  private async cleanupAndMergeResults(): Promise<void> {
    const currentTime = Date.now()
    const maxAge = 10000 // Keep windows for 10 seconds

    // Remove old windows
    for (const [windowId, window] of this.activeWindows.entries()) {
      if (currentTime - window.startTime > maxAge) {
        this.activeWindows.delete(windowId)
        this.streamingResults.delete(windowId)
      }
    }

    // Merge current results into a continuous transcription
    const sortedResults = Array.from(this.streamingResults.entries())
      .sort(([, a], [, b]) => (a.segments?.[0]?.start || 0) - (b.segments?.[0]?.start || 0))
      .map(([, result]) => result.text || '')
      .filter(text => text.length > 0)

    const newMergedTranscription = this.mergeOverlappingText(sortedResults)

    // Emit merged result if it has changed
    if (newMergedTranscription !== this.mergedTranscription) {
      this.mergedTranscription = newMergedTranscription
      console.log(`[StreamingProcessor] Emitting merged-transcription event with text: "${this.mergedTranscription}"`)
      this.emit('merged-transcription', {
        text: this.mergedTranscription,
        timestamp: currentTime
      })
    }
  }

  /**
   * Phase 2.1: Merge overlapping text segments intelligently
   */
  private mergeOverlappingText(textSegments: string[]): string {
    if (textSegments.length === 0) {
      return ''
    }

    if (textSegments.length === 1) {
      return textSegments[0]
    }

    // Simple merging strategy: join unique segments
    // TODO: Implement more sophisticated overlap detection and merging
    const uniqueSegments = textSegments.filter((text, index) =>
      index === 0 || text !== textSegments[index - 1]
    )

    return uniqueSegments.join(' ').trim()
  }

  /**
   * Schedule audio processing with debouncing
   */
  private scheduleProcessing(): void {
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout)
    }

    this.processingTimeout = setTimeout(async () => {
      await this.processBufferedAudio()
    }, 250) // Process every 0.25 seconds for faster interim results with persistent engine
  }

  /**
   * Process buffered audio chunks
   */
  private async processBufferedAudio(): Promise<void> {
    if (this.state.isProcessing || this.audioBuffer.length === 0) {
      return
    }

    try {
      this.state.isProcessing = true
      this.emit('processing-chunk')

      // Combine recent audio chunks
      const audioToProcess = this.combineAudioChunks(this.audioBuffer)
      
      // Create temporary audio file
      const tempFilePath = await this.createTempAudioFile(audioToProcess)
      
      // Transcribe using nodejs-whisper
      const result = await this.transcribeAudio(tempFilePath)
      
      // Emit interim result
      if (result) {
        console.log('[StreamingProcessor] Emitting interim-result:', result.text)
        this.emit('interim-result', result)
      } else {
        console.log('[StreamingProcessor] No interim result to emit')
      }

      // Cleanup temp file
      await this.deleteTempFile(tempFilePath)

    } catch (error) {
      console.error('[StreamingProcessor] Error processing buffered audio:', error)
      this.emit('error', error)
    } finally {
      this.state.isProcessing = false
    }
  }

  /**
   * Process final audio when stopping
   */
  private async processFinalAudio(): Promise<TranscriptionResult | null> {
    console.log(`[StreamingProcessor] Processing final audio: ${this.state.currentChunks.length} chunks available`)
    if (this.state.currentChunks.length === 0) {
      console.log('[StreamingProcessor] No chunks available for final processing')
      return null
    }

    try {
      console.log('[StreamingProcessor] Processing final audio...')
      
      // Combine all chunks
      const finalAudio = this.combineAudioChunks(this.state.currentChunks)
      
      // Create temporary audio file
      const tempFilePath = await this.createTempAudioFile(finalAudio)
      
      // Transcribe using nodejs-whisper
      const result = await this.transcribeAudio(tempFilePath)
      
      // Cleanup temp file
      await this.deleteTempFile(tempFilePath)
      
      return result
    } catch (error) {
      console.error('[StreamingProcessor] Error processing final audio:', error)
      return null
    }
  }

  /**
   * OPTIMIZED TRANSCRIPTION: Use hot worker pool for ultra-low latency
   */
  private async transcribeAudio(audioFilePath: string): Promise<TranscriptionResult | null> {
    try {
      // Try PersistentWhisperEngine (hot worker pool) first if available and not in fallback mode
      if (this.persistentEngine && this.engineInitialized && !this.fallbackToLegacy) {
        const poolStatus = this.persistentEngine.getStatus()
        console.log(`[StreamingProcessor] Using hot worker pool for: ${audioFilePath} (${poolStatus.availableWorkers}/${poolStatus.workerCount} workers available)`)

        try {
          const startTime = Date.now()
          const result = await this.persistentEngine.transcribe(audioFilePath)
          const totalTime = Date.now() - startTime

          if (result) {
            console.log(`[StreamingProcessor] Hot worker pool result: "${result.text}" (${result.processingTime || totalTime}ms)`)
            return {
              success: result.success,
              text: result.text,
              segments: result.segments || [],
              duration: result.duration || this.state.totalDuration / 1000
            }
          } else {
            console.warn('[StreamingProcessor] Hot worker pool returned null, falling back to legacy')
            this.fallbackToLegacy = true
          }
        } catch (error) {
          console.error('[StreamingProcessor] Hot worker pool error, falling back to legacy:', error)
          this.fallbackToLegacy = true

          // Check if it's a pool-specific error
          const poolStatus = this.persistentEngine.getStatus()
          if (poolStatus.poolStats && poolStatus.poolStats.warmWorkers === 0) {
            console.warn('[StreamingProcessor] No warm workers available - pool may need restart')
          }
        }
      } else {
        if (!this.persistentEngine) {
          console.log('[StreamingProcessor] No persistent engine available, using legacy')
        } else if (!this.engineInitialized) {
          console.log('[StreamingProcessor] Engine not initialized yet, using legacy')
        } else {
          console.log('[StreamingProcessor] In fallback mode, using legacy')
        }
      }

      // Fallback to legacy whisper-cli approach
      return await this.transcribeAudioLegacy(audioFilePath)

    } catch (error) {
      console.error('[StreamingProcessor] Transcription error:', error)
      return null
    }
  }

  /**
   * Legacy whisper-cli transcription (fallback)
   */
  private async transcribeAudioLegacy(audioFilePath: string): Promise<TranscriptionResult | null> {
    try {
      console.log(`[StreamingProcessor] Using legacy whisper-cli for: ${audioFilePath}`)

      // Ensure model cache is initialized
      if (!StreamingAudioProcessor.modelCache?.isLoaded) {
        await this.initializeModelCache()
        if (!StreamingAudioProcessor.modelCache?.isLoaded) {
          console.error('[StreamingProcessor] Model cache not available')
          return null
        }
      }

      const cache = StreamingAudioProcessor.modelCache!
      cache.lastUsed = Date.now()

      const { spawn } = require('child_process')

      // PHASE 1.3: Optimized whisper-cli parameters for real-time streaming with tiny.en
      const args = [
        '-l', 'en',
        '-m', cache.modelPath,
        '-f', audioFilePath,
        '--no-timestamps', // For streaming, we want clean text without timestamps
        '--threads', '1', // OPTIMIZED: Single thread for tiny.en model (faster startup, lower latency)
        '--processors', '1', // Single processor for lower latency
        '--beam-size', '1', // OPTIMIZED: Greedy decoding for speed (vs default 5)
        '--best-of', '1', // OPTIMIZED: Single candidate for speed (vs default 5)
        '--temperature', '0.0', // OPTIMIZED: Deterministic output for consistency
        '--no-fallback' // OPTIMIZED: Disable fallback to prevent delays
      ]

      console.log(`[StreamingProcessor] Executing legacy: ${cache.whisperCliPath} ${args.join(' ')}`)

      return new Promise((resolve) => {
        const startTime = Date.now()
        let isResolved = false
        let timeoutHandle: NodeJS.Timeout | null = null

        // Set working directory to whisper.cpp directory for consistency with nodejs-whisper
        const whisperProcess = spawn(cache.whisperCliPath, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: cache.whisperCppDir
        })

        let stdout = ''
        let stderr = ''

        // Helper function to resolve once and cleanup
        const resolveOnce = (result: any) => {
          if (isResolved) return
          isResolved = true

          // Clear timeout to prevent stray timeout logs
          if (timeoutHandle) {
            clearTimeout(timeoutHandle)
            timeoutHandle = null
          }

          resolve(result)
        }

        whisperProcess.stdout.on('data', (data: any) => {
          stdout += data.toString()
        })

        whisperProcess.stderr.on('data', (data: any) => {
          stderr += data.toString()
        })

        whisperProcess.on('close', (code: any) => {
          const processingTime = Date.now() - startTime
          console.log(`[StreamingProcessor] Legacy whisper-cli finished with code: ${code} (${processingTime}ms)`)

          if (code === 0) {
            // Parse the output to extract clean text
            const text = this.parseWhisperCliOutput(stdout)
            console.log(`[StreamingProcessor] Legacy extracted text: "${text}" (processing time: ${processingTime}ms)`)

            if (text && text.trim()) {
              resolveOnce({
                success: true,
                text: text.trim(),
                segments: [],
                duration: this.state.totalDuration / 1000
              })
            } else {
              console.log(`[StreamingProcessor] No text extracted from legacy whisper-cli output`)
              resolveOnce(null)
            }
          } else {
            console.error(`[StreamingProcessor] Legacy whisper-cli failed with code ${code}`)
            console.error(`[StreamingProcessor] stderr: ${stderr}`)
            resolveOnce(null)
          }
        })

        whisperProcess.on('error', (error: any) => {
          console.error(`[StreamingProcessor] Legacy whisper-cli spawn error:`, error)
          resolveOnce(null)
        })

        // PHASE 1.3: Aggressive timeout for real-time streaming with tiny.en model
        timeoutHandle = setTimeout(() => {
          if (!isResolved) {
            const timeoutTime = Date.now() - startTime
            whisperProcess.kill('SIGTERM')
            console.warn(`[StreamingProcessor] Legacy whisper-cli timeout for streaming transcription (${timeoutTime}ms)`)
            resolveOnce(null)
          }
        }, 1500) // 1.5 second timeout for streaming (optimized for tiny.en model)
      })
    } catch (error) {
      console.error('[StreamingProcessor] Legacy transcription error:', error)
      return null
    }
  }

  /**
   * Parse whisper-cli output to extract clean text
   * Handles both timestamped and --no-timestamps output formats
   */
  private parseWhisperCliOutput(output: string): string {
    try {
      console.log(`[StreamingProcessor] Raw whisper-cli output: "${output}"`)

      // whisper-cli outputs text directly to stdout
      // Remove any system info lines and extract the actual transcription
      const lines = output.split('\n')

      // For --no-timestamps mode, whisper-cli outputs clean text directly
      // We need to be less aggressive with filtering
      const transcriptionLines = lines.filter(line => {
        const trimmed = line.trim()

        // Skip empty lines
        if (!trimmed) return false

        // Skip system/debug info lines
        if (trimmed.startsWith('whisper_') ||
            trimmed.startsWith('system_info:') ||
            trimmed.startsWith('main:') ||
            trimmed.startsWith('ggml_') ||
            trimmed.includes('load time') ||
            trimmed.includes('fallbacks') ||
            trimmed.includes('mel time') ||
            trimmed.includes('sample time') ||
            trimmed.includes('encode time') ||
            trimmed.includes('decode time') ||
            trimmed.includes('total time') ||
            trimmed.includes('processing') ||
            trimmed.includes('threads') ||
            trimmed.includes('beams') ||
            trimmed.includes('processors') ||
            trimmed.includes('GPU') ||
            trimmed.includes('Metal') ||
            trimmed.includes('BLAS') ||
            trimmed.includes('simdgroup') ||
            trimmed.includes('hasUnified') ||
            trimmed.includes('recommended') ||
            trimmed.includes('skipping kernel') ||
            trimmed.includes('deallocating') ||
            trimmed.includes('allocating') ||
            trimmed.includes('picking default') ||
            trimmed.includes('found device') ||
            trimmed.includes('using') && (trimmed.includes('backend') || trimmed.includes('library'))) {
          return false
        }

        // Skip timestamp lines (for compatibility with timestamped output)
        if (trimmed.startsWith('[') && trimmed.includes('-->')) {
          return false
        }

        // This should be actual transcription text
        return true
      })

      const extractedText = transcriptionLines.join(' ').trim()
      console.log(`[StreamingProcessor] Filtered lines: ${JSON.stringify(transcriptionLines)}`)
      console.log(`[StreamingProcessor] Parsed ${transcriptionLines.length} lines into: "${extractedText}"`)
      return extractedText
    } catch (error) {
      console.error('[StreamingProcessor] Error parsing whisper-cli output:', error)
      return ''
    }
  }

  /**
   * Combine audio chunks into a single buffer
   */
  private combineAudioChunks(chunks: AudioChunk[]): Buffer {
    if (chunks.length === 0) {
      return Buffer.alloc(0)
    }

    return Buffer.concat(chunks.map(chunk => chunk.data))
  }

  /**
   * Create temporary audio file with proper WAV header
   */
  private async createTempAudioFile(audioData: Buffer): Promise<string> {
    const fileName = `audio_${this.sessionId}_${Date.now()}.wav`
    const filePath = path.join(this.tempDir, fileName)

    // Create proper WAV file with header
    const wavBuffer = this.createWavBuffer(audioData)
    await fs.writeFile(filePath, wavBuffer)
    return filePath
  }

  /**
   * Create a proper WAV file buffer with header and padding if needed
   */
  private createWavBuffer(audioData: Buffer): Buffer {
    const sampleRate = 16000 // 16kHz sample rate
    const numChannels = 1     // Mono
    const bitsPerSample = 16  // 16-bit samples
    const byteRate = sampleRate * numChannels * bitsPerSample / 8
    const blockAlign = numChannels * bitsPerSample / 8

    // Calculate audio duration in milliseconds
    const durationMs = (audioData.length / (sampleRate * numChannels * bitsPerSample / 8)) * 1000
    console.log(`[StreamingProcessor] Audio duration: ${durationMs.toFixed(1)}ms (${audioData.length} bytes)`)

    // Pad audio if it's shorter than 1000ms (whisper's minimum requirement)
    let paddedAudioData = audioData
    if (durationMs < 1000) {
      const requiredBytes = Math.ceil((sampleRate * numChannels * bitsPerSample / 8) * 1.0) // 1 second
      const paddingBytes = requiredBytes - audioData.length
      console.log(`[StreamingProcessor] Padding audio: ${durationMs.toFixed(1)}ms -> 1000ms (adding ${paddingBytes} bytes of silence)`)

      // Create silence padding (zeros)
      const padding = Buffer.alloc(paddingBytes, 0)
      paddedAudioData = Buffer.concat([audioData, padding])
    }

    const dataSize = paddedAudioData.length
    const fileSize = 36 + dataSize

    // Create WAV header
    const header = Buffer.alloc(44)
    let offset = 0

    // RIFF header
    header.write('RIFF', offset); offset += 4
    header.writeUInt32LE(fileSize, offset); offset += 4
    header.write('WAVE', offset); offset += 4

    // fmt chunk
    header.write('fmt ', offset); offset += 4
    header.writeUInt32LE(16, offset); offset += 4 // PCM chunk size
    header.writeUInt16LE(1, offset); offset += 2  // PCM format
    header.writeUInt16LE(numChannels, offset); offset += 2
    header.writeUInt32LE(sampleRate, offset); offset += 4
    header.writeUInt32LE(byteRate, offset); offset += 4
    header.writeUInt16LE(blockAlign, offset); offset += 2
    header.writeUInt16LE(bitsPerSample, offset); offset += 2

    // data chunk
    header.write('data', offset); offset += 4
    header.writeUInt32LE(dataSize, offset); offset += 4

    // Combine header and padded audio data
    return Buffer.concat([header, paddedAudioData])
  }

  /**
   * Delete temporary file
   */
  private async deleteTempFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath)
    } catch (error) {
      // Ignore errors when deleting temp files
      console.warn('[StreamingProcessor] Could not delete temp file:', filePath)
    }
  }

  /**
   * Emit audio analysis data for visualization
   */
  private emitAudioAnalysis(chunk: AudioChunk): void {
    // Calculate RMS for volume level
    const samples = new Int16Array(chunk.data.buffer)
    let sum = 0
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i]
    }
    const rms = Math.sqrt(sum / samples.length) / 32768 // Normalize to 0-1

    this.emit('audio-analysis', {
      rms,
      timestamp: chunk.timestamp,
      duration: chunk.duration
    })
  }

  /**
   * Ensure temp directory exists
   */
  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true })
    } catch (error) {
      console.error('[StreamingProcessor] Could not create temp directory:', error)
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    try {
      // Clear processing timeout
      if (this.processingTimeout) {
        clearTimeout(this.processingTimeout)
        this.processingTimeout = null
      }

      // Clear buffers
      this.audioBuffer = []
      this.state.currentChunks = []

      // Phase 2.1: Clean up streaming components
      this.circularBuffer = null
      this.activeWindows.clear()
      this.streamingResults.clear()
      this.mergedTranscription = ''

      // Clean up temp files
      const tempFiles = await fs.readdir(this.tempDir)
      const sessionFiles = tempFiles.filter(file => file.includes(this.sessionId))

      for (const file of sessionFiles) {
        await this.deleteTempFile(path.join(this.tempDir, file))
      }

      // Stop optimization interval
      this.stopOptimizationInterval()

      // Shutdown PersistentWhisperEngine if needed
      if (this.persistentEngine) {
        await this.persistentEngine.shutdown()
        this.persistentEngine = null
        this.engineInitialized = false
      }

      console.log('[StreamingProcessor] Cleanup completed')
    } catch (error) {
      console.error('[StreamingProcessor] Error during cleanup:', error)
    }
  }

  /**
   * Get current processing state
   */
  public getState(): ProcessingState {
    return { ...this.state }
  }

  /**
   * Enable or disable VAD-based speech detection
   */
  public setVADEnabled(enabled: boolean): void {
    this.vadEnabled = enabled
    console.log(`[StreamingProcessor] VAD ${enabled ? 'enabled' : 'disabled'}`)

    if (!enabled) {
      // Reset speech detection state when disabling VAD
      this.speechDetected = false
      this.speechStartTime = 0
      this.speechEndTime = 0
    }
  }

  /**
   * Check if VAD is enabled
   */
  public isVADEnabled(): boolean {
    return this.vadEnabled
  }

  /**
   * Check if speech is currently detected
   */
  public isSpeechDetected(): boolean {
    return this.speechDetected
  }

  /**
   * Set VAD silence threshold (ms of silence before stopping transcription)
   */
  public setVADSilenceThreshold(thresholdMs: number): void {
    this.vadSilenceThreshold = thresholdMs
    console.log(`[StreamingProcessor] VAD silence threshold set to ${thresholdMs}ms`)
  }

  /**
   * Check if currently processing
   */
  public isProcessing(): boolean {
    return this.state.isProcessing
  }

  /**
   * Get current processing status
   */
  public getStatus(): ProcessingState {
    return this.state
  }

  /**
   * Optimize buffer settings based on PersistentWhisperEngine performance
   */
  public optimizeForPersistentEngine(): void {
    if (this.persistentEngine && this.engineInitialized && !this.fallbackToLegacy) {
      const engineStatus = this.persistentEngine.getStatus()

      // If average latency is very low (<300ms), we can be more aggressive
      if (engineStatus.averageLatency > 0 && engineStatus.averageLatency < 300) {
        console.log(`[StreamingProcessor] Optimizing for fast engine (avg latency: ${engineStatus.averageLatency}ms)`)

        // Use even smaller windows for ultra-fast response
        this.options.windowSizeMs = 500 // 0.5 second windows
        this.options.overlapMs = 100   // 0.1 second overlap
        this.vadSilenceThreshold = 500 // 0.5 second silence threshold

        // Recreate circular buffer with new settings
        if (this.circularBuffer) {
          this.circularBuffer = new CircularAudioBuffer({
            maxSizeBytes: this.options.maxBufferSizeBytes || 256 * 1024,
            windowSizeMs: this.options.windowSizeMs,
            overlapMs: this.options.overlapMs
          })
          console.log('[StreamingProcessor] Recreated circular buffer with ultra-fast settings')
        }
      }
      // If latency is moderate (300-600ms), use balanced settings
      else if (engineStatus.averageLatency >= 300 && engineStatus.averageLatency < 600) {
        console.log(`[StreamingProcessor] Using balanced settings (avg latency: ${engineStatus.averageLatency}ms)`)
        // Keep current optimized settings
      }
      // If latency is high (>600ms), fall back to conservative settings
      else if (engineStatus.averageLatency >= 600) {
        console.log(`[StreamingProcessor] Using conservative settings due to high latency (avg latency: ${engineStatus.averageLatency}ms)`)
        this.options.windowSizeMs = 1000 // 1 second windows
        this.options.overlapMs = 200     // 0.2 second overlap
        this.vadSilenceThreshold = 1000  // 1 second silence threshold
      }
    } else {
      console.log('[StreamingProcessor] PersistentEngine not available, using legacy-optimized settings')
      // Use conservative settings for legacy mode
      this.options.windowSizeMs = 1000
      this.options.overlapMs = 250
      this.vadSilenceThreshold = 1000
    }
  }

  /**
   * Get PersistentWhisperEngine status for monitoring
   */
  public getEngineStatus(): any {
    if (this.persistentEngine) {
      return {
        ...this.persistentEngine.getStatus(),
        queueStatus: this.persistentEngine.getQueueStatus(),
        fallbackMode: this.fallbackToLegacy
      }
    }
    return {
      isRunning: false,
      isReady: false,
      fallbackMode: true
    }
  }

  /**
   * Start periodic optimization of buffer settings
   */
  private startOptimizationInterval(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval)
    }

    // Optimize every 10 seconds based on performance metrics
    this.optimizationInterval = setInterval(() => {
      if (this.persistentEngine && this.engineInitialized) {
        const status = this.persistentEngine.getStatus()
        // Only optimize if we have enough data points
        if (status.requestsProcessed >= 5) {
          this.optimizeForPersistentEngine()
        }
      }
    }, 10000)
  }

  /**
   * Stop optimization interval
   */
  private stopOptimizationInterval(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval)
      this.optimizationInterval = null
    }
  }

  /**
   * Optimize buffer settings for hot worker pool
   */
  private optimizeForHotWorkerPool(): void {
    if (!this.persistentEngine || !this.engineInitialized) {
      return
    }

    const status = this.persistentEngine.getStatus()
    console.log(`[StreamingProcessor] Optimizing for hot worker pool: ${status.availableWorkers}/${status.workerCount} workers, ${status.poolUtilization?.toFixed(1)}% utilization`)

    // Optimize for hot workers (no model loading delay)
    if (status.poolStats && status.poolStats.warmWorkers > 0) {
      // Ultra-fast settings for hot workers
      this.options.windowSizeMs = 1500 // Reduced window size for faster processing
      this.options.overlapMs = 300     // Reduced overlap for lower latency
      this.vadSilenceThreshold = 500   // Faster speech detection response

      console.log('[StreamingProcessor] Applied hot worker pool optimizations: 1.5s windows, 300ms overlap, 500ms VAD threshold')

      // Recreate circular buffer with optimized settings
      if (this.circularBuffer) {
        this.circularBuffer = new CircularAudioBuffer({
          maxSizeBytes: this.options.maxBufferSizeBytes || 256 * 1024,
          windowSizeMs: this.options.windowSizeMs,
          overlapMs: this.options.overlapMs
        })
        console.log('[StreamingProcessor] Recreated circular buffer with hot worker optimizations')
      }
    }
  }

  /**
   * Start periodic pool monitoring and optimization
   */
  private startPoolMonitoring(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval)
    }

    this.optimizationInterval = setInterval(() => {
      if (this.persistentEngine && this.engineInitialized) {
        this.monitorPoolHealth()
      }
    }, 15000) // Check every 15 seconds for more responsive monitoring

    console.log('[StreamingProcessor] Started pool monitoring interval')
  }

  /**
   * Monitor pool health and performance
   */
  private monitorPoolHealth(): void {
    if (!this.persistentEngine) return

    const status = this.persistentEngine.getStatus()
    const poolStats = status.poolStats

    if (poolStats) {
      console.log(`[StreamingProcessor] Pool health: ${poolStats.warmWorkers}/${poolStats.totalWorkers} warm, ${poolStats.availableWorkers} available, ${poolStats.poolUtilization.toFixed(1)}% utilization, avg latency: ${poolStats.averageLatency.toFixed(0)}ms`)

      // Check for pool issues
      if (poolStats.warmWorkers === 0) {
        console.warn('[StreamingProcessor] No warm workers available - pool may need restart')
        this.fallbackToLegacy = true
      } else if (poolStats.availableWorkers === 0 && poolStats.poolUtilization > 90) {
        console.warn('[StreamingProcessor] Pool fully saturated - consider increasing pool size')
      } else if (poolStats.averageLatency > 2000) {
        console.warn('[StreamingProcessor] High pool latency detected - may need optimization')
      } else {
        // Pool is healthy, ensure we're using it
        this.fallbackToLegacy = false
      }

      // Emit pool status for monitoring
      this.emit('pool-status', {
        warmWorkers: poolStats.warmWorkers,
        totalWorkers: poolStats.totalWorkers,
        utilization: poolStats.poolUtilization,
        averageLatency: poolStats.averageLatency,
        isHealthy: poolStats.warmWorkers > 0 && poolStats.averageLatency < 2000
      })
    }
  }
}

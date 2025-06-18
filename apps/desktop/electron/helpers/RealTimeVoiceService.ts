/**
 * RealTimeVoiceService.ts
 *
 * Real-time voice-to-text service using MediaRecorder API for recording
 * and nodejs-whisper for local transcription. Provides real-time audio
 * analysis for visualization while maintaining compatibility with the
 * existing LocalWhisperService interface.
 */

import { EventEmitter } from 'events'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { v4 as uuidv4 } from 'uuid'

// Import types from LocalWhisperService for compatibility
import { LocalWhisperOptions, TranscriptionResult, TranscriptionSegment, RecordingStatus } from './LocalWhisperService'
import StreamingAudioProcessor from './StreamingAudioProcessor'

// Lazy load nodejs-whisper to avoid startup timeout
let nodewhisper: any = null

const loadWhisperModule = () => {
  if (!nodewhisper) {
    const whisperModule = require('nodejs-whisper')
    nodewhisper = whisperModule.nodewhisper

    // Configure nodejs-whisper to avoid exec path issues
    try {
      // Get the actual node binary path, not the Electron binary
      let nodePath = '/opt/homebrew/bin/node' // Default for macOS with Homebrew

      // Try common node paths in order of preference
      const commonPaths = [
        '/opt/homebrew/bin/node',  // Homebrew on Apple Silicon
        '/usr/local/bin/node',     // Homebrew on Intel Mac
        '/usr/bin/node',           // System node
        'node'                     // PATH lookup
      ]

      for (const path of commonPaths) {
        try {
          if (require('fs').existsSync(path)) {
            nodePath = path
            break
          }
        } catch (e) {
          // Continue to next path
        }
      }

      console.log('[RealTimeVoice] Using node path:', nodePath)

      // Try multiple configuration approaches
      if (whisperModule.config) {
        whisperModule.config.execPath = nodePath
        console.log('[RealTimeVoice] Set nodejs-whisper config.execPath to:', nodePath)
      }

      // Also try setting it on the main module
      if (whisperModule.setExecPath) {
        whisperModule.setExecPath(nodePath)
        console.log('[RealTimeVoice] Set nodejs-whisper execPath via setExecPath to:', nodePath)
      }

      // Set environment variable as fallback
      process.env.NODEJS_WHISPER_EXEC_PATH = nodePath
      console.log('[RealTimeVoice] Set NODEJS_WHISPER_EXEC_PATH environment variable to:', nodePath)

    } catch (error) {
      console.warn('[RealTimeVoice] Could not configure nodejs-whisper exec path:', error)
    }
  }
}

interface RealTimeVoiceOptions extends LocalWhisperOptions {
  enableRealTimeAnalysis?: boolean
  analysisInterval?: number // milliseconds
  enableStreaming?: boolean // Enable real-time streaming transcription
  streamingFallback?: boolean // Fallback to batch processing if streaming fails
}

interface AudioAnalysisData {
  rms: number // Root Mean Square for volume level
  frequency: number[] // Frequency data for visualization
  timestamp: number
}

class RealTimeVoiceService extends EventEmitter {
  private static instance: RealTimeVoiceService
  private isRecording: boolean = false
  private currentFilePath: string | null = null
  private recordingStartTime: number = 0
  private recordingTimer: NodeJS.Timeout | null = null
  private tempDir: string
  private options: RealTimeVoiceOptions
  private audioChunks: Buffer[] = []

  // Streaming transcription components
  private streamingProcessor: StreamingAudioProcessor | null = null
  private isStreamingMode: boolean = false
  private streamingSessionId: string | null = null
  private streamingInitialized: boolean = false

  // VAD integration for speech-triggered transcription
  private currentVADResult: { isVoice: boolean; energy: number; confidence: number } | null = null

  private constructor() {
    super()
    this.tempDir = path.join(os.tmpdir(), 'closezly-realtime-voice')
    this.options = {
      modelName: 'base.en', // Keep base.en for batch processing (higher accuracy)
      maxDuration: 60000, // 60 seconds
      language: 'en',
      wordTimestamps: true,
      enableRealTimeAnalysis: true,
      analysisInterval: 100, // 100ms for smooth visualization
      enableStreaming: true, // Enable real-time streaming transcription
      streamingFallback: true // Fallback to batch processing if streaming fails
    }
    this.ensureTempDir()
    this.initializeStreaming()
    // PHASE 1.3: Use comprehensive warm-up system instead of basic preload
    this.warmUpModels()
  }

  /**
   * PHASE 1.3: Comprehensive model warm-up system
   * Pre-loads both tiny.en (streaming) and base.en (batch) models
   */
  private async warmUpModels(): Promise<void> {
    try {
      console.log('[RealTimeVoice] Starting comprehensive model warm-up...')
      const startTime = Date.now()

      // Warm up tiny.en model for streaming (priority)
      const streamingWarmUp = StreamingAudioProcessor.warmUpModel('tiny.en')

      // Also warm up base.en model for batch processing (background)
      const batchWarmUp = this.warmUpBatchModel()

      // Wait for streaming model (critical for real-time performance)
      const streamingSuccess = await streamingWarmUp
      console.log(`[RealTimeVoice] Streaming model (tiny.en) warm-up: ${streamingSuccess ? 'SUCCESS' : 'FAILED'}`)

      // Don't wait for batch model, let it complete in background
      batchWarmUp.then(batchSuccess => {
        console.log(`[RealTimeVoice] Batch model (base.en) warm-up: ${batchSuccess ? 'SUCCESS' : 'FAILED'}`)
      }).catch(error => {
        console.warn('[RealTimeVoice] Batch model warm-up failed (non-critical):', error)
      })

      const totalTime = Date.now() - startTime
      console.log(`[RealTimeVoice] Model warm-up completed in ${totalTime}ms`)
    } catch (error) {
      console.warn('[RealTimeVoice] Model warm-up failed (non-critical):', error)
    }
  }

  /**
   * Warm up base.en model for batch processing
   */
  private async warmUpBatchModel(): Promise<boolean> {
    try {
      const path = require('path')
      const fs = require('fs')

      // Validate model paths for base.en
      const projectRoot = path.resolve(process.cwd(), '../..')
      const whisperCppDir = path.join(projectRoot, 'node_modules', 'nodejs-whisper', 'cpp', 'whisper.cpp')
      const whisperCliPath = path.join(whisperCppDir, 'build', 'bin', 'whisper-cli')
      const modelPath = path.join(whisperCppDir, 'models', 'ggml-base.en.bin')

      if (!fs.existsSync(whisperCliPath) || !fs.existsSync(modelPath)) {
        console.warn('[RealTimeVoice] Base.en model paths not found, skipping batch warm-up')
        return false
      }

      // Create test audio file
      const testAudioPath = path.join(this.tempDir, 'batch-warmup-test.wav')
      await this.createSilentTestAudio(testAudioPath)

      // Run quick transcription to load base.en model
      const { spawn } = require('child_process')
      const args = [
        '-l', 'en',
        '-m', modelPath,
        '-f', testAudioPath,
        '--no-timestamps',
        '--threads', '1',
        '--processors', '1',
        '--beam-size', '1',
        '--best-of', '1',
        '--temperature', '0.0'
      ]

      return new Promise((resolve) => {
        let isResolved = false
        let timeoutHandle: NodeJS.Timeout | null = null

        const warmUpProcess = spawn(whisperCliPath, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: whisperCppDir
        })

        // Helper function to resolve once and cleanup
        const resolveOnce = (result: boolean) => {
          if (isResolved) return
          isResolved = true

          // Clear timeout to prevent issues
          if (timeoutHandle) {
            clearTimeout(timeoutHandle)
            timeoutHandle = null
          }

          resolve(result)
        }

        warmUpProcess.on('close', async (code: number | null) => {
          console.log(`[RealTimeVoice] Base.en model warm-up completed with code: ${code}`)
          // Cleanup test file
          try {
            await fs.unlink(testAudioPath)
          } catch (e) {
            // Ignore cleanup errors
          }
          resolveOnce(code === 0)
        })

        warmUpProcess.on('error', (error: any) => {
          console.error(`[RealTimeVoice] Warm-up process error:`, error)
          resolveOnce(false)
        })

        // Timeout for warm-up with proper cleanup
        timeoutHandle = setTimeout(() => {
          if (!isResolved) {
            console.warn(`[RealTimeVoice] Base.en model warm-up timeout (3000ms)`)
            warmUpProcess.kill('SIGTERM')
            resolveOnce(false)
          }
        }, 3000) // 3 second timeout for batch warm-up
      })
    } catch (error) {
      console.warn('[RealTimeVoice] Base.en model warm-up failed:', error)
      return false
    }
  }

  /**
   * Create a minimal silent audio file for model preloading
   */
  private async createSilentTestAudio(filePath: string): Promise<void> {
    // Create a minimal WAV file with 0.1 seconds of silence
    const sampleRate = 16000
    const duration = 0.1 // 0.1 seconds
    const numSamples = Math.floor(sampleRate * duration)
    const audioData = Buffer.alloc(numSamples * 2, 0) // 16-bit silence

    // WAV header
    const wavBuffer = Buffer.alloc(44 + audioData.length)
    wavBuffer.write('RIFF', 0)
    wavBuffer.writeUInt32LE(36 + audioData.length, 4)
    wavBuffer.write('WAVE', 8)
    wavBuffer.write('fmt ', 12)
    wavBuffer.writeUInt32LE(16, 16) // PCM format chunk size
    wavBuffer.writeUInt16LE(1, 20) // PCM format
    wavBuffer.writeUInt16LE(1, 22) // Mono
    wavBuffer.writeUInt32LE(sampleRate, 24)
    wavBuffer.writeUInt32LE(sampleRate * 2, 28)
    wavBuffer.writeUInt16LE(2, 32)
    wavBuffer.writeUInt16LE(16, 34)
    wavBuffer.write('data', 36)
    wavBuffer.writeUInt32LE(audioData.length, 40)

    // Copy audio data
    audioData.copy(wavBuffer, 44)

    // Save to file
    await fs.writeFile(filePath, wavBuffer)
  }

  public static getInstance(): RealTimeVoiceService {
    if (!RealTimeVoiceService.instance) {
      RealTimeVoiceService.instance = new RealTimeVoiceService()
    }
    return RealTimeVoiceService.instance
  }

  /**
   * Ensure temporary directory exists
   */
  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true })
    } catch (error) {
      console.error('[RealTimeVoice] Failed to create temp directory:', error)
    }
  }

  /**
   * Initialize streaming transcription capability
   */
  private async initializeStreaming(): Promise<void> {
    if (!this.options.enableStreaming) {
      console.log('[RealTimeVoice] Streaming disabled by configuration')
      return
    }

    try {
      this.streamingProcessor = new StreamingAudioProcessor({
        modelSize: 'tiny.en', // PHASE 1.3: Force tiny.en for streaming (4x faster than base.en)
        language: this.options.language,
        enableRealTimeAnalysis: this.options.enableRealTimeAnalysis,
        chunkDuration: 1000, // 1 second chunks for real-time processing
        bufferSize: 10,
        // Phase 2.1: Enable continuous streaming features (optimized for PersistentWhisperEngine)
        enableContinuousStreaming: true,
        windowSizeMs: 750, // 0.75-second processing windows for faster response with persistent engine
        overlapMs: 150, // 0.15-second overlap for speed
        confidenceThreshold: 0.1, // Low confidence threshold for real-time responsiveness
        maxBufferSizeBytes: 512 * 1024 // 512KB circular buffer (optimized for persistent engine)
      })

      // Set up streaming event listeners
      this.setupStreamingEventListeners()

      console.log('[RealTimeVoice] Streaming processor initialized successfully')
    } catch (error) {
      console.error('[RealTimeVoice] Error initializing streaming:', error)
      this.streamingProcessor = null
    }
  }

  /**
   * Set up event listeners for streaming transcription
   */
  private setupStreamingEventListeners(): void {
    if (!this.streamingProcessor) return

    this.streamingProcessor.on('interim-result', (result: TranscriptionResult) => {
      console.log('[RealTimeVoice] Interim result:', result.text)
      this.emit('interim-transcription', result)
    })

    // Phase 2.1: Handle new streaming events
    this.streamingProcessor.on('streaming-result', (data: any) => {
      console.log('[RealTimeVoice] Streaming result received from processor:', data.result?.text)
      const streamingData = {
        text: data.result?.text || '',
        confidence: this.calculateAverageConfidence(data.result),
        windowId: data.windowId,
        timestamp: data.timestamp,
        isStreaming: true
      }
      console.log('[RealTimeVoice] Emitting streaming-transcription event:', streamingData)
      this.emit('streaming-transcription', streamingData)
    })

    this.streamingProcessor.on('merged-transcription', (data: any) => {
      console.log('[RealTimeVoice] Merged transcription received from processor:', data.text)
      const liveData = {
        text: data.text,
        timestamp: data.timestamp,
        isLive: true,
        confidence: 0.8 // Default confidence for merged results
      }
      console.log('[RealTimeVoice] Emitting live-transcription event:', liveData)
      this.emit('live-transcription', liveData)
    })

    this.streamingProcessor.on('processing-stopped', (result: TranscriptionResult) => {
      console.log('[RealTimeVoice] Final streaming result:', result?.text || 'No result')
      if (result) {
        this.emit('transcription-completed', result)
      }
    })

    this.streamingProcessor.on('error', (error: Error) => {
      console.error('[RealTimeVoice] Streaming error:', error)
      this.emit('streaming-error', error)

      // Fallback to batch processing if enabled
      if (this.options.streamingFallback && this.isRecording) {
        console.log('[RealTimeVoice] Falling back to batch processing due to streaming error')
        this.isStreamingMode = false
      }
    })

    this.streamingProcessor.on('processing-started', () => {
      this.emit('streaming-processing-started')
    })

    this.streamingProcessor.on('audio-analysis', (data: any) => {
      this.emit('audio-analysis', data)
    })
  }

  /**
   * Calculate average confidence from transcription result
   */
  private calculateAverageConfidence(result: TranscriptionResult | null): number {
    if (!result || !result.segments || result.segments.length === 0) {
      return 0.8 // Default confidence
    }

    const totalConfidence = result.segments.reduce((sum, segment) =>
      sum + (segment.confidence || 0.8), 0)
    return totalConfidence / result.segments.length
  }

  /**
   * Check if streaming mode is available and enabled
   */
  public isStreamingAvailable(): boolean {
    return this.streamingProcessor !== null && this.options.enableStreaming === true
  }

  /**
   * Get current streaming status
   */
  public getStreamingStatus(): { available: boolean; active: boolean; sessionId: string | null } {
    return {
      available: this.isStreamingAvailable(),
      active: this.isStreamingMode,
      sessionId: this.streamingSessionId
    }
  }

  /**
   * Start real-time voice recording
   * Prepares for receiving real audio data from AudioCaptureService
   */
  public async startRecording(options: RealTimeVoiceOptions = {}): Promise<boolean> {
    if (this.isRecording) {
      console.warn('[RealTimeVoice] Already recording, ignoring start request')
      return false
    }

    try {
      // Merge options with defaults
      this.options = { ...this.options, ...options }

      // Determine if we should use streaming mode
      this.isStreamingMode = this.isStreamingAvailable() && (this.options.enableStreaming === true)

      if (this.isStreamingMode) {
        console.log('[RealTimeVoice] Starting in streaming mode')

        // Initialize streaming processor if not already done
        if (!this.streamingInitialized && this.streamingProcessor) {
          const initialized = await this.streamingProcessor.startProcessing()

          if (!initialized) {
            console.warn('[RealTimeVoice] Failed to initialize streaming, falling back to batch mode')
            this.isStreamingMode = false
          } else {
            this.streamingInitialized = true
            this.streamingSessionId = `streaming-${Date.now()}`
          }
        }

        // Log streaming session start
        if (this.isStreamingMode && this.streamingProcessor) {
          console.log('[RealTimeVoice] Started streaming session:', this.streamingSessionId)
        }
      }

      if (!this.isStreamingMode) {
        console.log('[RealTimeVoice] Starting in batch processing mode')
      }

      // Start direct audio capture instead of using AudioCaptureService
      await this.startDirectAudioCapture()

      // Generate unique filename (still needed for fallback)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `realtime-voice-${timestamp}-${uuidv4().slice(0, 8)}.wav`
      this.currentFilePath = path.join(this.tempDir, filename)

      // Ensure temp directory exists
      await this.ensureTempDir()

      // Initialize audio accumulation
      this.audioChunks = []

      // Set recording state
      this.isRecording = true
      this.recordingStartTime = Date.now()

      // Set up auto-stop timer
      if (this.options.maxDuration) {
        this.recordingTimer = setTimeout(() => {
          console.log('[RealTimeVoice] Auto-stopping recording due to max duration')
          this.stopRecording()
        }, this.options.maxDuration)
      }

      this.emit('recording-started', {
        streamingMode: this.isStreamingMode,
        sessionId: this.streamingSessionId
      })

      const mode = this.isStreamingMode ? 'streaming' : 'batch'
      console.log(`[RealTimeVoice] Real-time recording started in ${mode} mode, waiting for audio data from microphone`)
      return true

    } catch (error) {
      console.error('[RealTimeVoice] Failed to start recording:', error)
      this.emit('recording-error', error)
      this.cleanup()
      return false
    }
  }

  /**
   * Start direct audio capture using renderer process without AudioCaptureService
   */
  private async startDirectAudioCapture(): Promise<void> {
    try {
      console.log('[RealTimeVoice] Starting direct audio capture...')

      // Get the main window to send audio capture commands
      const AppState = require('./AppState').default
      const mainWindow = AppState.getMainWindow()

      if (!mainWindow || mainWindow.isDestroyed()) {
        throw new Error('Main window not available for audio capture')
      }

      // Send command to renderer process to start audio capture
      await mainWindow.webContents.executeJavaScript(`
        window.postMessage({
          type: 'start-audio-capture',
          options: {
            sampleRate: 16000,
            channels: 1,
            chunkDuration: 1000,
            enableVAD: true,
            vadSensitivity: 'medium'
          }
        }, '*');
      `)

      console.log('[RealTimeVoice] Direct audio capture started successfully')
    } catch (error) {
      console.error('[RealTimeVoice] Error starting direct audio capture:', error)
      throw error
    }
  }

  /**
   * Stop direct audio capture using renderer process
   */
  private async stopDirectAudioCapture(): Promise<void> {
    try {
      console.log('[RealTimeVoice] Stopping direct audio capture...')

      // Get the main window to send audio capture commands
      const AppState = require('./AppState').default
      const mainWindow = AppState.getMainWindow()

      if (!mainWindow || mainWindow.isDestroyed()) {
        console.warn('[RealTimeVoice] Main window not available to stop audio capture')
        return
      }

      // Send command to renderer process to stop audio capture
      await mainWindow.webContents.executeJavaScript(`
        window.postMessage({
          type: 'stop-audio-capture'
        }, '*');
      `)

      console.log('[RealTimeVoice] Direct audio capture stopped successfully')
    } catch (error) {
      console.error('[RealTimeVoice] Error stopping direct audio capture:', error)
    }
  }



  /**
   * Receive VAD status updates from renderer process
   */
  public receiveVADStatus(vadResult: { isVoice: boolean; energy: number; confidence: number }): void {
    this.currentVADResult = vadResult

    // Log VAD status changes for debugging
    if (Math.random() < 0.05) { // Log ~5% of VAD updates to avoid spam
      console.log(`[RealTimeVoice] VAD status: voice=${vadResult.isVoice}, energy=${vadResult.energy.toFixed(3)}, confidence=${vadResult.confidence.toFixed(3)}`)
    }
  }

  /**
   * Receive audio data from renderer process and accumulate it
   */
  public async receiveAudioData(audioBuffer: Buffer): Promise<void> {
    if (!this.isRecording) {
      console.warn('[RealTimeVoice] Received audio data but not recording')
      return
    }

    try {
      // Always accumulate audio chunks for fallback/batch processing
      this.audioChunks.push(audioBuffer)

      // If in streaming mode, send to streaming processor with VAD results
      if (this.isStreamingMode && this.streamingProcessor) {
        try {
          await this.streamingProcessor.processAudioChunk(audioBuffer, this.currentVADResult || undefined)
          console.log(`[RealTimeVoice] Sent audio chunk to streaming processor (${audioBuffer.length} bytes)`)
        } catch (streamingError) {
          console.error('[RealTimeVoice] Error sending to streaming processor:', streamingError)

          // Fallback to batch mode if streaming fails
          if (this.options.streamingFallback) {
            console.log('[RealTimeVoice] Falling back to batch processing due to streaming error')
            this.isStreamingMode = false
            this.emit('streaming-fallback', streamingError)
          }
        }
      }

      if (!this.isStreamingMode) {
        console.log(`[RealTimeVoice] Accumulated audio chunk (${audioBuffer.length} bytes), total chunks: ${this.audioChunks.length}`)
      }

      // Emit real-time audio data for visualization if needed
      this.emit('audio-data', audioBuffer)
    } catch (error) {
      console.error('[RealTimeVoice] Error processing audio data:', error)
      this.emit('recording-error', error)
    }
  }

  /**
   * Create a WAV file from accumulated audio chunks
   */
  private async createWavFromChunks(): Promise<void> {
    if (this.audioChunks.length === 0) {
      throw new Error('No audio chunks to process')
    }

    try {
      // Combine all audio chunks
      const combinedAudio = Buffer.concat(this.audioChunks)
      console.log(`[RealTimeVoice] Combined ${this.audioChunks.length} chunks into ${combinedAudio.length} bytes`)

      // Audio parameters (matching the renderer audio capture settings)
      const sampleRate = 16000
      const numChannels = 1
      const bytesPerSample = 2
      const numSamples = combinedAudio.length / bytesPerSample

      // Create WAV file buffer with proper header
      const wavBuffer = Buffer.alloc(44 + combinedAudio.length)

      // WAV header
      wavBuffer.write('RIFF', 0)
      wavBuffer.writeUInt32LE(36 + combinedAudio.length, 4)
      wavBuffer.write('WAVE', 8)
      wavBuffer.write('fmt ', 12)
      wavBuffer.writeUInt32LE(16, 16) // PCM format chunk size
      wavBuffer.writeUInt16LE(1, 20) // PCM format
      wavBuffer.writeUInt16LE(numChannels, 22)
      wavBuffer.writeUInt32LE(sampleRate, 24)
      wavBuffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28)
      wavBuffer.writeUInt16LE(numChannels * bytesPerSample, 32)
      wavBuffer.writeUInt16LE(8 * bytesPerSample, 34)
      wavBuffer.write('data', 36)
      wavBuffer.writeUInt32LE(combinedAudio.length, 40)

      // Copy audio data
      combinedAudio.copy(wavBuffer, 44)

      // Save to file
      if (this.currentFilePath) {
        await fs.writeFile(this.currentFilePath, wavBuffer)
        console.log(`[RealTimeVoice] WAV file created: ${this.currentFilePath} (${wavBuffer.length} bytes)`)
      }
    } catch (error) {
      console.error('[RealTimeVoice] Error creating WAV file from chunks:', error)
      throw error
    }
  }

  /**
   * Stop recording and transcribe using streaming or batch processing
   */
  public async stopRecording(): Promise<TranscriptionResult> {
    if (!this.isRecording) {
      console.warn('[RealTimeVoice] Not recording, ignoring stop request')
      return { success: false, error: 'Not recording' }
    }

    // Prevent multiple stop calls
    const wasRecording = this.isRecording
    const wasStreamingMode = this.isStreamingMode
    this.isRecording = false

    try {
      console.log(`[RealTimeVoice] Stopping recording in ${wasStreamingMode ? 'streaming' : 'batch'} mode...`)

      // Clear timer
      if (this.recordingTimer) {
        clearTimeout(this.recordingTimer)
        this.recordingTimer = null
      }

      const recordingDuration = (Date.now() - this.recordingStartTime) / 1000

      this.emit('recording-stopped', {
        duration: recordingDuration,
        streamingMode: wasStreamingMode
      })

      // Handle streaming mode finalization
      if (wasStreamingMode && this.streamingProcessor && this.streamingSessionId) {
        try {
          console.log('[RealTimeVoice] Finalizing streaming session...')
          const finalResult = await this.streamingProcessor.stopProcessing()

          if (finalResult) {
            console.log('[RealTimeVoice] Streaming transcription completed successfully')
            await this.cleanup()
            return finalResult
          } else {
            console.warn('[RealTimeVoice] No streaming result, falling back to batch processing')
            // Continue to batch processing fallback below
          }
        } catch (streamingError) {
          console.error('[RealTimeVoice] Error during streaming finalization:', streamingError)
          this.emit('streaming-error', streamingError)
          // Continue to batch processing fallback below
        }
      }

      // Batch processing (either as primary mode or fallback)
      return await this.processBatchTranscription(recordingDuration)

    } catch (error) {
      console.error('[RealTimeVoice] Error during stop/transcription:', error)
      await this.cleanup()
      return {
        success: false,
        error: (error as Error).message,
        duration: wasRecording ? (Date.now() - this.recordingStartTime) / 1000 : 0
      }
    }
  }



  /**
   * Optimized whisper-cli transcription for batch processing
   */
  private async transcribeWithOptimizedWhisperCli(audioFilePath: string): Promise<any> {
    try {
      console.log(`[RealTimeVoice] Using optimized whisper-cli for batch transcription: ${audioFilePath}`)

      const { spawn } = require('child_process')
      const path = require('path')
      const fs = require('fs')

      // Use the same optimized paths as StreamingAudioProcessor
      const projectRoot = path.resolve(process.cwd(), '../..')
      const whisperCppDir = path.join(projectRoot, 'node_modules', 'nodejs-whisper', 'cpp', 'whisper.cpp')
      const whisperCliPath = path.join(whisperCppDir, 'build', 'bin', 'whisper-cli')
      const modelPath = path.join(whisperCppDir, 'models', 'ggml-base.en.bin')

      // Validate paths
      if (!fs.existsSync(whisperCliPath)) {
        throw new Error(`whisper-cli not found at: ${whisperCliPath}`)
      }
      if (!fs.existsSync(modelPath)) {
        throw new Error(`Model not found at: ${modelPath}`)
      }

      // PHASE 1.3: Optimized batch processing parameters (base.en model for accuracy)
      const args = [
        '-l', 'en',
        '-m', modelPath,
        '-f', audioFilePath,
        '--no-timestamps', // Use same format as streaming for consistency
        '--threads', '2', // OPTIMIZED: Reduced threads for faster startup (vs 4)
        '--processors', '1',
        '--beam-size', '5', // Keep higher beam size for batch accuracy (vs 1 for streaming)
        '--best-of', '2', // OPTIMIZED: Reduced from default 5 for speed
        '--temperature', '0.0' // Deterministic output for consistency
      ]

      console.log(`[RealTimeVoice] Executing optimized batch transcription: ${whisperCliPath} ${args.join(' ')}`)

      return new Promise((resolve) => {
        const startTime = Date.now()
        let isResolved = false
        let timeoutHandle: NodeJS.Timeout | null = null

        const whisperProcess = spawn(whisperCliPath, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: whisperCppDir
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
          console.log(`[RealTimeVoice] Batch whisper-cli finished with code: ${code} (${processingTime}ms)`)

          if (code === 0) {
            // Parse the output to extract clean text
            const text = this.parseWhisperCliOutput(stdout)
            console.log(`[RealTimeVoice] Extracted batch text: "${text}" (processing time: ${processingTime}ms)`)

            if (text && text.trim()) {
              resolveOnce({
                text: text.trim(),
                stdout: stdout,
                processingTime: processingTime
              })
            } else {
              console.log(`[RealTimeVoice] No text extracted from batch whisper-cli output`)
              resolveOnce(null)
            }
          } else {
            console.error(`[RealTimeVoice] Batch whisper-cli failed with code ${code}`)
            console.error(`[RealTimeVoice] stderr: ${stderr}`)
            resolveOnce(null)
          }
        })

        whisperProcess.on('error', (error: any) => {
          console.error(`[RealTimeVoice] Batch whisper-cli spawn error:`, error)
          resolveOnce(null)
        })

        // PHASE 1.3: Optimized timeout for batch processing with proper cleanup
        timeoutHandle = setTimeout(() => {
          if (!isResolved) {
            const timeoutTime = Date.now() - startTime
            whisperProcess.kill('SIGTERM')
            console.warn(`[RealTimeVoice] Batch whisper-cli timeout (${timeoutTime}ms)`)
            resolveOnce(null)
          }
        }, 8000) // Increased to 8 seconds for base.en model (more complex than tiny.en)
      })
    } catch (error) {
      console.error('[RealTimeVoice] Optimized batch transcription error:', error)
      return null
    }
  }

  /**
   * Parse whisper-cli output to extract clean text
   * Now handles --no-timestamps format (same as StreamingAudioProcessor)
   */
  private parseWhisperCliOutput(output: string): string {
    try {
      console.log(`[RealTimeVoice] Raw whisper-cli output: "${output}"`)

      if (!output || !output.trim()) {
        return ''
      }

      // whisper-cli with --no-timestamps outputs text directly to stdout
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
      console.log(`[RealTimeVoice] Filtered lines: ${JSON.stringify(transcriptionLines)}`)
      console.log(`[RealTimeVoice] Parsed ${transcriptionLines.length} lines into: "${extractedText}"`)
      return extractedText
    } catch (error) {
      console.error('[RealTimeVoice] Error parsing whisper-cli output:', error)
      return ''
    }
  }

  /**
   * Process transcription using optimized batch mode
   */
  private async processBatchTranscription(recordingDuration: number): Promise<TranscriptionResult> {
    console.log('[RealTimeVoice] Processing transcription in optimized batch mode...')

    // Create WAV file from accumulated audio chunks
    if (!this.currentFilePath) {
      throw new Error('No audio file path available')
    }

    // Create WAV file from accumulated chunks
    await this.createWavFromChunks()

    // Check if file exists and has content
    const stats = await fs.stat(this.currentFilePath)
    if (stats.size === 0) {
      throw new Error('Audio file is empty')
    }

    console.log(`[RealTimeVoice] Audio file size: ${(stats.size / 1024).toFixed(2)}KB`)

    console.log('[RealTimeVoice] Starting optimized batch transcription...')
    this.emit('transcription-started')

    // Use optimized whisper-cli approach instead of nodejs-whisper for better performance
    const result = await this.transcribeWithOptimizedWhisperCli(this.currentFilePath)

    console.log('[RealTimeVoice] Optimized batch transcription completed')
    console.log('[RealTimeVoice] Raw result:', JSON.stringify(result, null, 2))

    // Parse result from optimized whisper-cli
    let transcriptionResult: TranscriptionResult
    let extractedText = ''

    if (result) {
      // Since we're now using --no-timestamps, the result should have clean text
      if (typeof result.text === 'string') {
        extractedText = result.text.trim()
      }
      // If result has stdout property, parse it using our new parser
      else if (result.stdout && typeof result.stdout === 'string') {
        extractedText = this.parseWhisperCliOutput(result.stdout)
      }
      // Fallback: Result is a string directly
      else if (typeof result === 'string') {
        extractedText = this.parseWhisperCliOutput(result)
      }
      // Legacy: Check if result has segments with text
      else if (result.segments && Array.isArray(result.segments)) {
        extractedText = result.segments.map((seg: any) => seg.text || '').join(' ').trim()
      }
    }

    // The parseWhisperCliOutput method already handles cleanup

    console.log('[RealTimeVoice] Final extracted text:', extractedText)

    if (extractedText && extractedText.length > 0) {
      transcriptionResult = {
        success: true,
        text: extractedText,
        duration: recordingDuration,
        segments: result?.segments || []
      }
    } else {
      transcriptionResult = {
        success: false,
        error: 'No transcription result',
        duration: recordingDuration
      }
    }

    // Emit transcription completed with the result
    this.emit('transcription-completed', transcriptionResult)

    // Cleanup
    await this.cleanup()

    return transcriptionResult
  }

  /**
   * Check if we should stop direct audio capture after voice recording
   * Only stop if no call is active
   */
  private async checkStopAudioCapture(): Promise<void> {
    try {
      // Import AppState to check if call is active
      const appState = require('./AppState').default

      // Don't stop audio capture if a call is active
      const activeCall = appState.getActiveCall()
      if (activeCall.isActive) {
        console.log('[RealTimeVoice] Call is active, keeping audio capture running')
        return
      }

      // Stop direct audio capture since no call is active
      console.log('[RealTimeVoice] Stopping direct audio capture after voice recording')
      await this.stopDirectAudioCapture()
    } catch (error) {
      console.error('[RealTimeVoice] Error checking/stopping direct audio capture:', error)
    }
  }

  /**
   * Cancel recording without transcription
   */
  public async cancelRecording(): Promise<boolean> {
    if (!this.isRecording) {
      return true
    }

    try {
      console.log('[RealTimeVoice] Cancelling recording...')

      // Clear timer
      if (this.recordingTimer) {
        clearTimeout(this.recordingTimer)
        this.recordingTimer = null
      }

      this.isRecording = false
      this.emit('recording-cancelled')

      // Cleanup
      await this.cleanup()

      return true
    } catch (error) {
      console.error('[RealTimeVoice] Error cancelling recording:', error)
      return false
    }
  }

  /**
   * Get current recording status
   */
  public getStatus(): RecordingStatus {
    return {
      isRecording: this.isRecording,
      duration: this.isRecording ? Date.now() - this.recordingStartTime : 0,
      filePath: this.currentFilePath || undefined,
      startTime: this.isRecording ? this.recordingStartTime : undefined
    }
  }

  // Note: Audio analysis and MediaRecorder functionality moved to renderer process
  // This service now focuses on transcription in the main process

  /**
   * Cleanup temporary files and reset state
   */
  private async cleanup(): Promise<void> {
    try {
      // Reset streaming state
      this.isStreamingMode = false
      this.streamingSessionId = null

      // Cleanup file
      if (this.currentFilePath) {
        await fs.unlink(this.currentFilePath).catch(() => {
          // Ignore errors if file doesn't exist
        })
        this.currentFilePath = null
      }

      // Clear accumulated audio chunks
      this.audioChunks = []

      // Check if we should stop AudioCaptureService
      await this.checkStopAudioCapture()
    } catch (error) {
      console.error('[RealTimeVoice] Cleanup error:', error)
    }
  }

  /**
   * Shutdown streaming resources
   */
  public async shutdownStreaming(): Promise<void> {
    try {
      if (this.streamingProcessor) {
        await this.streamingProcessor.stopProcessing()
        this.streamingInitialized = false
        this.streamingProcessor = null
        console.log('[RealTimeVoice] Streaming processor shut down')
      }
    } catch (error) {
      console.error('[RealTimeVoice] Error shutting down streaming:', error)
    }
  }

  /**
   * Cleanup old temporary files
   */
  public async cleanupOldFiles(maxAgeMs: number = 3600000): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir)
      const now = Date.now()

      for (const file of files) {
        if (file.startsWith('realtime-voice-') && (file.endsWith('.webm') || file.endsWith('.wav'))) {
          const filePath = path.join(this.tempDir, file)
          const stats = await fs.stat(filePath)

          if (now - stats.mtime.getTime() > maxAgeMs) {
            await fs.unlink(filePath)
            console.log('[RealTimeVoice] Cleaned up old file:', file)
          }
        }
      }
    } catch (error) {
      console.error('[RealTimeVoice] Error cleaning up old files:', error)
    }
  }
}

export default RealTimeVoiceService
export { RealTimeVoiceOptions, AudioAnalysisData }

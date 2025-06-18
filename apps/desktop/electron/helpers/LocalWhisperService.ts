/**
 * LocalWhisperService.ts
 *
 * Privacy-first voice-to-text service using OpenAI's Whisper technology via nodejs-whisper.
 * Handles local audio recording, transcription, and cleanup for voice queries.
 * All processing happens locally without sending data to external servers.
 */

import { EventEmitter } from 'events'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { v4 as uuidv4 } from 'uuid'

// Lazy load the recording libraries to avoid startup timeout
let record: any = null
let nodewhisper: any = null

const loadModules = () => {
  if (!record) {
    record = require('node-record-lpcm16')
  }
  if (!nodewhisper) {
    const whisperModule = require('nodejs-whisper')
    nodewhisper = whisperModule.nodewhisper
  }
}

interface LocalWhisperOptions {
  modelName?: 'tiny.en' | 'base.en' | 'small.en'
  maxDuration?: number // milliseconds
  language?: string
  wordTimestamps?: boolean
}

interface TranscriptionResult {
  success: boolean
  text?: string
  segments?: TranscriptionSegment[]
  error?: string
  duration?: number // recording duration in seconds
}

interface TranscriptionSegment {
  text: string
  start: number // seconds
  end: number // seconds
  confidence?: number
}

interface RecordingStatus {
  isRecording: boolean
  duration: number // milliseconds
  filePath?: string
  startTime?: number
}

class LocalWhisperService extends EventEmitter {
  private static instance: LocalWhisperService
  private isRecording: boolean = false
  private recordingProcess: any = null
  private writeStream: any = null
  private currentFilePath: string | null = null
  private recordingStartTime: number = 0
  private recordingTimer: NodeJS.Timeout | null = null
  private emergencyTimer: NodeJS.Timeout | null = null
  private monitoringTimer: NodeJS.Timeout | null = null
  private tempDir: string
  private options: LocalWhisperOptions

  private constructor() {
    super()
    this.tempDir = path.join(os.tmpdir(), 'closezly-voice')
    this.options = {
      modelName: 'base.en',
      maxDuration: 60000, // 60 seconds - increased for safety
      language: 'en',
      wordTimestamps: true
    }
    this.ensureTempDir()
  }

  public static getInstance(): LocalWhisperService {
    if (!LocalWhisperService.instance) {
      LocalWhisperService.instance = new LocalWhisperService()
    }
    return LocalWhisperService.instance
  }

  /**
   * Ensure temporary directory exists
   */
  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true })
    } catch (error) {
      console.error('[LocalWhisper] Failed to create temp directory:', error)
    }
  }

  /**
   * Start voice recording
   */
  public async startRecording(options: LocalWhisperOptions = {}): Promise<boolean> {
    if (this.isRecording) {
      console.warn('[LocalWhisper] Already recording, ignoring start request')
      return false
    }

    try {
      // Load modules on first use
      loadModules()

      // Merge options with defaults
      this.options = { ...this.options, ...options }

      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `voice-${timestamp}-${uuidv4().slice(0, 8)}.wav`
      this.currentFilePath = path.join(this.tempDir, filename)

      // Ensure temp directory exists
      await this.ensureTempDir()

      // Configure recording options with hard limits
      const maxDurationSeconds = Math.ceil((this.options.maxDuration || 60000) / 1000)
      const recordingOptions = {
        sampleRate: 16000,
        channels: 1,
        compress: false,
        threshold: 0.5,
        thresholdStart: null,
        thresholdEnd: null,
        silence: '1.0',
        verbose: true, // Enable verbose logging for debugging
        recordProgram: 'sox', // Use sox for better cross-platform support
        // Add hard duration limit at sox level
        additionalOptions: [`trim 0 ${maxDurationSeconds}`]
      }

      console.log('[LocalWhisper] Recording options:', recordingOptions)
      console.log('[LocalWhisper] Max duration:', maxDurationSeconds, 'seconds')

      console.log('[LocalWhisper] Starting recording to:', this.currentFilePath)

      // Start recording with aggressive monitoring
      console.log('[LocalWhisper] Creating recording process with options:', recordingOptions)
      this.recordingProcess = record.record(recordingOptions)

      // Create write stream with explicit options
      this.writeStream = require('fs').createWriteStream(this.currentFilePath, {
        flags: 'w',
        autoClose: true,
        emitClose: true
      })

      // Add stream error handling
      this.writeStream.on('error', (error: any) => {
        console.error('[LocalWhisper] Write stream error:', error)
        // Don't force stop on write errors, just log them
      })

      this.writeStream.on('close', () => {
        console.log('[LocalWhisper] Write stream closed')
      })

      // Pipe to file with error handling
      const recordingStream = this.recordingProcess.stream()
      recordingStream.on('error', (error: any) => {
        console.error('[LocalWhisper] Recording stream error:', error)
        // Don't force stop on stream errors, just log them
      })

      // Note: node-record-lpcm16 doesn't expose an 'on' method directly on the recording process
      // Error handling is done through the stream instead

      recordingStream.pipe(this.writeStream)
      console.log('[LocalWhisper] Recording stream piped to file')

      // Set recording state
      this.isRecording = true
      this.recordingStartTime = Date.now()

      // Set up multiple safety timers
      if (this.options.maxDuration) {
        // Primary auto-stop timer
        this.recordingTimer = setTimeout(() => {
          console.log('[LocalWhisper] Auto-stopping recording due to max duration')
          this.stopRecording()
        }, this.options.maxDuration)

        // Emergency stop timer (2x max duration)
        this.emergencyTimer = setTimeout(() => {
          console.error('[LocalWhisper] EMERGENCY STOP - Recording exceeded 2x max duration!')
          this.forceStopRecording()
        }, this.options.maxDuration * 2)

        // Monitoring timer - check every 10 seconds
        this.monitoringTimer = setInterval(() => {
          this.monitorRecording()
        }, 10000)
      }

      // Handle recording events
      this.recordingProcess.stream().on('error', (error: Error) => {
        console.error('[LocalWhisper] Recording error:', error)
        this.emit('recording-error', error)
        this.cleanup()
      })

      this.writeStream.on('error', (error: Error) => {
        console.error('[LocalWhisper] Write stream error:', error)
        this.emit('recording-error', error)
        this.cleanup()
      })

      this.emit('recording-started')
      console.log('[LocalWhisper] Recording started successfully')
      return true

    } catch (error) {
      console.error('[LocalWhisper] Failed to start recording:', error)
      this.emit('recording-error', error)
      this.cleanup()
      return false
    }
  }

  /**
   * Stop recording and transcribe
   */
  public async stopRecording(): Promise<TranscriptionResult> {
    if (!this.isRecording) {
      console.warn('[LocalWhisper] Not recording, ignoring stop request')
      return { success: false, error: 'Not recording' }
    }

    try {
      console.log('[LocalWhisper] Stopping recording...')

      // Stop recording with aggressive cleanup
      console.log('[LocalWhisper] Stopping recording process...')
      if (this.recordingProcess) {
        try {
          // Stop the recording process
          this.recordingProcess.stop()
          console.log('[LocalWhisper] Recording process stopped')
        } catch (error) {
          console.error('[LocalWhisper] Error stopping recording process:', error)
        }
        this.recordingProcess = null
      }

      // Close write stream
      if (this.writeStream) {
        try {
          this.writeStream.end()
          this.writeStream.destroy()
          console.log('[LocalWhisper] Write stream closed and destroyed')
        } catch (error) {
          console.error('[LocalWhisper] Error closing write stream:', error)
        }
        this.writeStream = null
      }

      // Clear all timers
      if (this.recordingTimer) {
        clearTimeout(this.recordingTimer)
        this.recordingTimer = null
      }
      if (this.emergencyTimer) {
        clearTimeout(this.emergencyTimer)
        this.emergencyTimer = null
      }
      if (this.monitoringTimer) {
        clearInterval(this.monitoringTimer)
        this.monitoringTimer = null
      }

      const recordingDuration = (Date.now() - this.recordingStartTime) / 1000
      this.isRecording = false

      this.emit('recording-stopped', { duration: recordingDuration })

      // Wait a moment for file to be fully written
      await new Promise(resolve => setTimeout(resolve, 500))

      // Check if file exists and has content
      if (!this.currentFilePath) {
        throw new Error('No recording file path')
      }

      const stats = await fs.stat(this.currentFilePath)
      if (stats.size === 0) {
        throw new Error('Recording file is empty')
      }

      // Check file size before transcription
      const fileSizeMB = stats.size / (1024 * 1024)
      console.log(`[LocalWhisper] File size: ${fileSizeMB.toFixed(2)}MB`)

      if (fileSizeMB > 100) { // 100MB absolute limit
        throw new Error(`Recording file too large: ${fileSizeMB.toFixed(2)}MB (max 100MB)`)
      }

      if (fileSizeMB > 10) { // Warn for files over 10MB
        console.warn(`[LocalWhisper] Large file detected: ${fileSizeMB.toFixed(2)}MB - transcription may be slow`)
      }

      console.log('[LocalWhisper] Starting transcription...')
      this.emit('transcription-started')

      // Fix WAV file header before transcription
      await this.fixWavFileHeader(this.currentFilePath)

      // Transcribe with nodejs-whisper
      const transcriptionOptions = {
        modelName: this.options.modelName,
        whisperOptions: {
          language: this.options.language,
          word_timestamps: this.options.wordTimestamps,
          output_format: 'json'
        }
      }

      const result = await nodewhisper(this.currentFilePath, transcriptionOptions)

      console.log('[LocalWhisper] Transcription completed')
      console.log('[LocalWhisper] Raw result:', JSON.stringify(result, null, 2))
      this.emit('transcription-completed')

      // Parse result - nodejs-whisper returns different formats
      let transcriptionResult: TranscriptionResult

      // Try different result formats
      let extractedText = ''

      if (result) {
        // Format 1: Direct text property
        if (typeof result.text === 'string') {
          extractedText = result.text.trim()
        }
        // Format 2: Result is a string directly
        else if (typeof result === 'string') {
          extractedText = result.trim()
        }
        // Format 3: Check if result has segments with text
        else if (result.segments && Array.isArray(result.segments)) {
          extractedText = result.segments.map((seg: any) => seg.text || '').join(' ').trim()
        }
        // Format 4: Check stdout property (common in nodejs-whisper)
        else if (result.stdout && typeof result.stdout === 'string') {
          // Extract text from stdout, removing timestamps and cleaning up
          const lines = result.stdout.split('\n')
          const textLines = lines.filter((line: string) =>
            line.includes('-->') && line.includes(']')
          ).map((line: string) => {
            // Extract text after the timestamp bracket and clean it up
            const match = line.match(/\]\s*(.+)$/)
            if (match) {
              return match[1].trim()
                .replace(/^\s+|\s+$/g, '') // Remove leading/trailing whitespace
                .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
            }
            return ''
          }).filter((text: string) => text.length > 0)

          extractedText = textLines.join(' ').trim()
        }
      }

      console.log('[LocalWhisper] Extracted text:', extractedText)

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

      // Cleanup
      await this.cleanup()

      return transcriptionResult

    } catch (error) {
      console.error('[LocalWhisper] Error during stop/transcription:', error)
      await this.cleanup()
      return {
        success: false,
        error: (error as Error).message,
        duration: this.isRecording ? (Date.now() - this.recordingStartTime) / 1000 : 0
      }
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
      console.log('[LocalWhisper] Cancelling recording...')

      // Stop recording
      if (this.recordingProcess) {
        try {
          this.recordingProcess.stop()
          console.log('[LocalWhisper] Recording process cancelled')
        } catch (error) {
          console.error('[LocalWhisper] Error cancelling recording process:', error)
        }
        this.recordingProcess = null
      }

      // Close write stream
      if (this.writeStream) {
        try {
          this.writeStream.end()
          this.writeStream.destroy()
          console.log('[LocalWhisper] Write stream cancelled and destroyed')
        } catch (error) {
          console.error('[LocalWhisper] Error cancelling write stream:', error)
        }
        this.writeStream = null
      }

      // Clear all timers
      if (this.recordingTimer) {
        clearTimeout(this.recordingTimer)
        this.recordingTimer = null
      }
      if (this.emergencyTimer) {
        clearTimeout(this.emergencyTimer)
        this.emergencyTimer = null
      }
      if (this.monitoringTimer) {
        clearInterval(this.monitoringTimer)
        this.monitoringTimer = null
      }

      this.isRecording = false
      this.emit('recording-cancelled')

      // Cleanup
      await this.cleanup()

      return true
    } catch (error) {
      console.error('[LocalWhisper] Error cancelling recording:', error)
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

  /**
   * Fix WAV file header to ensure correct duration metadata
   */
  private async fixWavFileHeader(filePath: string): Promise<void> {
    try {
      const buffer = await fs.readFile(filePath)

      // Check if it's a valid WAV file
      if (buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF') {
        console.warn('[LocalWhisper] Not a valid WAV file, skipping header fix')
        return
      }

      // Calculate correct file size
      const fileSize = buffer.length
      const dataSize = fileSize - 44 // Subtract WAV header size

      // Update file size in RIFF header (bytes 4-7)
      buffer.writeUInt32LE(fileSize - 8, 4)

      // Find and update data chunk size
      let dataChunkPos = 36
      while (dataChunkPos < buffer.length - 8) {
        const chunkId = buffer.toString('ascii', dataChunkPos, dataChunkPos + 4)
        if (chunkId === 'data') {
          // Update data chunk size (bytes after 'data' identifier)
          buffer.writeUInt32LE(dataSize, dataChunkPos + 4)
          break
        }
        // Move to next chunk
        const chunkSize = buffer.readUInt32LE(dataChunkPos + 4)
        dataChunkPos += 8 + chunkSize
      }

      // Write the corrected buffer back to file
      await fs.writeFile(filePath, buffer)

      // Calculate and log the corrected duration
      const sampleRate = buffer.readUInt32LE(24) // Sample rate is at byte 24
      const channels = buffer.readUInt16LE(22) // Channels at byte 22
      const bitsPerSample = buffer.readUInt16LE(34) // Bits per sample at byte 34
      const bytesPerSample = (bitsPerSample / 8) * channels
      const durationSeconds = dataSize / (sampleRate * bytesPerSample)

      console.log(`[LocalWhisper] WAV header fixed - Duration: ${durationSeconds.toFixed(2)}s, Size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`)

    } catch (error) {
      console.error('[LocalWhisper] Error fixing WAV header:', error)
      // Don't throw - continue with transcription even if header fix fails
    }
  }

  /**
   * Monitor recording and check for issues
   */
  private async monitorRecording(): Promise<void> {
    if (!this.isRecording) {
      return
    }

    const currentDuration = Date.now() - this.recordingStartTime
    console.log(`[LocalWhisper] Recording monitor: ${Math.round(currentDuration / 1000)}s elapsed`)

    // Check if recording has exceeded reasonable limits
    if (currentDuration > 120000) { // 2 minutes absolute maximum
      console.error('[LocalWhisper] Recording exceeded 2 minutes - force stopping!')
      this.forceStopRecording()
      return
    }

    // Check file size if it exists
    if (this.currentFilePath) {
      try {
        const stats = await fs.stat(this.currentFilePath)
        const fileSizeMB = stats.size / (1024 * 1024)
        console.log(`[LocalWhisper] Current file size: ${fileSizeMB.toFixed(2)}MB`)

        // If file is getting too large, stop recording
        if (fileSizeMB > 50) { // 50MB limit
          console.error('[LocalWhisper] File size exceeded 50MB - force stopping!')
          this.forceStopRecording()
        }
      } catch (error) {
        console.error('[LocalWhisper] Error checking file size:', error)
      }
    }
  }

  /**
   * Force stop recording with aggressive cleanup
   */
  private async forceStopRecording(): Promise<void> {
    console.error('[LocalWhisper] FORCE STOPPING RECORDING')

    try {
      // Clear all timers immediately
      if (this.recordingTimer) {
        clearTimeout(this.recordingTimer)
        this.recordingTimer = null
      }
      if (this.emergencyTimer) {
        clearTimeout(this.emergencyTimer)
        this.emergencyTimer = null
      }
      if (this.monitoringTimer) {
        clearInterval(this.monitoringTimer)
        this.monitoringTimer = null
      }

      // Force stop recording process
      if (this.recordingProcess) {
        try {
          this.recordingProcess.stop()
          this.recordingProcess.kill && this.recordingProcess.kill('SIGKILL')
        } catch (error) {
          console.error('[LocalWhisper] Error force stopping process:', error)
        }
        this.recordingProcess = null
      }

      // Force close write stream
      if (this.writeStream) {
        try {
          this.writeStream.end()
          this.writeStream.destroy()
          console.log('[LocalWhisper] Write stream force closed')
        } catch (error) {
          console.error('[LocalWhisper] Error force closing write stream:', error)
        }
        this.writeStream = null
      }

      this.isRecording = false
      this.emit('recording-error', new Error('Recording force stopped due to safety limits'))

      // Cleanup file
      await this.cleanup()

    } catch (error) {
      console.error('[LocalWhisper] Error in force stop:', error)
    }
  }

  /**
   * Cleanup temporary files and reset state
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.currentFilePath) {
        await fs.unlink(this.currentFilePath).catch(() => {
          // Ignore errors if file doesn't exist
        })
        this.currentFilePath = null
      }
    } catch (error) {
      console.error('[LocalWhisper] Cleanup error:', error)
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
        if (file.startsWith('voice-') && file.endsWith('.wav')) {
          const filePath = path.join(this.tempDir, file)
          const stats = await fs.stat(filePath)
          
          if (now - stats.mtime.getTime() > maxAgeMs) {
            await fs.unlink(filePath)
            console.log('[LocalWhisper] Cleaned up old file:', file)
          }
        }
      }
    } catch (error) {
      console.error('[LocalWhisper] Error cleaning up old files:', error)
    }
  }
}

export default LocalWhisperService
export { LocalWhisperOptions, TranscriptionResult, TranscriptionSegment, RecordingStatus }

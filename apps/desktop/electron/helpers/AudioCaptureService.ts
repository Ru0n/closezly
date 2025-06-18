/**
 * AudioCaptureService.ts
 *
 * Manages audio capture for the Closezly desktop application.
 * Handles microphone capture and system audio capture (where supported).
 * Provides audio chunking and streaming capabilities for real-time transcription.
 *
 * Note: This service coordinates audio capture through the renderer process
 * since audio APIs are only available in the renderer context.
 */

import { EventEmitter } from 'events'
import { app, BrowserWindow, systemPreferences } from 'electron'
import AppState from './AppState'

interface AudioChunk {
  data: Buffer
  timestamp: number
  source: 'microphone' | 'system'
}

interface AudioCaptureOptions {
  sampleRate?: number
  channels?: number
  chunkDuration?: number // in milliseconds
  enableVAD?: boolean
  vadSensitivity?: 'low' | 'medium' | 'high'
  onAudioChunk?: (chunk: Buffer) => void
}

class AudioCaptureService extends EventEmitter {
  private static instance: AudioCaptureService
  private isCapturing: boolean = false
  private captureWindow: BrowserWindow | null = null
  private options: AudioCaptureOptions
  private onAudioChunkCallback: ((chunk: Buffer) => void) | null = null
  private audioBuffer: AudioChunk[] = []
  private maxBufferDuration: number = 30000 // 30 seconds in milliseconds

  private constructor() {
    super()
    this.options = {
      sampleRate: 16000,
      channels: 1,
      chunkDuration: 250,
      enableVAD: true,
      vadSensitivity: 'medium'
    }
  }

  public static getInstance(): AudioCaptureService {
    if (!AudioCaptureService.instance) {
      AudioCaptureService.instance = new AudioCaptureService()
    }
    return AudioCaptureService.instance
  }

  public async startCapture(options: AudioCaptureOptions = {}): Promise<boolean> {
    if (this.isCapturing) {
      console.log('[AudioCapture] Already capturing audio')
      return true
    }

    try {
      console.log('[AudioCapture] Starting audio capture...')
      this.options = { ...this.options, ...options }
      this.onAudioChunkCallback = this.options.onAudioChunk || null

      await this.ensureCaptureWindow()

      const hasPermissions = await this.checkPermissions()
      if (!hasPermissions) {
        throw new Error('Microphone permissions denied. Please grant microphone access in system settings.')
      }

      if (this.captureWindow) {
        await this.captureWindow.webContents.executeJavaScript(`
          window.postMessage({
            type: 'start-audio-capture',
            options: ${JSON.stringify(this.options)}
          }, '*');
        `)
      }

      this.isCapturing = true
      console.log('[AudioCapture] Audio capture started successfully')
      this.emit('capture-started', { microphone: true, system: false })

      return true
    } catch (error: any) {
      console.error('[AudioCapture] Error starting capture:', error)
      this.emit('capture-error', error)
      throw new Error(`Audio capture failed: ${error.message}`)
    }
  }

  private async checkPermissions(): Promise<boolean> {
    if (process.platform !== 'darwin') {
      console.log('[AudioCapture] Non-macOS platform, assuming microphone access available')
      return true
    }

    const micStatus = systemPreferences.getMediaAccessStatus('microphone')
    console.log(`[AudioCapture] macOS microphone permission status: ${micStatus}`)

    if (micStatus === 'granted') {
      return true
    }

    if (micStatus === 'not-determined') {
      console.log('[AudioCapture] Requesting microphone permission...')
      return await systemPreferences.askForMediaAccess('microphone')
    }

    return false
  }

  public async stopCapture(): Promise<void> {
    if (!this.isCapturing) {
      return
    }

    console.log('[AudioCapture] Stopping audio capture...')

    try {
      if (this.captureWindow && !this.captureWindow.isDestroyed()) {
        await this.captureWindow.webContents.executeJavaScript(`
          window.postMessage({
            type: 'stop-audio-capture'
          }, '*');
        `)
      }

      this.isCapturing = false
      this.onAudioChunkCallback = null
      console.log('[AudioCapture] Stopped audio capture')
      this.emit('capture-stopped')
    } catch (error: any) {
      console.error('[AudioCapture] Error stopping capture:', error)
      this.emit('capture-error', error)
    }
  }

  private async ensureCaptureWindow(): Promise<void> {
    const mainWindow = AppState.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      this.captureWindow = mainWindow
      console.log('[AudioCapture] Using main window for audio capture')
      return
    }
    throw new Error('Main window not available for audio capture')
  }

  public handleAudioChunk(chunk: AudioChunk): void {
    if (this.onAudioChunkCallback && chunk.source === 'microphone') {
      this.onAudioChunkCallback(chunk.data)
    }

    // Add chunk to buffer for recent audio retrieval
    this.addToBuffer(chunk)

    // Forward microphone chunks to RealTimeVoiceService if it's recording
    if (chunk.source === 'microphone') {
      this.forwardToRealTimeVoiceService(chunk.data)
    }

    this.emit('audio-chunk', chunk)
  }

  /**
   * Forward audio chunk to RealTimeVoiceService if it's currently recording
   */
  private forwardToRealTimeVoiceService(audioData: Buffer): void {
    try {
      // Import RealTimeVoiceService dynamically to avoid circular dependencies
      const RealTimeVoiceService = require('./RealTimeVoiceService').default
      const voiceService = RealTimeVoiceService.getInstance()

      // Only forward if RealTimeVoiceService is actively recording
      const status = voiceService.getStatus()
      if (status && status.isRecording) {
        voiceService.receiveAudioData(audioData)
      }
    } catch (error) {
      // Silently ignore errors to avoid breaking audio capture
      // This can happen if RealTimeVoiceService is not available
    }
  }

  /**
   * Add audio chunk to the circular buffer
   */
  private addToBuffer(chunk: AudioChunk): void {
    this.audioBuffer.push(chunk)

    // Remove old chunks that exceed the max buffer duration
    const cutoffTime = Date.now() - this.maxBufferDuration
    this.audioBuffer = this.audioBuffer.filter(bufferedChunk => bufferedChunk.timestamp > cutoffTime)
  }

  /**
   * Get the current capture status
   */
  public getCaptureStatus(): { isCapturing: boolean; hasMicrophone: boolean; hasSystemAudio: boolean } {
    return {
      isCapturing: this.isCapturing,
      hasMicrophone: true, // We assume microphone is available if permissions are granted
      hasSystemAudio: false // System audio capture not currently implemented
    }
  }

  /**
   * Get recent audio data from the buffer
   * @param durationMs Duration in milliseconds to retrieve from the buffer
   * @returns Audio data with base64 encoded data and mime type, or undefined if no audio available
   */
  public getRecentAudio(durationMs: number): { data: string; mimeType: string } | undefined {
    if (this.audioBuffer.length === 0) {
      return undefined
    }

    const cutoffTime = Date.now() - durationMs
    const recentChunks = this.audioBuffer.filter(chunk =>
      chunk.timestamp > cutoffTime && chunk.source === 'microphone'
    )

    if (recentChunks.length === 0) {
      return undefined
    }

    // Combine all recent audio chunks
    const totalLength = recentChunks.reduce((sum, chunk) => sum + chunk.data.length, 0)
    const combinedBuffer = Buffer.alloc(totalLength)

    let offset = 0
    for (const chunk of recentChunks) {
      chunk.data.copy(combinedBuffer, offset)
      offset += chunk.data.length
    }

    // Return as base64 encoded data with appropriate mime type
    return {
      data: combinedBuffer.toString('base64'),
      mimeType: 'audio/wav' // Assuming WAV format for now
    }
  }
}

export default AudioCaptureService.getInstance()
export type { AudioChunk, AudioCaptureOptions }

/**
 * VoiceQueryService.ts
 *
 * Simple voice query service for handling voice input to AI queries.
 * This is separate from the call recording functionality and focuses
 * on short voice queries that get transcribed to text.
 */

import { EventEmitter } from 'events'
import { BrowserWindow } from 'electron'
import AppState from './AppState'

interface VoiceQueryOptions {
  maxDuration?: number // Maximum recording duration in milliseconds
  language?: string // Language for speech recognition
}

interface VoiceQueryResult {
  success: boolean
  transcription?: string
  confidence?: number
  error?: string
}

class VoiceQueryService extends EventEmitter {
  private static instance: VoiceQueryService
  private isRecording: boolean = false
  private mainWindow: BrowserWindow | null = null
  private recordingStartTime: number = 0
  private maxDuration: number = 30000 // 30 seconds max
  private recordingTimeout: NodeJS.Timeout | null = null

  private constructor() {
    super()
  }

  public static getInstance(): VoiceQueryService {
    if (!VoiceQueryService.instance) {
      VoiceQueryService.instance = new VoiceQueryService()
    }
    return VoiceQueryService.instance
  }

  /**
   * Start recording voice query
   */
  public async startVoiceQuery(options: VoiceQueryOptions = {}): Promise<boolean> {
    if (this.isRecording) {
      console.warn('[VoiceQuery] Already recording, ignoring start request')
      return false
    }

    try {
      console.log('[VoiceQuery] Starting voice query recording...')
      
      this.maxDuration = options.maxDuration || 30000
      this.mainWindow = AppState.getMainWindow()
      
      if (!this.mainWindow) {
        throw new Error('Main window not available')
      }

      // Check microphone permissions first
      const hasPermission = await this.checkMicrophonePermission()
      if (!hasPermission) {
        throw new Error('Microphone permission not granted')
      }

      // Start recording in renderer process
      const result = await this.mainWindow.webContents.executeJavaScript(`
        (async () => {
          try {
            // Check if we already have a stream
            if (window.voiceQueryStream) {
              window.voiceQueryStream.getTracks().forEach(track => track.stop())
            }

            // Get microphone access
            window.voiceQueryStream = await navigator.mediaDevices.getUserMedia({ 
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 16000
              } 
            })

            // Start speech recognition
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
              const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
              window.voiceQueryRecognition = new SpeechRecognition()
              window.voiceQueryRecognition.continuous = true
              window.voiceQueryRecognition.interimResults = true
              window.voiceQueryRecognition.lang = '${options.language || 'en-US'}'
              
              window.voiceQueryRecognition.onresult = (event) => {
                let finalTranscript = ''
                let interimTranscript = ''
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                  const transcript = event.results[i][0].transcript
                  if (event.results[i].isFinal) {
                    finalTranscript += transcript
                  } else {
                    interimTranscript += transcript
                  }
                }
                
                // Send interim results for real-time feedback
                if (interimTranscript) {
                  window.postMessage({
                    type: 'voice-query-interim',
                    transcript: interimTranscript
                  }, '*')
                }
                
                // Send final results
                if (finalTranscript) {
                  window.postMessage({
                    type: 'voice-query-result',
                    transcript: finalTranscript,
                    confidence: event.results[event.resultIndex][0].confidence
                  }, '*')
                }
              }
              
              window.voiceQueryRecognition.onerror = (event) => {
                window.postMessage({
                  type: 'voice-query-error',
                  error: event.error
                }, '*')
              }
              
              window.voiceQueryRecognition.start()
            }

            return { success: true }
          } catch (error) {
            return { success: false, error: error.message }
          }
        })()
      `)

      if (!result.success) {
        throw new Error(result.error || 'Failed to start voice recording')
      }

      this.isRecording = true
      this.recordingStartTime = Date.now()
      
      // Set up auto-stop timer
      this.recordingTimeout = setTimeout(() => {
        console.log('[VoiceQuery] Auto-stopping recording after max duration')
        this.stopVoiceQuery()
      }, this.maxDuration)

      // Listen for messages from renderer
      this.setupRendererListeners()

      this.emit('recording-started')
      console.log('[VoiceQuery] Voice query recording started successfully')
      
      return true
    } catch (error) {
      console.error('[VoiceQuery] Error starting voice query:', error)
      this.emit('recording-error', error)
      return false
    }
  }

  /**
   * Stop recording voice query
   */
  public async stopVoiceQuery(): Promise<VoiceQueryResult> {
    if (!this.isRecording) {
      console.warn('[VoiceQuery] Not recording, ignoring stop request')
      return { success: false, error: 'Not recording' }
    }

    try {
      console.log('[VoiceQuery] Stopping voice query recording...')

      if (this.recordingTimeout) {
        clearTimeout(this.recordingTimeout)
        this.recordingTimeout = null
      }

      if (this.mainWindow) {
        // Stop recording in renderer process
        await this.mainWindow.webContents.executeJavaScript(`
          (async () => {
            try {
              // Stop speech recognition
              if (window.voiceQueryRecognition) {
                window.voiceQueryRecognition.stop()
                window.voiceQueryRecognition = null
              }

              // Stop media stream
              if (window.voiceQueryStream) {
                window.voiceQueryStream.getTracks().forEach(track => track.stop())
                window.voiceQueryStream = null
              }

              return { success: true }
            } catch (error) {
              return { success: false, error: error.message }
            }
          })()
        `)
      }

      this.isRecording = false
      const duration = Date.now() - this.recordingStartTime
      
      this.emit('recording-stopped', { duration })
      console.log(`[VoiceQuery] Voice query recording stopped after ${duration}ms`)
      
      return { success: true }
    } catch (error) {
      console.error('[VoiceQuery] Error stopping voice query:', error)
      this.isRecording = false
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Check if currently recording
   */
  public isRecordingActive(): boolean {
    return this.isRecording
  }

  /**
   * Get recording duration in milliseconds
   */
  public getRecordingDuration(): number {
    if (!this.isRecording) return 0
    return Date.now() - this.recordingStartTime
  }

  /**
   * Check microphone permission
   */
  private async checkMicrophonePermission(): Promise<boolean> {
    if (!this.mainWindow) return false

    try {
      const result = await this.mainWindow.webContents.executeJavaScript(`
        (async () => {
          try {
            const permission = await navigator.permissions.query({ name: 'microphone' })
            return { granted: permission.state === 'granted' }
          } catch (error) {
            // Fallback: try to access microphone directly
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
              stream.getTracks().forEach(track => track.stop())
              return { granted: true }
            } catch (e) {
              return { granted: false }
            }
          }
        })()
      `)

      return result.granted
    } catch (error) {
      console.warn('[VoiceQuery] Could not check microphone permission:', error)
      return false
    }
  }

  /**
   * Setup listeners for messages from renderer process
   */
  private setupRendererListeners(): void {
    if (!this.mainWindow) return

    // Remove existing listeners to avoid duplicates
    this.mainWindow.webContents.removeAllListeners('console-message')

    this.mainWindow.webContents.on('console-message', (event, level, message) => {
      if (message.startsWith('VOICE_QUERY:')) {
        try {
          const data = JSON.parse(message.replace('VOICE_QUERY:', ''))
          this.handleRendererMessage(data)
        } catch (error) {
          console.warn('[VoiceQuery] Failed to parse renderer message:', error)
        }
      }
    })

    // Also listen for postMessage events
    this.mainWindow.webContents.executeJavaScript(`
      window.addEventListener('message', (event) => {
        if (event.data.type && event.data.type.startsWith('voice-query-')) {
          console.log('VOICE_QUERY:' + JSON.stringify(event.data))
        }
      })
    `)
  }

  /**
   * Handle messages from renderer process
   */
  private handleRendererMessage(data: any): void {
    switch (data.type) {
      case 'voice-query-interim':
        this.emit('interim-result', data.transcript)
        break
      case 'voice-query-result':
        this.emit('final-result', {
          transcript: data.transcript,
          confidence: data.confidence
        })
        break
      case 'voice-query-error':
        console.error('[VoiceQuery] Speech recognition error:', data.error)
        this.emit('recording-error', new Error(data.error))
        this.stopVoiceQuery()
        break
    }
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.isRecording) {
      this.stopVoiceQuery()
    }
    
    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout)
      this.recordingTimeout = null
    }

    this.removeAllListeners()
  }
}

export default VoiceQueryService.getInstance()

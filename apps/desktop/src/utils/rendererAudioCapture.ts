/**
 * rendererAudioCapture.ts
 *
 * Renderer-side audio capture implementation for the Closezly desktop app.
 * This handles the actual browser audio APIs since they're only available in the renderer process.
 * Communicates with the main process AudioCaptureService via IPC.
 * Includes Voice Activity Detection (VAD) for smart audio processing.
 */

import VADProcessor, { VADResult } from './VADProcessor'

interface AudioCaptureOptions {
  sampleRate?: number
  channels?: number
  chunkDuration?: number
  enableVAD?: boolean
  vadSensitivity?: 'low' | 'medium' | 'high'
}

interface AudioChunk {
  data: ArrayBuffer
  timestamp: number
  source: 'microphone' | 'system'
  vadResult?: VADResult
}

class RendererAudioCapture {
  private static instance: RendererAudioCapture
  private isCapturing: boolean = false
  private microphoneStream: MediaStream | null = null
  private systemAudioStream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private microphoneProcessor: AudioWorkletNode | ScriptProcessorNode | null = null
  private systemAudioProcessor: AudioWorkletNode | ScriptProcessorNode | null = null
  private vadProcessor: VADProcessor | null = null
  private vadEnabled: boolean = false
  private vadUpdateInterval: number | null = null
  private useAudioWorklet: boolean = false

  private constructor() {
    // Listen for IPC messages from main process
    this.setupIpcListeners()
  }

  public static getInstance(): RendererAudioCapture {
    if (!RendererAudioCapture.instance) {
      RendererAudioCapture.instance = new RendererAudioCapture()
    }
    return RendererAudioCapture.instance
  }

  /**
   * Sets up IPC listeners for communication with main process
   */
  private setupIpcListeners(): void {
    // Listen for start audio capture requests
    window.addEventListener('message', (event) => {
      if (event.data.type === 'start-audio-capture') {
        this.handleStartCapture(event.data.options)
          .then(result => {
            window.postMessage({
              type: 'start-audio-capture-response',
              result
            }, '*')
          })
      } else if (event.data.type === 'stop-audio-capture') {
        this.handleStopCapture()
          .then(result => {
            window.postMessage({
              type: 'stop-audio-capture-response',
              result
            }, '*')
          })
      } else if (event.data.type === 'check-microphone-permissions') {
        this.checkMicrophonePermissions()
          .then(result => {
            window.postMessage({
              type: 'check-microphone-permissions-response',
              result
            }, '*')
          })
      } else if (event.data.type === 'request-microphone-permissions') {
        this.requestMicrophonePermissions()
          .then(result => {
            window.postMessage({
              type: 'request-microphone-permissions-response',
              result
            }, '*')
          })
      } else if (event.data.type === 'get-audio-devices') {
        this.getAudioInputDevices()
          .then(result => {
            window.postMessage({
              type: 'get-audio-devices-response',
              result
            }, '*')
          })
      }
    })
  }

  /**
   * Loads the AudioWorklet processor with fallback to ScriptProcessorNode
   */
  private async loadAudioWorklet(): Promise<void> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized')
    }

    // Check if AudioWorklet is supported
    if (!this.audioContext.audioWorklet) {
      console.warn('[RendererAudio] AudioWorklet not supported, falling back to ScriptProcessorNode')
      this.useAudioWorklet = false
      return
    }

    try {
      // Load the AudioWorklet processor
      const workletUrl = new URL('./audio-processor-worklet.js', import.meta.url)
      await this.audioContext.audioWorklet.addModule(workletUrl.href)
      this.useAudioWorklet = true
      console.log('[RendererAudio] AudioWorklet processor loaded successfully')
    } catch (error) {
      console.warn('[RendererAudio] Failed to load AudioWorklet processor, falling back to ScriptProcessorNode:', error)
      this.useAudioWorklet = false
    }
  }

  /**
   * Handles start capture request from main process
   */
  private async handleStartCapture(options: AudioCaptureOptions): Promise<any> {
    if (this.isCapturing) {
      return { success: true, microphone: true, system: false }
    }

    try {
      // Initialize audio context
      this.audioContext = new AudioContext({
        sampleRate: options.sampleRate || 16000
      })

      // Load AudioWorklet processor
      await this.loadAudioWorklet()

      // Initialize VAD if enabled
      if (options.enableVAD !== false) { // Default to enabled
        this.vadEnabled = true
        this.vadProcessor = new VADProcessor(this.getVADOptions(options.vadSensitivity))
      }

      // Start microphone capture
      const micSuccess = await this.startMicrophoneCapture(options)

      // Attempt system audio capture (may fail on some platforms)
      const systemSuccess = await this.startSystemAudioCapture(options)

      if (!micSuccess && !systemSuccess) {
        throw new Error('Failed to start any audio capture')
      }

      this.isCapturing = true
      return { success: true, microphone: micSuccess, system: systemSuccess }
    } catch (error) {
      console.error('[RendererAudio] Error starting capture:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Handles stop capture request from main process
   */
  private async handleStopCapture(): Promise<any> {
    if (!this.isCapturing) {
      return { success: true }
    }

    try {
      // Stop microphone capture
      if (this.microphoneStream) {
        this.microphoneStream.getTracks().forEach(track => track.stop())
        this.microphoneStream = null
      }

      // Stop system audio capture
      if (this.systemAudioStream) {
        this.systemAudioStream.getTracks().forEach(track => track.stop())
        this.systemAudioStream = null
      }

      // Clean up VAD
      if (this.vadUpdateInterval) {
        clearInterval(this.vadUpdateInterval)
        this.vadUpdateInterval = null
      }

      if (this.vadProcessor) {
        this.vadProcessor.cleanup()
        this.vadProcessor = null
      }

      // Clean up audio processors
      if (this.microphoneProcessor) {
        this.microphoneProcessor.disconnect()
        this.microphoneProcessor = null
      }

      if (this.systemAudioProcessor) {
        this.systemAudioProcessor.disconnect()
        this.systemAudioProcessor = null
      }

      // Close audio context
      if (this.audioContext) {
        await this.audioContext.close()
        this.audioContext = null
      }

      this.isCapturing = false
      return { success: true }
    } catch (error) {
      console.error('[RendererAudio] Error stopping capture:', error)
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Starts microphone audio capture
   */
  private async startMicrophoneCapture(options: AudioCaptureOptions): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: options.sampleRate || 16000,
          channelCount: options.channels || 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      this.microphoneStream = stream
      await this.setupAudioProcessor(stream, 'microphone')

      // Initialize VAD for microphone stream
      if (this.vadEnabled && this.vadProcessor && this.audioContext) {
        const vadInitialized = await this.vadProcessor.initialize(this.audioContext, stream)
        if (vadInitialized) {
          this.startVADProcessing()
          console.log('[RendererAudio] VAD initialized for microphone')
        } else {
          console.warn('[RendererAudio] Failed to initialize VAD, continuing without it')
          this.vadEnabled = false
        }
      }

      console.log('[RendererAudio] Microphone capture started')
      return true
    } catch (error) {
      console.error('[RendererAudio] Failed to start microphone capture:', error)
      return false
    }
  }

  /**
   * Attempts to start system audio capture
   */
  private async startSystemAudioCapture(options: AudioCaptureOptions): Promise<boolean> {
    try {
      // Check platform limitations
      if (navigator.userAgent.includes('Mac')) {
        console.warn('[RendererAudio] System audio capture limited on macOS')
        return false
      }

      // Attempt to capture system audio using screen capture with audio
      const stream = await navigator.mediaDevices.getDisplayMedia({
        audio: {
          sampleRate: options.sampleRate || 16000,
          channelCount: options.channels || 1
        },
        video: false
      })

      this.systemAudioStream = stream
      await this.setupAudioProcessor(stream, 'system')

      console.log('[RendererAudio] System audio capture started')
      return true
    } catch (error) {
      console.warn('[RendererAudio] System audio capture not available:', (error as Error).message)
      return false
    }
  }

  /**
   * Sets up audio processing for a given stream
   */
  private async setupAudioProcessor(stream: MediaStream, source: 'microphone' | 'system'): Promise<void> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized')
    }

    const audioTrack = stream.getAudioTracks()[0]
    if (!audioTrack) {
      throw new Error('No audio track found in stream')
    }

    // Create media stream source
    const mediaStreamSource = this.audioContext.createMediaStreamSource(stream)

    let processor: AudioWorkletNode | ScriptProcessorNode

    if (this.useAudioWorklet) {
      // Create AudioWorklet processor for audio chunks
      processor = new AudioWorkletNode(this.audioContext, 'audio-processor-worklet', {
        processorOptions: {
          bufferSize: 4096,
          sampleRate: this.audioContext.sampleRate,
          channels: 1,
          source
        }
      })

      // Handle audio chunks from the worklet
      processor.port.onmessage = (event) => {
        if (event.data.type === 'audioChunk') {
          this.handleAudioChunk(event.data.data, event.data.timestamp, event.data.source)
        }
      }
    } else {
      // Fallback to ScriptProcessorNode (deprecated but still functional)
      processor = this.audioContext.createScriptProcessor(4096, 1, 1)

      processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer
        const inputData = inputBuffer.getChannelData(0)

        // Convert Float32Array to ArrayBuffer
        const buffer = new ArrayBuffer(inputData.length * 2) // 16-bit samples
        const view = new DataView(buffer)

        for (let i = 0; i < inputData.length; i++) {
          const sample = Math.max(-1, Math.min(1, inputData[i]))
          view.setInt16(i * 2, sample * 0x7FFF, true) // little endian
        }

        this.handleAudioChunk(buffer, Date.now(), source)
      }
    }

    // Connect the audio processing chain
    // Note: We don't connect to destination to avoid audio feedback/echo
    mediaStreamSource.connect(processor)

    // Store processor reference for cleanup
    if (source === 'microphone') {
      this.microphoneProcessor = processor
    } else {
      this.systemAudioProcessor = processor
    }
  }

  /**
   * Handles audio chunk processing (common logic for both AudioWorklet and ScriptProcessor)
   */
  private handleAudioChunk(data: ArrayBuffer, timestamp: number, source: 'microphone' | 'system'): void {
    // Get VAD result if available and this is microphone audio
    let vadResult = undefined
    if (this.vadEnabled && this.vadProcessor && source === 'microphone') {
      vadResult = this.vadProcessor.getVADStatus()
    }

    const chunk: AudioChunk = {
      data,
      timestamp,
      source,
      vadResult: vadResult || undefined
    }

    // Only send chunk if VAD is disabled, or if voice is detected, or if this is system audio
    const shouldSendChunk = !this.vadEnabled || source === 'system' || (vadResult && vadResult.isVoice)

    if (shouldSendChunk) {
      // Send chunk to main process via postMessage
      this.sendAudioChunkToMain(chunk)
    }
  }

  /**
   * Checks microphone permissions
   */
  private async checkMicrophonePermissions(): Promise<any> {
    try {
      console.log('[RendererAudio] Checking microphone permissions...')

      // Try to query permissions first
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        console.log(`[RendererAudio] Permission state: ${result.state}`)
        return { granted: result.state === 'granted' }
      } catch (permError) {
        console.warn('[RendererAudio] Permission query not supported, trying getUserMedia test:', permError)

        // Fallback: try a quick getUserMedia test
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          stream.getTracks().forEach(track => track.stop())
          console.log('[RendererAudio] Microphone access granted (via getUserMedia test)')
          return { granted: true }
        } catch (mediaError) {
          console.log('[RendererAudio] Microphone access denied (via getUserMedia test)')
          return { granted: false }
        }
      }
    } catch (error) {
      console.warn('[RendererAudio] Could not check microphone permissions:', error)
      return { granted: false }
    }
  }

  /**
   * Requests microphone permissions
   */
  private async requestMicrophonePermissions(): Promise<any> {
    try {
      console.log('[RendererAudio] Requesting microphone permissions...')

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      console.log('[RendererAudio] Microphone permission granted')
      stream.getTracks().forEach(track => track.stop()) // Stop immediately, we just wanted permission
      return { granted: true }
    } catch (error) {
      console.error('[RendererAudio] Microphone permission denied:', error)

      // Provide more specific error information
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          console.error('[RendererAudio] User denied microphone permission')
        } else if (error.name === 'NotFoundError') {
          console.error('[RendererAudio] No microphone device found')
        } else if (error.name === 'NotReadableError') {
          console.error('[RendererAudio] Microphone is already in use by another application')
        }
      }

      return { granted: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Sends audio chunk to main process
   */
  private sendAudioChunkToMain(chunk: AudioChunk): void {
    try {
      // Convert ArrayBuffer to base64 for transmission
      const base64Data = this.arrayBufferToBase64(chunk.data)

      // Send to main process via electronAPI if available
      if (window.electronAPI && window.electronAPI.sendAudioChunk) {
        window.electronAPI.sendAudioChunk({
          data: base64Data,
          timestamp: chunk.timestamp,
          source: chunk.source
        })

        // Debug log (only occasionally to avoid spam)
        if (Math.random() < 0.01) { // Log ~1% of chunks
          console.log(`[RendererAudio] Sent audio chunk: ${chunk.data.byteLength} bytes from ${chunk.source}`)
        }
      } else {
        // Fallback: use postMessage for debugging
        console.log('[RendererAudio] electronAPI not available, audio chunk not sent')
        console.log('[RendererAudio] electronAPI exists:', !!window.electronAPI)
        console.log('[RendererAudio] sendAudioChunk exists:', !!(window.electronAPI && window.electronAPI.sendAudioChunk))
      }
    } catch (error) {
      console.error('[RendererAudio] Failed to send audio chunk to main process:', error)
    }
  }

  /**
   * Converts ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  /**
   * Gets VAD options based on sensitivity setting
   */
  private getVADOptions(sensitivity: 'low' | 'medium' | 'high' = 'medium') {
    const sensitivityMap = {
      low: {
        energyThreshold: 0.02,
        frequencyThreshold: 0.03,
        silenceFrames: 15,
        voiceFrames: 5
      },
      medium: {
        energyThreshold: 0.01,
        frequencyThreshold: 0.02,
        silenceFrames: 10,
        voiceFrames: 3
      },
      high: {
        energyThreshold: 0.005,
        frequencyThreshold: 0.01,
        silenceFrames: 5,
        voiceFrames: 2
      }
    }

    return sensitivityMap[sensitivity]
  }

  /**
   * Starts VAD processing loop
   */
  private startVADProcessing(): void {
    if (!this.vadProcessor) return

    // Process VAD at 20Hz (every 50ms)
    this.vadUpdateInterval = window.setInterval(() => {
      if (this.vadProcessor) {
        const vadResult = this.vadProcessor.processFrame()

        // Send VAD status to main process for UI updates (if API exists)
        // Note: sendVADStatus API not implemented yet
        // if (window.electronAPI && window.electronAPI.sendVADStatus) {
        //   window.electronAPI.sendVADStatus(vadResult)
        // }
      }
    }, 50)
  }

  /**
   * Gets available audio input devices
   */
  private async getAudioInputDevices(): Promise<any> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioDevices = devices.filter(device => device.kind === 'audioinput')
      return { devices: audioDevices.map(d => ({ deviceId: d.deviceId, label: d.label })) }
    } catch (error) {
      console.error('[RendererAudio] Failed to enumerate audio devices:', error)
      return { devices: [] }
    }
  }
}

// Initialize the renderer audio capture
const rendererAudioCapture = RendererAudioCapture.getInstance()

export default rendererAudioCapture

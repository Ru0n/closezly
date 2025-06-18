/**
 * VADProcessor.ts
 *
 * Voice Activity Detection processor using Web Audio API.
 * Implements real-time voice detection based on energy levels and frequency analysis.
 * Provides smart audio chunking by only processing audio when voice is detected.
 */

interface VADOptions {
  sampleRate?: number
  frameSize?: number // samples per frame
  energyThreshold?: number // minimum energy level for voice detection
  frequencyThreshold?: number // minimum frequency energy for voice detection
  silenceFrames?: number // consecutive silent frames before marking as silence
  voiceFrames?: number // consecutive voice frames before marking as voice
  smoothingFactor?: number // smoothing factor for energy calculation
}

interface VADResult {
  isVoice: boolean
  energy: number
  confidence: number
  timestamp: number
}

export default class VADProcessor {
  private options: Required<VADOptions>
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private frequencyData: Uint8Array | null = null
  
  // VAD state
  private currentEnergy: number = 0
  private smoothedEnergy: number = 0
  private silenceCounter: number = 0
  private voiceCounter: number = 0
  private isCurrentlyVoice: boolean = false
  private lastVADResult: VADResult | null = null

  constructor(options: VADOptions = {}) {
    this.options = {
      sampleRate: options.sampleRate || 16000,
      frameSize: options.frameSize || 512,
      energyThreshold: options.energyThreshold || 0.01,
      frequencyThreshold: options.frequencyThreshold || 0.02,
      silenceFrames: options.silenceFrames || 10,
      voiceFrames: options.voiceFrames || 3,
      smoothingFactor: options.smoothingFactor || 0.1
    }
  }

  /**
   * Initialize VAD with audio context and stream
   */
  public async initialize(audioContext: AudioContext, stream: MediaStream): Promise<boolean> {
    try {
      this.audioContext = audioContext
      
      // Create analyser node for frequency analysis
      this.analyser = audioContext.createAnalyser()
      this.analyser.fftSize = this.options.frameSize * 2 // FFT size should be power of 2
      this.analyser.smoothingTimeConstant = 0.3
      this.analyser.minDecibels = -90
      this.analyser.maxDecibels = -10

      // Create data arrays
      const bufferLength = this.analyser.frequencyBinCount
      this.dataArray = new Uint8Array(bufferLength)
      this.frequencyData = new Uint8Array(bufferLength)

      // Connect audio stream to analyser
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(this.analyser)

      console.log('[VAD] Initialized successfully')
      return true
    } catch (error) {
      console.error('[VAD] Failed to initialize:', error)
      return false
    }
  }

  /**
   * Process audio frame and detect voice activity
   */
  public processFrame(): VADResult {
    if (!this.analyser || !this.dataArray || !this.frequencyData) {
      return {
        isVoice: false,
        energy: 0,
        confidence: 0,
        timestamp: Date.now()
      }
    }

    // Get frequency and time domain data
    this.analyser.getByteFrequencyData(this.frequencyData)
    this.analyser.getByteTimeDomainData(this.dataArray)

    // Calculate energy levels
    const timeEnergy = this.calculateTimeEnergy(this.dataArray)
    const frequencyEnergy = this.calculateFrequencyEnergy(this.frequencyData)

    // Smooth energy calculation
    this.currentEnergy = Math.max(timeEnergy, frequencyEnergy)
    this.smoothedEnergy = this.smoothedEnergy * (1 - this.options.smoothingFactor) + 
                         this.currentEnergy * this.options.smoothingFactor

    // Voice activity detection logic
    const isVoiceFrame = this.detectVoiceInFrame()
    
    // Update counters and state
    if (isVoiceFrame) {
      this.voiceCounter++
      this.silenceCounter = 0
    } else {
      this.silenceCounter++
      this.voiceCounter = 0
    }

    // Determine final voice state with hysteresis
    let isVoice = this.isCurrentlyVoice
    
    if (!this.isCurrentlyVoice && this.voiceCounter >= this.options.voiceFrames) {
      isVoice = true
      this.isCurrentlyVoice = true
    } else if (this.isCurrentlyVoice && this.silenceCounter >= this.options.silenceFrames) {
      isVoice = false
      this.isCurrentlyVoice = false
    }

    // Calculate confidence based on energy levels
    const confidence = Math.min(1.0, this.smoothedEnergy / (this.options.energyThreshold * 2))

    const result: VADResult = {
      isVoice,
      energy: this.smoothedEnergy,
      confidence,
      timestamp: Date.now()
    }

    this.lastVADResult = result
    return result
  }

  /**
   * Calculate energy from time domain data
   */
  private calculateTimeEnergy(timeData: Uint8Array): number {
    let sum = 0
    for (let i = 0; i < timeData.length; i++) {
      const sample = (timeData[i] - 128) / 128 // Convert to -1 to 1 range
      sum += sample * sample
    }
    return Math.sqrt(sum / timeData.length)
  }

  /**
   * Calculate energy from frequency domain data
   */
  private calculateFrequencyEnergy(frequencyData: Uint8Array): number {
    // Focus on voice frequency range (300Hz - 3400Hz)
    const voiceFreqStart = Math.floor((300 / (this.options.sampleRate / 2)) * frequencyData.length)
    const voiceFreqEnd = Math.floor((3400 / (this.options.sampleRate / 2)) * frequencyData.length)
    
    let sum = 0
    let count = 0
    
    for (let i = voiceFreqStart; i < Math.min(voiceFreqEnd, frequencyData.length); i++) {
      const magnitude = frequencyData[i] / 255 // Normalize to 0-1
      sum += magnitude * magnitude
      count++
    }
    
    return count > 0 ? Math.sqrt(sum / count) : 0
  }

  /**
   * Detect voice activity in current frame
   */
  private detectVoiceInFrame(): boolean {
    // Check if energy levels exceed thresholds
    const energyCheck = this.smoothedEnergy > this.options.energyThreshold
    
    // Additional frequency-based check for voice characteristics
    const frequencyCheck = this.hasVoiceFrequencyCharacteristics()
    
    return energyCheck && frequencyCheck
  }

  /**
   * Check if frequency spectrum has voice characteristics
   */
  private hasVoiceFrequencyCharacteristics(): boolean {
    if (!this.frequencyData) return false

    // Voice typically has energy in multiple frequency bands
    const sampleRate = this.options.sampleRate
    const binCount = this.frequencyData.length
    
    // Define frequency bands for voice detection
    const bands = [
      { start: 300, end: 800 },   // Fundamental frequencies
      { start: 800, end: 1500 },  // First formant
      { start: 1500, end: 3000 }, // Second formant
    ]

    let activeBands = 0
    
    for (const band of bands) {
      const startBin = Math.floor((band.start / (sampleRate / 2)) * binCount)
      const endBin = Math.floor((band.end / (sampleRate / 2)) * binCount)
      
      let bandEnergy = 0
      for (let i = startBin; i < Math.min(endBin, binCount); i++) {
        bandEnergy += this.frequencyData[i] / 255
      }
      
      const avgBandEnergy = bandEnergy / (endBin - startBin)
      if (avgBandEnergy > this.options.frequencyThreshold) {
        activeBands++
      }
    }

    // Voice should have energy in at least 2 frequency bands
    return activeBands >= 2
  }

  /**
   * Get current VAD status
   */
  public getVADStatus(): VADResult | null {
    return this.lastVADResult
  }

  /**
   * Check if currently detecting voice
   */
  public isVoiceDetected(): boolean {
    return this.isCurrentlyVoice
  }

  /**
   * Get current energy level
   */
  public getCurrentEnergy(): number {
    return this.smoothedEnergy
  }

  /**
   * Update VAD sensitivity
   */
  public updateThresholds(energyThreshold?: number, frequencyThreshold?: number): void {
    if (energyThreshold !== undefined) {
      this.options.energyThreshold = energyThreshold
    }
    if (frequencyThreshold !== undefined) {
      this.options.frequencyThreshold = frequencyThreshold
    }
    console.log('[VAD] Updated thresholds:', {
      energy: this.options.energyThreshold,
      frequency: this.options.frequencyThreshold
    })
  }

  /**
   * Reset VAD state
   */
  public reset(): void {
    this.currentEnergy = 0
    this.smoothedEnergy = 0
    this.silenceCounter = 0
    this.voiceCounter = 0
    this.isCurrentlyVoice = false
    this.lastVADResult = null
    console.log('[VAD] State reset')
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.reset()
    this.analyser = null
    this.dataArray = null
    this.frequencyData = null
    this.audioContext = null
    console.log('[VAD] Cleanup completed')
  }
}

export type { VADOptions, VADResult }

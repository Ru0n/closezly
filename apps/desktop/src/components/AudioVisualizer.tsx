/**
 * AudioVisualizer.tsx
 *
 * Real-time audio visualization component using Web Audio API.
 * Displays frequency bars or waveform visualization for microphone input.
 * Provides visual feedback during voice recording.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react'

interface AudioVisualizerProps {
  isRecording: boolean
  width?: number
  height?: number
  barCount?: number
  barColor?: string
  backgroundColor?: string
  style?: 'bars' | 'waveform' | 'circular'
  showVADStatus?: boolean
  vadStatus?: {
    isVoice: boolean
    energy: number
    confidence: number
  }
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isRecording,
  width = 200,
  height = 200,
  barCount = 32,
  barColor = '#ef4444',
  backgroundColor = 'transparent',
  style = 'circular',
  showVADStatus = false,
  vadStatus
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize Web Audio API
  const initializeAudio = async () => {
    try {
      // Create audio context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()

      // Resume audio context if suspended (required for autoplay policy)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
        console.log('[AudioVisualizer] Audio context resumed')
      }

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      streamRef.current = stream

      // Create analyser node
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 512 // Increased for better frequency resolution
      analyserRef.current.smoothingTimeConstant = 0.7 // Slightly more responsive

      // Connect microphone to analyser
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)

      // Create data array for frequency data
      const bufferLength = analyserRef.current.frequencyBinCount
      dataArrayRef.current = new Uint8Array(bufferLength)

      setIsInitialized(true)
      console.log('[AudioVisualizer] Audio initialized successfully')
    } catch (error) {
      console.error('[AudioVisualizer] Failed to initialize audio:', error)
      setIsInitialized(false)
    }
  }

  // Draw ripple visualization - improved with proper fade-out and lifecycle
  const drawRipples = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    if (!analyserRef.current || !dataArrayRef.current) return

    // Get frequency data
    analyserRef.current.getByteFrequencyData(dataArrayRef.current)

    // Properly clear canvas with full transparency
    ctx.clearRect(0, 0, width, height)

    // Set background if not transparent
    if (backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, width, height)
    }

    const centerX = width / 2
    const centerY = height / 2
    const maxRadius = Math.min(width, height) / 2 - 2 // Reduced margin for larger ripples

    // Calculate overall energy for ripple intensity
    let totalEnergy = dataArrayRef.current.reduce((sum, value) => sum + value, 0) / dataArrayRef.current.length / 255

    // Use VAD status if available for more accurate voice detection
    if (showVADStatus && vadStatus) {
      totalEnergy = vadStatus.isVoice ? Math.max(totalEnergy, vadStatus.energy) : totalEnergy * 0.3
    }

    const energyThreshold = 0.05 // Lower threshold for more responsive ripples
    const activeEnergy = totalEnergy > energyThreshold ? totalEnergy : 0

    const time = Date.now() * 0.001

    // Larger base circle radius for better visibility
    const baseRadius = maxRadius * 0.4 + (activeEnergy * maxRadius * 0.15)

    // Only draw ripples when there's active audio energy
    if (activeEnergy > 0) {
      // Dynamic ripple count based on energy (2-6 ripples)
      const rippleCount = Math.floor(2 + activeEnergy * 4)

      for (let i = 0; i < rippleCount; i++) {
        // Stagger ripple timing for natural wave effect
        const rippleStartTime = time - (i * 0.3)
        const rippleAge = rippleStartTime % 2.5 // 2.5 second complete lifecycle

        // Only draw ripples that are in their active lifecycle
        if (rippleAge >= 0 && rippleAge <= 2.0) {
          const rippleProgress = rippleAge / 2.0 // 0 to 1 over 2 seconds
          const rippleRadius = baseRadius + (rippleProgress * maxRadius * 0.5) // Smaller expansion range

          // More visible fade-out curve
          const fadeOut = Math.pow(1 - rippleProgress, 1.5) // Less aggressive fade
          const rippleOpacity = fadeOut * Math.max(activeEnergy, 0.3) * 0.8 // Higher base opacity

          // Only draw if opacity is meaningful
          if (rippleOpacity > 0.05 && rippleRadius <= maxRadius) {
            // Thicker, more visible ripple rings
            const ringThickness = 4 + (activeEnergy * 3)
            const rippleGradient = ctx.createRadialGradient(
              centerX, centerY, rippleRadius - ringThickness,
              centerX, centerY, rippleRadius + ringThickness
            )

            rippleGradient.addColorStop(0, `rgba(96, 165, 250, 0)`)
            rippleGradient.addColorStop(0.5, `rgba(96, 165, 250, ${rippleOpacity})`)
            rippleGradient.addColorStop(1, `rgba(96, 165, 250, 0)`)

            // Draw as filled ring for smoother appearance
            ctx.fillStyle = rippleGradient
            ctx.beginPath()
            ctx.arc(centerX, centerY, rippleRadius, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
    }

    // Draw larger, more prominent center core circle
    const coreOpacity = 0.8 + (activeEnergy * 0.2)
    const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius)
    coreGradient.addColorStop(0, `rgba(96, 165, 250, ${coreOpacity})`)
    coreGradient.addColorStop(0.7, `rgba(59, 130, 246, ${coreOpacity * 0.7})`)
    coreGradient.addColorStop(1, `rgba(37, 99, 235, ${coreOpacity * 0.2})`)

    ctx.fillStyle = coreGradient
    ctx.beginPath()
    ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2)
    ctx.fill()

    // Always show inner highlight for better depth perception
    const highlightOpacity = 0.3 + (activeEnergy * 0.3)
    const highlightGradient = ctx.createRadialGradient(
      centerX - baseRadius * 0.3,
      centerY - baseRadius * 0.3,
      0,
      centerX,
      centerY,
      baseRadius * 0.6
    )
    highlightGradient.addColorStop(0, `rgba(147, 197, 253, ${highlightOpacity})`)
    highlightGradient.addColorStop(1, 'rgba(147, 197, 253, 0)')

    ctx.fillStyle = highlightGradient
    ctx.beginPath()
    ctx.arc(centerX, centerY, baseRadius * 0.6, 0, Math.PI * 2)
    ctx.fill()
  }, [width, height, backgroundColor])

  // Draw idle ripple animation - improved with proper fade-out
  const drawIdleRipples = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    // Properly clear canvas with full transparency
    ctx.clearRect(0, 0, width, height)

    // Set background if not transparent
    if (backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, width, height)
    }

    const centerX = width / 2
    const centerY = height / 2
    const time = Date.now() * 0.001
    const maxRadius = Math.min(width, height) / 2 - 2

    // Larger base radius with gentle breathing effect
    const baseRadius = maxRadius * 0.35 + Math.sin(time * 1.0) * 4

    // Draw very subtle idle ripples (only 2 for calm effect)
    for (let i = 0; i < 2; i++) {
      const rippleStartTime = time - (i * 1.5) // Stagger by 1.5 seconds
      const rippleAge = rippleStartTime % 4.0 // 4 second complete lifecycle for calm effect

      // Only draw ripples in their active lifecycle
      if (rippleAge >= 0 && rippleAge <= 3.0) {
        const rippleProgress = rippleAge / 3.0 // 0 to 1 over 3 seconds
        const rippleRadius = baseRadius + (rippleProgress * maxRadius * 0.4) // Smaller expansion for idle

        // More visible fade-out curve for idle state
        const fadeOut = Math.pow(1 - rippleProgress, 1.2) // Less aggressive fade
        const rippleOpacity = fadeOut * 0.25 // More visible for idle state

        // Only draw if opacity is meaningful and within bounds
        if (rippleOpacity > 0.02 && rippleRadius <= maxRadius) {
          // Thicker ripples for better visibility
          const ringThickness = 3
          const rippleGradient = ctx.createRadialGradient(
            centerX, centerY, rippleRadius - ringThickness,
            centerX, centerY, rippleRadius + ringThickness
          )

          rippleGradient.addColorStop(0, `rgba(96, 165, 250, 0)`)
          rippleGradient.addColorStop(0.5, `rgba(96, 165, 250, ${rippleOpacity})`)
          rippleGradient.addColorStop(1, `rgba(96, 165, 250, 0)`)

          ctx.fillStyle = rippleGradient
          ctx.beginPath()
          ctx.arc(centerX, centerY, rippleRadius, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    // Draw center core circle with gentle breathing effect
    const breathingIntensity = Math.sin(time * 1.0) * 0.1
    const coreOpacity = 0.5 + breathingIntensity
    const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius)
    coreGradient.addColorStop(0, `rgba(96, 165, 250, ${coreOpacity})`)
    coreGradient.addColorStop(0.6, `rgba(59, 130, 246, ${coreOpacity * 0.7})`)
    coreGradient.addColorStop(1, `rgba(37, 99, 235, ${coreOpacity * 0.3})`)

    ctx.fillStyle = coreGradient
    ctx.beginPath()
    ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2)
    ctx.fill()

    // Add subtle inner highlight for depth
    const highlightOpacity = (0.3 + breathingIntensity) * 0.4
    const highlightGradient = ctx.createRadialGradient(
      centerX - baseRadius * 0.3,
      centerY - baseRadius * 0.3,
      0,
      centerX,
      centerY,
      baseRadius * 0.7
    )
    highlightGradient.addColorStop(0, `rgba(147, 197, 253, ${highlightOpacity})`)
    highlightGradient.addColorStop(1, 'rgba(147, 197, 253, 0)')

    ctx.fillStyle = highlightGradient
    ctx.beginPath()
    ctx.arc(centerX, centerY, baseRadius * 0.7, 0, Math.PI * 2)
    ctx.fill()
  }, [width, height, backgroundColor])

  // Animation loop - memoized to prevent recreation
  const animate = useCallback(() => {
    if (!isRecording || !canvasRef.current || !isInitialized) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Draw ripple visualization for recording state
    drawRipples(canvas, ctx)

    // Continue animation
    animationFrameRef.current = requestAnimationFrame(animate)
  }, [isRecording, isInitialized, drawRipples])

  // Idle animation when not recording - memoized to prevent recreation
  const animateIdle = useCallback(() => {
    if (!canvasRef.current || isRecording) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Draw ripple idle animation
    drawIdleRipples(canvas, ctx)

    animationFrameRef.current = requestAnimationFrame(animateIdle)
  }, [isRecording, drawIdleRipples])

  // Manage animation state based on recording status
  useEffect(() => {
    // Cancel any existing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // Start appropriate animation based on state
    if (isRecording && isInitialized) {
      // Start recording animation
      animate()
    } else if (!isRecording) {
      // Start idle animation when not recording
      animateIdle()
    } else {
      // Clear canvas when recording but not initialized (loading state)
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        if (ctx) {
          ctx.fillStyle = backgroundColor
          ctx.fillRect(0, 0, width, height)
        }
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isRecording, isInitialized, animate, animateIdle, backgroundColor, width, height])

  // Initialize audio only when recording starts (lazy initialization)
  useEffect(() => {
    if (isRecording && !isInitialized) {
      initializeAudio()
    }
  }, [isRecording, isInitialized])

  // Cleanup effect - separate from animation management
  useEffect(() => {
    return () => {
      // Cleanup audio resources when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // Show loading state while audio is initializing
  if (isRecording && !isInitialized) {
    return (
      <div
        className="rounded-full border border-white/10 flex items-center justify-center bg-black/20 backdrop-blur-sm relative overflow-hidden"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        {/* Animated loading ring */}
        <div className="absolute inset-4 rounded-full border-2 border-transparent border-t-blue-400 border-r-blue-400 animate-spin"></div>
        <div className="absolute inset-6 rounded-full border-2 border-transparent border-t-cyan-300 border-r-cyan-300 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>

        {/* Center pulsing circle */}
        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-300 rounded-full animate-pulse"></div>

        {/* Radial loading dots */}
        <div className="absolute inset-0 flex items-center justify-center">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-blue-400 rounded-full animate-pulse"
              style={{
                transform: `rotate(${i * 30}deg) translateY(-${Math.min(width, height) / 3}px)`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: '1.5s'
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-full"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: backgroundColor === 'transparent' ? 'transparent' : backgroundColor
        }}
      />

      {/* VAD Status Indicator */}
      {showVADStatus && vadStatus && (
        <div className="absolute -top-2 -right-2">
          <div
            className={`w-4 h-4 rounded-full border-2 border-white/20 transition-all duration-200 ${
              vadStatus.isVoice
                ? 'bg-green-400 shadow-lg shadow-green-400/50'
                : 'bg-gray-400'
            }`}
            title={`Voice ${vadStatus.isVoice ? 'detected' : 'not detected'} (${Math.round(vadStatus.confidence * 100)}%)`}
          >
            {vadStatus.isVoice && (
              <div className="w-full h-full bg-green-300 rounded-full animate-pulse" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AudioVisualizer

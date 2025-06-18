/**
 * InlineVoiceRecording.tsx
 *
 * Compact inline voice recording interface that appears below the mic button.
 * Provides immediate recording feedback, live transcription, and quick actions
 * without opening a separate modal window.
 */

import React, { useState, useEffect, useRef } from 'react'
import { Square, Send, RotateCcw, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import AudioVisualizer from './AudioVisualizer'
import { Button } from "@/components/ui/button"

interface InlineVoiceRecordingProps {
  isVisible: boolean
  isRecording: boolean
  onStartRecording: () => void
  onStopRecording: () => void
  onCancelRecording: () => void
  onSendTranscript: (transcript: string) => void
  className?: string
}

interface RecordingState {
  duration: number
  transcript: string
  interimTranscript: string
  isTranscribing: boolean
  error: string | null
  // Phase 2.2: Progressive transcription display
  liveTranscript: string
  streamingWords: string[]
  confidence: number
  isLiveMode: boolean
  // Enhanced word-by-word animation
  animatedWords: Array<{ word: string; id: string; timestamp: number }>
  currentWordIndex: number
}

const InlineVoiceRecording: React.FC<InlineVoiceRecordingProps> = ({
  isVisible,
  isRecording,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  onSendTranscript,
  className = ''
}) => {


  const [state, setState] = useState<RecordingState>({
    duration: 0,
    transcript: '',
    interimTranscript: '',
    isTranscribing: false,
    error: null,
    // Phase 2.2: Progressive transcription display
    liveTranscript: '',
    streamingWords: [],
    confidence: 0,
    isLiveMode: false,
    // Enhanced word-by-word animation
    animatedWords: [],
    currentWordIndex: 0
  })

  const [editedTranscript, setEditedTranscript] = useState('')
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const wordAnimationTimersRef = useRef<NodeJS.Timeout[]>([])

  // Progressive word animation function
  const animateWordsProgressively = (text: string, isInterim: boolean = false) => {
    if (!text || !text.trim()) return

    const words = text.trim().split(/\s+/).filter(word => word.length > 0)
    const timestamp = Date.now()

    // Create word objects with unique IDs
    const newWords = words.map((word, index) => ({
      word: word,
      id: `${timestamp}-${index}`,
      timestamp: timestamp + (index * 100) // Stagger by 100ms
    }))

    // Clear existing animation timers
    wordAnimationTimersRef.current.forEach(timer => clearTimeout(timer))
    wordAnimationTimersRef.current = []

    let startingWordIndex = 0
    let finalWords: Array<{ word: string; id: string; timestamp: number }> = []

    // If this is interim text, replace existing words
    if (isInterim) {
      finalWords = newWords
      startingWordIndex = 0
      setState(prev => ({
        ...prev,
        animatedWords: newWords,
        currentWordIndex: 0,
        isLiveMode: true
      }))
    } else {
      // For final text, append to existing words
      setState(prev => {
        const updatedWords = [...prev.animatedWords, ...newWords]
        finalWords = updatedWords
        startingWordIndex = prev.animatedWords.length
        return {
          ...prev,
          animatedWords: updatedWords,
          isLiveMode: true
        }
      })
    }

    // Animate words appearing one by one with proper index calculation
    newWords.forEach((wordObj, index) => {
      const timeoutId = setTimeout(() => {
        setState(prev => ({
          ...prev,
          currentWordIndex: startingWordIndex + index + 1
        }))
      }, index * 150) // 150ms delay between words for smooth animation

      // Store all timeouts for proper cleanup
      wordAnimationTimersRef.current.push(timeoutId)
    })
  }

  // Format duration for display
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Progressive word display component
  const ProgressiveWordDisplay: React.FC<{ words: Array<{ word: string; id: string; timestamp: number }>, currentIndex: number, confidence: number }> = ({ words, currentIndex, confidence }) => {
    return (
      <div className="flex flex-wrap gap-1 leading-relaxed">
        {words.slice(0, currentIndex).map((wordObj, index) => (
          <motion.span
            key={wordObj.id}
            className={`inline-block ${
              confidence >= 0.8 ? 'text-green-400' :
              confidence >= 0.6 ? 'text-yellow-400' :
              confidence >= 0.4 ? 'text-orange-400' : 'text-red-400'
            } font-medium`}
            initial={{
              opacity: 0,
              scale: 0.3,
              y: 20,
              filter: 'blur(10px)'
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              filter: 'blur(0px)'
            }}
            transition={{
              duration: 0.4,
              delay: index * 0.05, // Stagger animation
              type: "spring",
              stiffness: 400,
              damping: 25,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
            whileHover={{
              scale: 1.05,
              transition: { duration: 0.2 }
            }}
          >
            {wordObj.word}
          </motion.span>
        ))}
        {/* Typing cursor for the next word */}
        {currentIndex < words.length && (
          <motion.span
            className="inline-block w-0.5 h-4 bg-blue-400 ml-1"
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>
    )
  }

  // Handle stop recording
  const handleStopRecording = async () => {
    try {
      // Clear timer
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current)
        durationTimerRef.current = null
      }

      // Update state to show transcribing
      setState(prev => ({ ...prev, isTranscribing: true, error: null }))

      // Call the parent's stop recording handler (just updates App state)
      onStopRecording()

      // Get transcription result
      console.log('[InlineVoiceRecording] Attempting to stop recording...')
      const result = await window.electronAPI.stopVoiceRecording()
      console.log('[InlineVoiceRecording] Stop recording result:', result)

      if (result.success && result.text) {
        const transcriptText = result.text.trim()
        setState(prev => ({
          ...prev,
          isTranscribing: false,
          transcript: transcriptText,
          interimTranscript: '',
          error: null
        }))
        setEditedTranscript(transcriptText)

        // Focus textarea for editing
        setTimeout(() => {
          textareaRef.current?.focus()
        }, 100)
      } else {
        setState(prev => ({
          ...prev,
          isTranscribing: false,
          error: result.error || 'Transcription failed'
        }))
      }
    } catch (error) {
      console.error('Error stopping recording:', error)
      setState(prev => ({
        ...prev,
        isTranscribing: false,
        error: 'Failed to process recording'
      }))
    }
  }

  // Handle cancel recording
  const handleCancelRecording = async () => {
    try {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current)
        durationTimerRef.current = null
      }

      // Cancel the recording if it's still active
      if (isRecording) {
        await window.electronAPI.cancelVoiceRecording()
      }

      setState({
        duration: 0,
        transcript: '',
        interimTranscript: '',
        isTranscribing: false,
        error: null,
        liveTranscript: '',
        streamingWords: [],
        confidence: 0,
        isLiveMode: false,
        animatedWords: [],
        currentWordIndex: 0
      })
      setEditedTranscript('')

      // Clear animation timers
      wordAnimationTimersRef.current.forEach(timer => clearTimeout(timer))
      wordAnimationTimersRef.current = []

      onCancelRecording()
    } catch (error) {
      console.error('[InlineVoiceRecording] Error cancelling recording:', error)
      onCancelRecording()
    }
  }

  // Handle send transcript
  const handleSendTranscript = () => {
    const finalTranscript = editedTranscript.trim()
    if (finalTranscript) {
      onSendTranscript(finalTranscript)
      // Reset state
      setState({
        duration: 0,
        transcript: '',
        interimTranscript: '',
        isTranscribing: false,
        error: null,
        liveTranscript: '',
        streamingWords: [],
        confidence: 0,
        isLiveMode: false,
        animatedWords: [],
        currentWordIndex: 0
      })
      setEditedTranscript('')
    }
  }

  // Handle re-record
  const handleReRecord = () => {
    setState({
      duration: 0,
      transcript: '',
      interimTranscript: '',
      isTranscribing: false,
      error: null,
      liveTranscript: '',
      streamingWords: [],
      confidence: 0,
      isLiveMode: false,
      animatedWords: [],
      currentWordIndex: 0
    })
    setEditedTranscript('')
    onStartRecording()
  }

  // Start duration timer when recording starts
  useEffect(() => {
    if (isRecording) {
      const startTime = Date.now()
      durationTimerRef.current = setInterval(() => {
        const newDuration = Date.now() - startTime
        setState(prev => ({ ...prev, duration: newDuration }))
      }, 100)
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current)
        durationTimerRef.current = null
      }
    }

    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current)
      }
    }
  }, [isRecording])

  // Set up real-time event listeners for voice recording
  useEffect(() => {
    if (!window.electronAPI) return

    console.log('[InlineVoiceRecording] Setting up real-time event listeners')

    // Set up event listeners for real-time updates
    const unsubscribeStarted = window.electronAPI.onVoiceRecordingStarted(() => {
      console.log('[InlineVoiceRecording] Real-time: Recording started')
    })

    const unsubscribeStopped = window.electronAPI.onVoiceRecordingStopped((data) => {
      console.log('[InlineVoiceRecording] Real-time: Recording stopped', data)
    })

    const unsubscribeTranscriptionStarted = window.electronAPI.onVoiceRecordingTranscriptionStarted(() => {
      console.log('[InlineVoiceRecording] Real-time: Transcription started')
      setState(prev => ({ ...prev, isTranscribing: true, error: null }))
    })

    const unsubscribeTranscriptionCompleted = window.electronAPI.onVoiceRecordingTranscriptionCompleted(() => {
      console.log('[InlineVoiceRecording] Real-time: Transcription completed')
      // The actual result will be fetched when handleStopRecording completes
    })

    const unsubscribeError = window.electronAPI.onVoiceRecordingError((error: any) => {
      console.log('[InlineVoiceRecording] Real-time: Recording error', error)
      setState(prev => ({
        ...prev,
        isTranscribing: false,
        error: typeof error === 'string' ? error : (error?.error || 'Recording error occurred')
      }))
    })

    // Generic window event listener
    const unsubscribeWindowEvent = window.electronAPI.onWindowEvent((eventName, data) => {
      // console.log(`[VoiceRecordingModal] Global event listener caught: ${eventName}`, data)

      if (eventName === 'interim-transcription') {
        console.log('[InlineVoiceRecording] Received IPC window event:', data)
        setState(prev => ({
          ...prev,
          interimTranscript: data.text,
          isTranscribing: data.isProcessing ?? prev.isTranscribing,
        }))
      }

      // Phase 2.2: Handle new streaming events with progressive animation
      else if (eventName === 'streaming-transcription') {
        console.log('[InlineVoiceRecording] Streaming transcription:', data)
        const text = data.text || ''
        if (text.trim()) {
          // Use progressive word animation for streaming results
          animateWordsProgressively(text, true) // true = interim text
          setState(prev => ({
            ...prev,
            streamingWords: text.split(' ').filter((word: string) => word.trim()),
            confidence: data.confidence || 0.8,
            isLiveMode: true
          }))
        }
      }

      else if (eventName === 'live-transcription') {
        console.log('[InlineVoiceRecording] Live transcription:', data)
        const text = data.text || ''
        if (text.trim()) {
          // Use progressive word animation for live results
          animateWordsProgressively(text, false) // false = final text
          setState(prev => ({
            ...prev,
            liveTranscript: text,
            confidence: data.confidence || 0.8,
            isLiveMode: true
          }))
        }
      }
    })

    // Cleanup function
    return () => {
      console.log('[InlineVoiceRecording] Cleaning up real-time event listeners')
      unsubscribeStarted()
      unsubscribeStopped()
      unsubscribeTranscriptionStarted()
      unsubscribeTranscriptionCompleted()
      unsubscribeError()
      unsubscribeWindowEvent()
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current)
      }
      wordAnimationTimersRef.current.forEach(timer => clearTimeout(timer))
      wordAnimationTimersRef.current = []
    }
  }, [])

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{
            opacity: 0,
            y: -10,
            scale: 0.95,
            clipPath: 'inset(0 0 100% 0)',
            filter: 'blur(10px)'
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            clipPath: 'inset(0 0 0 0)',
            filter: 'blur(0px)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}
          exit={{
            opacity: 0,
            y: -10,
            scale: 0.95,
            clipPath: 'inset(0 0 100% 0)',
            filter: 'blur(10px)'
          }}
          transition={{
            duration: 0.4,
            ease: [0.25, 0.46, 0.45, 0.94],
            type: "spring",
            stiffness: 300,
            damping: 25
          }}
          className={`absolute top-full right-0 mt-2 bg-black bg-opacity-50 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 ${className}`}
          style={{ width: '320px', maxHeight: '280px' }}
        >
        {/* Recording Interface */}
        <AnimatePresence mode="wait">
          {!state.transcript && !state.error && (
            <motion.div
              key="recording-interface"
              className="px-4 py-3"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{
                duration: 0.4,
                type: "spring",
                stiffness: 300,
                damping: 25
              }}
            >
            <div className="mt-2 text-white/80 text-sm h-16 overflow-y-auto">
              {/* Enhanced Progressive transcription display with word-by-word animation */}
              {state.isLiveMode && state.animatedWords.length > 0 ? (
                <div className="space-y-2">
                  <ProgressiveWordDisplay
                    words={state.animatedWords}
                    currentIndex={state.currentWordIndex}
                    confidence={state.confidence}
                  />
                  {state.confidence > 0 && (
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${
                            state.confidence >= 0.8 ? 'bg-green-400' :
                            state.confidence >= 0.6 ? 'bg-yellow-400' : 'bg-red-400'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${state.confidence * 100}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <span className="text-xs text-white/60">
                        {Math.round(state.confidence * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              ) : state.interimTranscript ? (
                <motion.p
                  className="text-blue-400 italic"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {state.interimTranscript}
                </motion.p>
              ) : (
                <motion.p
                  className="text-white/50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  Waiting for speech...
                </motion.p>
              )}
            </div>
            {/* Header */}
            <motion.div
              className="flex items-center justify-between mb-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: 0.2,
                duration: 0.3,
                type: "spring",
                stiffness: 400,
                damping: 25
              }}
            >
              <span className="text-xs font-medium text-white/90 tracking-tight flex items-center">
                {isRecording && (
                  <motion.span
                    animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="w-2 h-2 bg-red-500 rounded-full mr-2"
                  />
                )}
                {isRecording ? 'Recording...' : state.isTranscribing ? 'Processing...' : 'Voice Input'}
              </span>
              <span className="text-xs font-medium text-white/60 tabular-nums">
                {formatDuration(state.duration)}
              </span>
            </motion.div>

            {/* Audio Visualizer */}
            <motion.div
              className="mb-3 flex justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 0.3,
                duration: 0.4,
                type: "spring",
                stiffness: 300,
                damping: 20
              }}
            >
              <AudioVisualizer
                isRecording={isRecording}
                width={80}
                height={80}
                barCount={24}
                barColor="#60a5fa"
                style="circular"
              />
            </motion.div>

            {/* Skeleton Loading for Transcription */}
            {state.isTranscribing && (
              <motion.div
                className="mb-4 space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, type: "spring", stiffness: 400, damping: 25 }}
              >
                <div className="space-y-1.5">
                  <motion.div
                    className="h-2 bg-white/10 rounded-full"
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    style={{ width: '85%' }}
                  />
                  <motion.div
                    className="h-2 bg-white/10 rounded-full"
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                    style={{ width: '70%' }}
                  />
                  <motion.div
                    className="h-2 bg-white/10 rounded-full"
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                    style={{ width: '60%' }}
                  />
                </div>
              </motion.div>
            )}

            {/* Status Text */}
            <motion.p
              className="text-xs font-normal text-white/70 text-center mb-4 leading-relaxed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.4,
                duration: 0.3,
                type: "spring",
                stiffness: 400,
                damping: 25
              }}
            >
              {isRecording
                ? 'Speak clearly into your microphone'
                : state.isTranscribing
                ? 'Converting speech to text...'
                : 'Click the microphone to start recording'
              }
            </motion.p>

            {/* Controls */}
            <motion.div
              className="flex justify-center space-x-2"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.5,
                duration: 0.3,
                type: "spring",
                stiffness: 400,
                damping: 25
              }}
            >
              {isRecording && (
                <>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Button
                      onClick={handleStopRecording}
                      variant="destructive"
                      size="sm"
                      className="h-7 px-3 text-xs font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <Square className="w-3 h-3 mr-1" />
                      Stop
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Button
                      onClick={handleCancelRecording}
                      variant="secondary"
                      size="sm"
                      className="h-7 px-3 text-xs font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      Cancel
                    </Button>
                  </motion.div>
                </>
              )}

              {state.isTranscribing && (
                <motion.div
                  className="flex items-center text-white/70 text-xs font-medium"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, type: "spring", stiffness: 400, damping: 25 }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="mr-2"
                  >
                    <Loader2 className="w-3 h-3 text-blue-400" />
                  </motion.div>
                  <motion.span
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    Transcribing...
                  </motion.span>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}

          {/* Transcript Editing */}
          {state.transcript && !state.error && (
            <motion.div
              key="transcript-editing"
              className="px-4 py-3"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{
                duration: 0.4,
                type: "spring",
                stiffness: 300,
                damping: 25
              }}
            >
            <div className="mb-3">
              <label className="block text-xs font-medium text-white/90 mb-2 tracking-tight">
                Edit transcript:
              </label>
              <textarea
                ref={textareaRef}
                value={editedTranscript}
                onChange={(e) => setEditedTranscript(e.target.value)}
                className="w-full h-16 p-2 text-xs bg-black/30 border border-white/20 text-white rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-blue-400/50 focus:border-blue-400/50 placeholder-white/40 backdrop-blur-sm"
                placeholder="Your transcribed text..."
              />
            </div>

            <div className="flex justify-between items-center mt-3">
              <span className="text-xs font-normal text-white/50 tabular-nums">
                {editedTranscript.length} chars
              </span>
              
              <div className="flex space-x-2">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Button
                    onClick={handleReRecord}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs font-medium border-white/20 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Re-record
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Button
                    onClick={handleSendTranscript}
                    disabled={!editedTranscript.trim()}
                    variant="default"
                    size="sm"
                    className="h-6 px-2 text-xs font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Send
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

          {/* Error Display */}
          {state.error && (
            <motion.div
              key="error-display"
              className="px-4 py-3"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{
                duration: 0.4,
                type: "spring",
                stiffness: 300,
                damping: 25
              }}
            >
            <motion.div
              className="relative p-3 rounded-lg border border-red-400/20 bg-red-500/10 mb-4"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 400, damping: 25 }}
            >
              {/* Error glow effect */}
              <motion.div
                className="absolute inset-0 rounded-lg bg-red-400/5"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />

              <div className="relative z-10">
                <motion.p
                  className="text-xs font-medium tracking-tight mb-1 text-red-300 flex items-center"
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                >
                  <motion.span
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="mr-2"
                  >
                    ⚠️
                  </motion.span>
                  Recording Error
                </motion.p>
                <motion.p
                  className="text-xs font-normal leading-relaxed text-red-200/90"
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  {state.error}
                </motion.p>
              </div>
            </motion.div>
            <div className="flex justify-center space-x-2">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  onClick={handleReRecord}
                  variant="default"
                  size="sm"
                  className="h-7 px-3 text-xs font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Try Again
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  onClick={handleCancelRecording}
                  variant="secondary"
                  size="sm"
                  className="h-7 px-3 text-xs font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Cancel
                </Button>
              </motion.div>
            </div>
          </motion.div>
          )}
        </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default InlineVoiceRecording

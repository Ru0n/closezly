/**
 * VoiceRecordingModal.tsx
 *
 * Enhanced voice recording interface with real-time transcription display.
 * Features live streaming transcription, smooth animations, and seamless
 * transition from recording to editing mode with modern glassmorphism UI.
 */

import React, { useState, useEffect, useRef } from 'react'
import { Square, Send, RotateCcw, Loader2, X, Mic, MicOff, Edit3, Sparkles } from 'lucide-react'
import AudioVisualizer from './AudioVisualizer'

interface VoiceRecordingModalProps {
  isOpen: boolean
  isRecording: boolean
  onClose: () => void
  onStartRecording: () => void
  onStopRecording: () => void
  onCancelRecording: () => void
  onSendTranscript: (transcript: string) => void
}

interface RecordingState {
  duration: number
  transcript: string
  interimTranscript: string
  isTranscribing: boolean
  isStreamingMode: boolean
  isProcessing?: boolean
  error: string | null
  confidence: number
  wordCount: number
}

const VoiceRecordingModal: React.FC<VoiceRecordingModalProps> = ({
  isOpen,
  isRecording,
  onClose,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  onSendTranscript
}) => {


  const [state, setState] = useState<RecordingState>({
    duration: 0,
    transcript: '',
    interimTranscript: '',
    isTranscribing: false,
    isStreamingMode: false,
    isProcessing: false,
    error: null,
    confidence: 0,
    wordCount: 0
  })

  const [editedTranscript, setEditedTranscript] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)
  const [streamingWords, setStreamingWords] = useState<string[]>([])
  const [vadStatus, setVadStatus] = useState<{
    isVoice: boolean
    energy: number
    confidence: number
  } | undefined>(undefined)
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const interimTextRef = useRef<HTMLDivElement>(null)

  // Progressive word animation state
  const [animatedWords, setAnimatedWords] = useState<Array<{ word: string; id: string; timestamp: number }>>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const wordAnimationTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Format duration for display
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

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

    // Clear existing animation timer
    if (wordAnimationTimerRef.current) {
      clearTimeout(wordAnimationTimerRef.current)
    }

    // If this is interim text, replace existing words
    if (isInterim) {
      setAnimatedWords(newWords)
      setCurrentWordIndex(0)
    } else {
      // For final text, append to existing words
      setAnimatedWords(prev => [...prev, ...newWords])
    }

    // Animate words appearing one by one
    newWords.forEach((wordObj, index) => {
      wordAnimationTimerRef.current = setTimeout(() => {
        setCurrentWordIndex(prev => prev + 1)
      }, index * 120) // 120ms delay between words for smooth animation
    })
  }

  // Handle real-time transcription events
  useEffect(() => {
    // Add IPC listener for window events from main process
    const handleWindowEvent = (eventName: string, data: any) => {
      console.log('[VoiceRecordingModal] Received IPC window event:', eventName, data)

      // Dispatch the event as a custom event on the window
      window.dispatchEvent(new CustomEvent(eventName, { detail: data }))
    }

    // Listen for IPC events from main process using the proper preload method
    let removeWindowEventListener: (() => void) | null = null
    if (window.electronAPI?.onWindowEvent) {
      removeWindowEventListener = window.electronAPI.onWindowEvent(handleWindowEvent)
    }

    // Add a global event listener to catch all custom events for debugging
    const globalEventListener = (event: any) => {
      if (event.type.includes('transcription') || event.type.includes('vad')) {
        console.log('[VoiceRecordingModal] Global event listener caught:', event.type, event.detail)
      }
    }

    // Listen for all events on the window
    window.addEventListener('interim-transcription', globalEventListener)
    window.addEventListener('final-transcription', globalEventListener)
    window.addEventListener('streaming-transcription', globalEventListener)
    window.addEventListener('live-transcription', globalEventListener)
    window.addEventListener('streaming-error', globalEventListener)
    window.addEventListener('vad-status', globalEventListener)

    const handleInterimTranscription = (event: any) => {
      console.log('[VoiceRecordingModal] Received interim transcription event:', event.detail)
      const { text, confidence, isProcessing } = event.detail

      if (text) {
        setState(prev => ({
          ...prev,
          interimTranscript: text,
          confidence: confidence || 0,
          isStreamingMode: true,
          isProcessing: Boolean(isProcessing)
        }))

        // Update streaming words for animation only for actual transcription (not processing messages)
        if (!isProcessing) {
          const words = text.split(' ').filter((word: string) => word.trim())
          setStreamingWords(words)
          console.log('[VoiceRecordingModal] Updated interim transcript:', text)
        } else {
          console.log('[VoiceRecordingModal] Processing message:', text)
        }
      }
    }

    const handleFinalTranscription = (event: any) => {
      console.log('[VoiceRecordingModal] Received final transcription event:', event.detail)
      const { text, confidence } = event.detail

      if (text) {
        setState(prev => ({
          ...prev,
          transcript: text,
          interimTranscript: '',
          confidence: confidence || 0,
          wordCount: text.split(' ').filter((word: string) => word.trim()).length,
          isTranscribing: false,
          isStreamingMode: false
        }))
        setEditedTranscript(text)
        setStreamingWords([])
        console.log('[VoiceRecordingModal] Updated final transcript:', text)

        // Transition to edit mode
        setTimeout(() => {
          setIsEditMode(true)
          textareaRef.current?.focus()
        }, 500)
      }
    }

    const handleStreamingError = (event: any) => {
      console.warn('Streaming transcription error:', event.detail)
      // Continue with batch processing, don't show error to user
    }

    const handleVADStatus = (event: any) => {
      const { isVoice, energy, confidence } = event.detail
      setVadStatus({ isVoice, energy, confidence })
    }

    // Handle streaming transcription events (real-time text from processing windows)
    const handleStreamingTranscription = (event: any) => {
      console.log('[VoiceRecordingModal] Received streaming transcription event:', event.detail)
      const { text, confidence } = event.detail

      if (text && text.trim()) {
        setState(prev => ({
          ...prev,
          interimTranscript: text,
          confidence: confidence || 0,
          isStreamingMode: true,
          isProcessing: false
        }))

        // Update streaming words for animation
        const words = text.split(' ').filter((word: string) => word.trim())
        setStreamingWords(words)
        console.log('[VoiceRecordingModal] Updated streaming transcript:', text)
      }
    }

    // Handle live transcription events (merged continuous transcription)
    const handleLiveTranscription = (event: any) => {
      console.log('[VoiceRecordingModal] Received live transcription event:', event.detail)
      const { text, confidence } = event.detail

      if (text && text.trim()) {
        setState(prev => ({
          ...prev,
          transcript: text,
          interimTranscript: '', // Clear interim since we have live text
          confidence: confidence || 0,
          wordCount: text.split(' ').filter((word: string) => word.trim()).length,
          isStreamingMode: true,
          isProcessing: false
        }))
        setEditedTranscript(text)
        console.log('[VoiceRecordingModal] Updated live transcript:', text)
      }
    }

    // Listen for real-time transcription events
    window.addEventListener('interim-transcription', handleInterimTranscription)
    window.addEventListener('final-transcription', handleFinalTranscription)
    window.addEventListener('streaming-transcription', handleStreamingTranscription)
    window.addEventListener('live-transcription', handleLiveTranscription)
    window.addEventListener('streaming-error', handleStreamingError)
    window.addEventListener('vad-status', handleVADStatus)

    // Test manual event dispatch to verify the event system is working
    setTimeout(() => {
      console.log('[VoiceRecordingModal] Dispatching test event manually from frontend')
      window.dispatchEvent(new CustomEvent('interim-transcription', {
        detail: {
          text: 'Frontend test event',
          confidence: 0.9,
          isProcessing: false
        }
      }))
    }, 3000)

    return () => {
      // Remove IPC listener
      if (removeWindowEventListener) {
        removeWindowEventListener()
      }

      // Remove window event listeners
      window.removeEventListener('interim-transcription', globalEventListener)
      window.removeEventListener('final-transcription', globalEventListener)
      window.removeEventListener('streaming-transcription', globalEventListener)
      window.removeEventListener('live-transcription', globalEventListener)
      window.removeEventListener('streaming-error', globalEventListener)
      window.removeEventListener('vad-status', globalEventListener)
      window.removeEventListener('interim-transcription', handleInterimTranscription)
      window.removeEventListener('final-transcription', handleFinalTranscription)
      window.removeEventListener('streaming-transcription', handleStreamingTranscription)
      window.removeEventListener('live-transcription', handleLiveTranscription)
      window.removeEventListener('streaming-error', handleStreamingError)
      window.removeEventListener('vad-status', handleVADStatus)
    }
  }, [])

  // Handle stop recording
  const handleStopRecording = async () => {
    try {
      // Clear timer
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current)
        durationTimerRef.current = null
      }

      // If we already have a transcript from streaming, use it
      if (state.transcript) {
        setIsEditMode(true)
        setTimeout(() => {
          textareaRef.current?.focus()
        }, 100)
        return
      }

      setState(prev => ({ ...prev, isTranscribing: true, error: null }))
      onStopRecording()

      // Get transcription result (fallback for batch processing)
      const result = await window.electronAPI.stopVoiceRecording()

      if (result.success && result.text) {
        const transcriptText = result.text.trim()
        setState(prev => ({
          ...prev,
          isTranscribing: false,
          transcript: transcriptText,
          wordCount: transcriptText.split(' ').filter(word => word.trim()).length,
          error: null
        }))
        setEditedTranscript(transcriptText)

        // Transition to edit mode
        setTimeout(() => {
          setIsEditMode(true)
          textareaRef.current?.focus()
        }, 500)
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
  const handleCancelRecording = () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current)
      durationTimerRef.current = null
    }

    setState({
      duration: 0,
      transcript: '',
      interimTranscript: '',
      isTranscribing: false,
      isStreamingMode: false,
      isProcessing: false,
      error: null,
      confidence: 0,
      wordCount: 0
    })
    setEditedTranscript('')
    setIsEditMode(false)
    setStreamingWords([])
    onCancelRecording()
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
        isStreamingMode: false,
        isProcessing: false,
        error: null,
        confidence: 0,
        wordCount: 0
      })
      setEditedTranscript('')
      setIsEditMode(false)
      setStreamingWords([])
    }
  }

  // Handle re-record
  const handleReRecord = () => {
    setState({
      duration: 0,
      transcript: '',
      interimTranscript: '',
      isTranscribing: false,
      isStreamingMode: false,
      isProcessing: false,
      error: null,
      confidence: 0,
      wordCount: 0
    })
    setEditedTranscript('')
    setIsEditMode(false)
    setStreamingWords([])
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current)
      }
    }
  }, [])

  // Don't render anything if not open
  if (!isOpen) {
    return null
  }

  // Typing animation component for streaming text
  const TypingText = ({ text, className = "" }: { text: string; className?: string }) => {
    const [displayedText, setDisplayedText] = useState("")
    const [currentIndex, setCurrentIndex] = useState(0)

    useEffect(() => {
      if (currentIndex < text.length) {
        const timeout = setTimeout(() => {
          setDisplayedText(text.substring(0, currentIndex + 1))
          setCurrentIndex(currentIndex + 1)
        }, 50)
        return () => clearTimeout(timeout)
      }
    }, [text, currentIndex])

    useEffect(() => {
      setDisplayedText("")
      setCurrentIndex(0)
    }, [text])

    return (
      <span className={className}>
        {displayedText}
        {currentIndex < text.length && (
          <span className="animate-pulse text-blue-400">|</span>
        )}
      </span>
    )
  }

  return (
    <div className="flex flex-col h-full bg-black bg-opacity-50 backdrop-blur-xl text-white relative overflow-hidden">
      {/* Animated background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse delay-700" />
        <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-indigo-500/10 rounded-full mix-blend-normal filter blur-[96px] animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-6 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
            {isRecording ? (
              <Mic className="w-4 h-4 text-white animate-pulse" />
            ) : (
              <MicOff className="w-4 h-4 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white/90">
              Voice Recording
            </h2>
            <p className="text-xs text-white/50">
              {state.isStreamingMode ? 'Real-time transcription' : 'Standard mode'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white/90 transition-all duration-200 p-2 rounded-lg hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {/* Recording Interface */}
          {!isEditMode && !state.error && (
            <div className="space-y-6">
              {/* Status Header */}
              <div className="text-center mb-8">
                <div className="text-2xl font-medium text-white/90 mb-3">
                  {isRecording ? 'Listening...' : state.isTranscribing ? 'Processing...' : 'Ready to Record'}
                </div>
                <div className="text-3xl font-mono text-blue-400 mb-2">
                  {formatDuration(state.duration)}
                </div>
                {state.confidence > 0 && (
                  <div className="text-sm text-white/60">
                    Confidence: {Math.round(state.confidence * 100)}%
                  </div>
                )}
              </div>

              {/* Real-time Transcription Display */}
              {(state.interimTranscript || state.transcript || state.isTranscribing) && (
                <div className="mb-8">
                  <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6 min-h-[200px] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-2xl" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <Sparkles className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-medium text-white/70">
                            {state.interimTranscript ? 'Live Transcription' : 'Final Transcription'}
                          </span>
                        </div>
                        {state.wordCount > 0 && (
                          <span className="text-xs text-white/50">
                            {state.wordCount} words
                          </span>
                        )}
                      </div>

                      <div
                        ref={interimTextRef}
                        className="text-white/90 leading-relaxed min-h-[120px] text-base"
                      >
                        {state.transcript && (
                          <div className="text-white/90 mb-2">
                            {state.transcript}
                          </div>
                        )}
                        {state.interimTranscript && (
                          <div className="text-blue-300/80 italic">
                            <TypingText text={state.interimTranscript} />
                          </div>
                        )}
                        {!state.interimTranscript && !state.transcript && state.isTranscribing && (
                          <div className="text-white/60 italic text-center py-8">
                            <div className="flex items-center justify-center space-x-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Processing your speech...</span>
                            </div>
                          </div>
                        )}
                        {!state.interimTranscript && !state.transcript && !state.isTranscribing && (
                          <div className="text-white/40 italic text-center py-8">
                            Your transcription will appear here as you speak...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Audio Visualizer */}
              <div className="mb-8 flex justify-center">
                <div className="relative">
                  <AudioVisualizer
                    isRecording={isRecording}
                    width={140}
                    height={140}
                    barCount={40}
                    barColor="#3b82f6"
                    style="circular"
                    showVADStatus={true}
                    vadStatus={vadStatus}
                  />
                  {isRecording && (
                    <div className="absolute inset-0 rounded-full border-2 border-blue-400/30 animate-ping" />
                  )}
                </div>
              </div>

              {/* Status Text */}
              <p className="text-sm text-white/60 text-center mb-8">
                {isRecording
                  ? state.isStreamingMode
                    ? 'Speak clearly - transcription is happening in real-time'
                    : 'Speak clearly into your microphone'
                  : state.isTranscribing
                  ? 'Converting speech to text...'
                  : 'Click Start Recording to begin'
                }
              </p>

              {/* Controls */}
              <div className="flex justify-center space-x-4">
                {!isRecording && !state.isTranscribing && (
                  <button
                    onClick={onStartRecording}
                    className="group relative flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl text-sm font-medium transition-all duration-200 transform hover:scale-105 shadow-lg shadow-blue-500/25"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-200" />
                    <Mic className="w-5 h-5 mr-2" />
                    Start Recording
                  </button>
                )}

                {isRecording && (
                  <>
                    <button
                      onClick={handleStopRecording}
                      className="group relative flex items-center px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl text-sm font-medium transition-all duration-200 transform hover:scale-105 shadow-lg shadow-red-500/25"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-600 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-200" />
                      <Square className="w-4 h-4 mr-2" />
                      Stop Recording
                    </button>
                    <button
                      onClick={handleCancelRecording}
                      className="group relative flex items-center px-6 py-3 bg-white/10 hover:bg-white/20 text-white/90 rounded-xl text-sm font-medium transition-all duration-200 border border-white/20 hover:border-white/30"
                    >
                      Cancel
                    </button>
                  </>
                )}

                {state.isTranscribing && (
                  <div className="flex items-center text-white/70 text-sm backdrop-blur-xl bg-white/5 px-6 py-3 rounded-xl border border-white/10">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Transcribing...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Enhanced Transcript Editing */}
          {isEditMode && state.transcript && !state.error && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Edit3 className="w-5 h-5 text-blue-400" />
                  <h3 className="text-xl font-medium text-white/90">Edit Your Transcript</h3>
                </div>
                <p className="text-sm text-white/60">
                  Review and edit the transcribed text before sending
                </p>
              </div>

              <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-2xl" />
                <div className="relative z-10">
                  <label className="block text-sm font-medium text-white/70 mb-3">
                    Transcript:
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={editedTranscript}
                    onChange={(e) => setEditedTranscript(e.target.value)}
                    className="w-full h-40 p-4 text-base bg-black/20 border border-white/20 text-white/90 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 placeholder-white/30 backdrop-blur-sm transition-all duration-200"
                    placeholder="Your transcribed text will appear here..."
                  />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4 text-sm text-white/50">
                  <span>{editedTranscript.length} characters</span>
                  <span>•</span>
                  <span>{editedTranscript.split(' ').filter(word => word.trim()).length} words</span>
                  {state.confidence > 0 && (
                    <>
                      <span>•</span>
                      <span>Confidence: {Math.round(state.confidence * 100)}%</span>
                    </>
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleReRecord}
                    className="group relative flex items-center px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white/90 rounded-xl text-sm font-medium transition-all duration-200 border border-white/20 hover:border-white/30"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Re-record
                  </button>
                  <button
                    onClick={handleSendTranscript}
                    disabled={!editedTranscript.trim()}
                    className="group relative flex items-center px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 disabled:text-white/40 text-white rounded-xl text-sm font-medium transition-all duration-200 transform hover:scale-105 shadow-lg shadow-blue-500/25 disabled:shadow-none disabled:transform-none"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-200" />
                    <Send className="w-4 h-4 mr-2" />
                    Send to AI
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Error Display */}
          {state.error && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="backdrop-blur-xl bg-red-500/10 border border-red-500/30 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-red-600/5 rounded-2xl" />
                <div className="relative z-10">
                  <div className="text-red-400 mb-4">
                    <p className="text-base font-medium mb-2">Recording Error</p>
                    <p className="text-sm text-red-300/80">{state.error}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleReRecord}
                  className="group relative flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl text-sm font-medium transition-all duration-200 transform hover:scale-105 shadow-lg shadow-blue-500/25"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-200" />
                  Try Again
                </button>
                <button
                  onClick={handleCancelRecording}
                  className="group relative flex items-center px-6 py-3 bg-white/10 hover:bg-white/20 text-white/90 rounded-xl text-sm font-medium transition-all duration-200 border border-white/20 hover:border-white/30"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VoiceRecordingModal

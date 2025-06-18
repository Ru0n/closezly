/**
 * ipcHandlers.ts
 *
 * Manages IPC (Inter-Process Communication) between the main and renderer processes.
 * Sets up handlers for IPC events from the renderer process.
 */

import { ipcMain } from 'electron'
import AppState from './AppState'
import WindowHelper, { COMPACT_WINDOW_HEIGHT, EXPANDED_WINDOW_HEIGHT, WINDOW_WIDTH } from './WindowHelper'
import ScreenshotHelper from './ScreenshotHelper'
import AuthHelper from './AuthHelper'
import AIInteractionService from './AIInteractionService'
import AudioCaptureService from './AudioCaptureService'
import VoiceQueryService from './VoiceQueryService'
import RealTimeVoiceService from './RealTimeVoiceService'
import PermissionHelper from './PermissionHelper'
import ModalWindowManager from './ModalWindowManager'

interface ManualQueryPayload {
  queryText: string
}

interface WindowPositionPayload {
  deltaX: number
  deltaY: number
}

interface WindowSizePayload {
  width: number
  height: number
}

interface TranscriptSegmentPayload {
  speaker: 'user' | 'customer'
  text: string
  timestamp: string
}

function setupIpcHandlers(): void {
  // Toggle overlay visibility
  ipcMain.on('closezly:toggle-visibility', (event) => {
    const isVisible = WindowHelper.toggleVisibility()
    AppState.setOverlayVisibility(isVisible)
    event.returnValue = isVisible
  })

  // Take screenshot and process
  ipcMain.handle('closezly:take-screenshot-and-process', async () => {
    try {
      // Temporarily hide the overlay to take the screenshot
      const wasVisible = WindowHelper.isVisible()
      if (wasVisible) {
        WindowHelper.setVisibility(false)
      }

      // Wait a moment for the window to hide
      await new Promise(resolve => setTimeout(resolve, 100))

      // Restore the overlay visibility
      if (wasVisible) {
        WindowHelper.setVisibility(true)
      }

      // Process screenshot with AI
      console.log('[IPC] Processing screenshot with AI...')
      const response = await AIInteractionService.processScreenshotContext()

      if (response.success) {
        return {
          success: true,
          suggestions: response.suggestions,
          response: response.response
        }
      } else {
        return {
          success: false,
          error: response.error || 'Failed to process screenshot'
        }
      }
    } catch (error) {
      console.error('Error taking screenshot:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // Process manual query
  ipcMain.handle('closezly:process-manual-query', async (event, payload: ManualQueryPayload) => {
    try {
      const { queryText } = payload

      console.log('[IPC] Processing manual query:', queryText)

      // Process query with AI
      const response = await AIInteractionService.processManualQuery(queryText)

      if (response.success) {
        return {
          success: true,
          suggestions: response.suggestions,
          response: response.response
        }
      } else {
        return {
          success: false,
          error: response.error || 'Failed to process query'
        }
      }
    } catch (error) {
      console.error('[IPC] Error processing manual query:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // Set window position
  ipcMain.on('closezly:set-window-position', (event, payload: WindowPositionPayload) => {
    const { deltaX, deltaY } = payload
    WindowHelper.moveWindow(deltaX, deltaY)
    event.returnValue = WindowHelper.getPosition()
  })

  // Position window at the top of the screen
  ipcMain.on('closezly:position-at-top', (event) => {
    WindowHelper.positionAtTop()
    event.returnValue = WindowHelper.getPosition()
  })

  // Resize window from content
  ipcMain.on('closezly:resize-window-from-content', (event, payload: WindowSizePayload) => {
    // Always ensure width is at least WINDOW_WIDTH to fit all elements
    const { height } = payload
    const width = Math.max(payload.width, WINDOW_WIDTH)

    WindowHelper.setSize({ width, height })

    // Set resizable based on height
    if (height === EXPANDED_WINDOW_HEIGHT) {
      WindowHelper.setResizable(true)
    } else if (height === COMPACT_WINDOW_HEIGHT) {
      WindowHelper.setResizable(false)
    }
    // If it's some other intermediate height, you might decide whether it should be resizable or not.
    // For now, only explicitly making it resizable when fully expanded, and non-resizable when compact.

    event.returnValue = WindowHelper.getSize()
  })

  // Handle hover-based expansion
  ipcMain.on('closezly:set-hover-expand', (event, expand: boolean) => {
    WindowHelper.setHoverExpand(expand);
    event.returnValue = undefined; // For sendSync, indicate success
  })

  // Get authentication status
  ipcMain.handle('closezly:get-auth-status', async () => {
    return {
      isAuthenticated: AuthHelper.isAuthenticated(),
      user: AppState.getUser()
    }
  })

  // Open login page
  ipcMain.on('closezly:open-login-page', (event) => {
    AuthHelper.openLoginPage()
    event.returnValue = true
  })

  // Logout
  ipcMain.on('closezly:logout', (event) => {
    AuthHelper.clearTokens()
    event.returnValue = true
  })

  // Refresh user profile
  ipcMain.handle('closezly:refresh-user-profile', async () => {
    const success = await AuthHelper.refreshUserProfile()
    return {
      success,
      user: AppState.getUser()
    }
  })

  // Add transcript segment
  ipcMain.on('closezly:add-transcript-segment', (event, payload: TranscriptSegmentPayload) => {
    AppState.addTranscriptSegment(payload)
    event.returnValue = true
  })

  // Start call
  ipcMain.on('closezly:start-call', async (event) => {
    try {
      AppState.startCall()

      // Start audio capture for multimodal processing
      const audioStarted = await AudioCaptureService.startCapture()
      console.log(`[IPC] Call started - Audio capture: ${audioStarted ? 'enabled' : 'disabled'}`)

      event.returnValue = true
    } catch (error) {
      console.error('[IPC] Error starting call:', error)
      event.returnValue = false
    }
  })

  // End call
  ipcMain.on('closezly:end-call', async (event) => {
    try {
      AppState.endCall()

      // Stop audio capture
      await AudioCaptureService.stopCapture()
      console.log('[IPC] Call ended - Audio capture stopped')

      event.returnValue = true
    } catch (error) {
      console.error('[IPC] Error ending call:', error)
      event.returnValue = false
    }
  })

  // Get app state
  ipcMain.handle('closezly:get-app-state', async () => {
    return {
      isAuthenticated: AppState.isAuthenticated(),
      user: AppState.getUser(),
      overlayVisible: AppState.isOverlayVisible(),
      isProcessing: AppState.isProcessing(),
      activeCall: AppState.getActiveCall(),
      currentSuggestions: AppState.getSuggestions(),
      crmContext: AppState.getCRMContext(),
      currentQuery: AppState.getCurrentQuery()
    }
  })

  // Audio capture handlers
  ipcMain.handle('closezly:start-audio-capture', async () => {
    try {
      const result = await AudioCaptureService.startCapture()
      return { success: result }
    } catch (error) {
      console.error('[IPC] Error starting audio capture:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('closezly:stop-audio-capture', async () => {
    try {
      await AudioCaptureService.stopCapture()
      return { success: true }
    } catch (error) {
      console.error('[IPC] Error stopping audio capture:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('closezly:get-audio-status', async () => {
    return AudioCaptureService.getCaptureStatus()
  })

  // Audio chunk handler for real-time processing
  ipcMain.on('audio-chunk', (event, chunkData) => {
    try {
      // Convert base64 back to Buffer
      const audioBuffer = Buffer.from(chunkData.data, 'base64')

      // Forward directly to RealTimeVoiceService instead of AudioCaptureService
      const voiceService = RealTimeVoiceService.getInstance()

      // Only forward if RealTimeVoiceService is actively recording
      const status = voiceService.getStatus()
      if (status && status.isRecording) {
        voiceService.receiveAudioData(audioBuffer)
      }

      // Log for debugging (more frequently during initial testing)
      if (Math.random() < 0.1) { // Log ~10% of chunks for debugging
        console.log(`[IPC] Received audio chunk: ${audioBuffer.length} bytes from ${chunkData.source}`)
      }
    } catch (error) {
      console.error('[IPC] Error handling audio chunk:', error)
    }
  })

  // Voice query handlers
  ipcMain.handle('closezly:start-voice-query', async (event, options = {}) => {
    try {
      const result = await VoiceQueryService.startVoiceQuery(options)
      return { success: result }
    } catch (error) {
      console.error('[IPC] Error starting voice query:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('closezly:stop-voice-query', async () => {
    try {
      const result = await VoiceQueryService.stopVoiceQuery()
      return result
    } catch (error) {
      console.error('[IPC] Error stopping voice query:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('closezly:get-voice-query-status', async () => {
    return {
      isRecording: VoiceQueryService.isRecordingActive(),
      duration: VoiceQueryService.getRecordingDuration()
    }
  })

  // Multimodal AI processing handlers
  ipcMain.handle('closezly:trigger-multimodal-assistance', async () => {
    try {
      const response = await AIInteractionService.processMultimodalAssistance()
      return response
    } catch (error) {
      console.error('[IPC] Error triggering multimodal assistance:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // AI interaction handlers
  ipcMain.handle('closezly:handle-objection', async (event, objectionText: string) => {
    try {
      const response = await AIInteractionService.handleObjection(objectionText)
      return response
    } catch (error) {
      console.error('[IPC] Error handling objection:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('closezly:process-multimodal-assistance', async (event, queryText?: string) => {
    try {
      const response = await AIInteractionService.processMultimodalAssistance(queryText)
      return response
    } catch (error) {
      console.error('[IPC] Error processing multimodal assistance:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('closezly:get-ai-status', async () => {
    return {
      isProcessing: AIInteractionService.isCurrentlyProcessing()
    }
  })

  // Permission management handlers
  ipcMain.handle('closezly:check-permission', async (event, mediaType: string) => {
    try {
      const result = await PermissionHelper.checkPermission(mediaType as any)
      return { success: true, ...result }
    } catch (error) {
      console.error('[IPC] Error checking permission:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('closezly:request-permission', async (event, mediaType: string) => {
    try {
      const result = await PermissionHelper.requestPermission(mediaType as any)
      return { success: true, ...result }
    } catch (error) {
      console.error('[IPC] Error requesting permission:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('closezly:check-all-permissions', async () => {
    try {
      const result = await PermissionHelper.checkAllRequiredPermissions()
      return { success: true, ...result }
    } catch (error) {
      console.error('[IPC] Error checking all permissions:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('closezly:show-permission-status', async () => {
    try {
      await PermissionHelper.showPermissionStatusDialog()
      return { success: true }
    } catch (error) {
      console.error('[IPC] Error showing permission status:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('closezly:open-specific-privacy-settings', async (event, mediaType: string) => {
    try {
      await PermissionHelper.openSpecificPrivacySettings(mediaType as any)
      return { success: true }
    } catch (error) {
      console.error('[IPC] Error opening specific privacy settings:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // Real-time voice recording handlers
  ipcMain.handle('closezly:start-voice-recording', async (event, options = {}) => {
    try {
      const voiceService = RealTimeVoiceService.getInstance()

      // Set up event forwarding for this session
      const forwardEvent = (eventName: string, data?: any) => {
        event.sender.send(`closezly:voice-recording-${eventName}`, data)
      }

      // Custom event forwarding for frontend window events using IPC
      const forwardWindowEvent = (eventName: string, data?: any) => {
        try {
          // Safely serialize data, handling potential circular references and non-serializable properties
          const safeData = data ? {
            text: data.text || '',
            confidence: typeof data.confidence === 'number' ? data.confidence : 0,
            isProcessing: Boolean(data.isProcessing),
            timestamp: data.timestamp || Date.now(),
            // Only include serializable properties
            ...(data.segments && Array.isArray(data.segments) ? { segments: data.segments } : {}),
            ...(data.words && Array.isArray(data.words) ? { words: data.words } : {})
          } : {}

          console.log(`[IPC] Forwarding window event '${eventName}' with data:`, safeData)

          // Get the main window from AppState
          const mainWindow = AppState.getMainWindow()
          if (!mainWindow) {
            console.error('[IPC] Main window not available for event forwarding.')
            return
          }

          // Send event to the main window's renderer process
          mainWindow.webContents.send('window-event', {
            eventName,
            data: safeData
          })

          console.log(`[IPC] Window event '${eventName}' sent successfully via IPC`)
        } catch (error) {
          console.error('[IPC] Error in forwardWindowEvent:', error)
        }
      }

      // Remove any existing listeners to avoid duplicates
      voiceService.removeAllListeners('recording-started')
      voiceService.removeAllListeners('recording-stopped')
      voiceService.removeAllListeners('transcription-started')
      voiceService.removeAllListeners('transcription-completed')
      voiceService.removeAllListeners('interim-transcription')
      voiceService.removeAllListeners('streaming-error')
      voiceService.removeAllListeners('streaming-fallback')
      voiceService.removeAllListeners('recording-error')

      // Add event listeners for real-time updates
      voiceService.once('recording-started', (data: any) => {
        forwardEvent('started', data)
        console.log('[IPC] Voice recording started, streaming mode:', data?.streamingMode)
      })

      voiceService.once('recording-stopped', (data: any) => {
        forwardEvent('stopped', data)
        console.log('[IPC] Voice recording stopped')
      })

      voiceService.once('transcription-started', () => {
        forwardEvent('transcription-started')
        console.log('[IPC] Transcription started')
      })

      voiceService.on('transcription-completed', (result: any) => {
        forwardEvent('transcription-completed', result)
        forwardWindowEvent('final-transcription', result)
        console.log('[IPC] Transcription completed:', result?.text?.substring(0, 50) + '...')
      })

      // Real-time streaming events
      voiceService.on('interim-transcription', (result: any) => {
        forwardEvent('interim-transcription', result)
        forwardWindowEvent('interim-transcription', result)
        console.log('[IPC] Interim transcription:', result?.text?.substring(0, 30) + '...')
      })

      // Phase 2.1: New streaming events
      voiceService.on('streaming-transcription', (result: any) => {
        forwardEvent('streaming-transcription', result)
        forwardWindowEvent('streaming-transcription', result)
        console.log('[IPC] Streaming transcription:', result?.text?.substring(0, 30) + '...')
      })

      voiceService.on('live-transcription', (result: any) => {
        forwardEvent('live-transcription', result)
        forwardWindowEvent('live-transcription', result)
        console.log('[IPC] Live transcription:', result?.text?.substring(0, 50) + '...')
      })

      voiceService.on('streaming-error', (error: any) => {
        forwardEvent('streaming-error', { error: error.message })
        forwardWindowEvent('streaming-error', { error: error.message })
        console.warn('[IPC] Streaming error:', error.message)
      })

      voiceService.on('streaming-fallback', (error: any) => {
        forwardEvent('streaming-fallback', { error: error.message })
        console.log('[IPC] Streaming fallback to batch mode:', error.message)
      })

      voiceService.once('recording-error', (error: any) => {
        forwardEvent('error', { error: error.message })
        console.error('[IPC] Recording error:', error.message)
      })

      const result = await voiceService.startRecording(options)



      return { success: result }
    } catch (error) {
      console.error('[IPC] Error starting voice recording:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('closezly:stop-voice-recording', async () => {
    try {
      const voiceService = RealTimeVoiceService.getInstance()
      const result = await voiceService.stopRecording()
      return result
    } catch (error) {
      console.error('[IPC] Error stopping voice recording:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('closezly:get-voice-recording-status', async () => {
    try {
      const voiceService = RealTimeVoiceService.getInstance()
      const status = voiceService.getStatus()
      const streamingStatus = voiceService.getStreamingStatus()
      return {
        success: true,
        ...status,
        streaming: streamingStatus
      }
    } catch (error) {
      console.error('[IPC] Error getting voice recording status:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('closezly:cancel-voice-recording', async () => {
    try {
      const voiceService = RealTimeVoiceService.getInstance()
      const result = await voiceService.cancelRecording()
      return { success: result }
    } catch (error) {
      console.error('[IPC] Error cancelling voice recording:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // VAD status forwarding from renderer to main window and RealTimeVoiceService
  ipcMain.on('closezly:vad-status', (event, vadStatus) => {
    try {
      // Forward VAD status to RealTimeVoiceService for speech-triggered transcription
      const voiceService = RealTimeVoiceService.getInstance()

      // Only forward if RealTimeVoiceService is actively recording
      const status = voiceService.getStatus()
      if (status && status.isRecording) {
        voiceService.receiveVADStatus(vadStatus)
      }

      // Forward VAD status to all renderer processes for UI updates
      const mainWindow = WindowHelper.getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.send('vad-status', vadStatus)
      }
    } catch (error) {
      console.error('[IPC] Error forwarding VAD status:', error)
    }
  })

  // Modal window management handlers
  ipcMain.handle('closezly:create-modal', async (event, modalId: string, options: any) => {
    try {
      const parentWindow = WindowHelper.getMainWindow()
      const modalWindow = ModalWindowManager.createModalWindow(modalId, options, parentWindow || undefined)
      return { success: true, modalId }
    } catch (error) {
      console.error('[IPC] Error creating modal window:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('closezly:close-modal', async (event, modalId: string) => {
    try {
      const closed = ModalWindowManager.closeModal(modalId)
      return { success: closed }
    } catch (error) {
      console.error('[IPC] Error closing modal window:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('closezly:is-modal-open', async (event, modalId: string) => {
    try {
      const isOpen = ModalWindowManager.isModalOpen(modalId)
      return { success: true, isOpen }
    } catch (error) {
      console.error('[IPC] Error checking modal status:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('closezly:update-modal-options', async (event, modalId: string, options: any) => {
    try {
      const updated = ModalWindowManager.updateModalOptions(modalId, options)
      return { success: updated }
    } catch (error) {
      console.error('[IPC] Error updating modal options:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('closezly:focus-modal', async (event, modalId: string) => {
    try {
      const focused = ModalWindowManager.focusModal(modalId)
      return { success: focused }
    } catch (error) {
      console.error('[IPC] Error focusing modal window:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // Voice recording modal window handlers removed - now using inline interface
}

export default setupIpcHandlers

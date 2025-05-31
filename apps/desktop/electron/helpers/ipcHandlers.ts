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
import PermissionHelper from './PermissionHelper'

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
}

export default setupIpcHandlers

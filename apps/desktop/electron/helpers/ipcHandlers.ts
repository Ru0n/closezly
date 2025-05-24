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

      // Capture the screen
      const screenshotBase64 = await ScreenshotHelper.captureFullScreen()

      // Restore the overlay visibility
      if (wasVisible) {
        WindowHelper.setVisibility(true)
      }

      // Optimize the image for LLM processing
      const optimizedImage = await ScreenshotHelper.optimizeImageForLLM(screenshotBase64)

      return { success: true, image: optimizedImage }
    } catch (error) {
      console.error('Error taking screenshot:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // Process manual query
  ipcMain.handle('closezly:process-manual-query', async (event, payload: ManualQueryPayload) => {
    try {
      const { queryText } = payload

      // Update the current query in AppState
      AppState.setCurrentQuery(queryText)

      // Set processing state
      AppState.setProcessing(true)

      // TODO: Implement actual query processing with backend API
      // This is a placeholder for now
      console.log('Processing manual query:', queryText)

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Mock response for now
      const mockSuggestions = [
        {
          id: '1',
          text: `Response to query: "${queryText}"`,
          type: 'information' as const
        }
      ]

      // Update suggestions in AppState
      AppState.setSuggestions(mockSuggestions)

      // Reset processing state
      AppState.setProcessing(false)

      return { success: true, suggestions: mockSuggestions }
    } catch (error) {
      console.error('Error processing manual query:', error)
      AppState.setProcessing(false)
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
  ipcMain.on('closezly:start-call', (event) => {
    AppState.startCall()
    event.returnValue = true
  })

  // End call
  ipcMain.on('closezly:end-call', (event) => {
    AppState.endCall()
    event.returnValue = true
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
}

export default setupIpcHandlers

/**
 * ScreenshotHelper.ts
 *
 * Manages screen capture functionality for the Closezly desktop application.
 * Handles capturing screenshots of the desktop or specific windows.
 */

import { desktopCapturer, screen } from 'electron'
import AppState from './AppState'
import PermissionHelper from './PermissionHelper'

class ScreenshotHelper {
  private static instance: ScreenshotHelper

  private constructor() {}

  public static getInstance(): ScreenshotHelper {
    if (!ScreenshotHelper.instance) {
      ScreenshotHelper.instance = new ScreenshotHelper()
    }
    return ScreenshotHelper.instance
  }

  /**
   * Checks if screen recording permission is granted
   * @returns Promise<boolean> True if permission is granted
   */
  private async checkScreenRecordingPermission(): Promise<{
    granted: boolean
    status: string
    userGuidance?: string
  }> {
    try {
      const permissionResult = await PermissionHelper.checkPermission('screen')

      return {
        granted: permissionResult.status === 'granted',
        status: permissionResult.status,
        userGuidance: permissionResult.userGuidance
      }
    } catch (error) {
      console.error('[Screenshot] Error checking screen recording permission:', error)
      return {
        granted: false,
        status: 'unknown',
        userGuidance: 'Unable to check screen recording permission. Please verify permissions in System Preferences.'
      }
    }
  }

  /**
   * Captures a screenshot of the entire primary display
   * @returns Promise<string> Base64 encoded image data
   */
  public async captureFullScreen(): Promise<string> {
    try {
      // Set processing state
      AppState.setProcessing(true)

      console.log('[Screenshot] Attempting to capture full screen...')

      // Check screen recording permission first
      const permissionCheck = await this.checkScreenRecordingPermission()
      if (!permissionCheck.granted) {
        const errorMessage = `Screen recording permission ${permissionCheck.status}. ${permissionCheck.userGuidance || 'Please grant permission in System Preferences.'}`
        console.error('[Screenshot] Permission denied:', errorMessage)
        AppState.setProcessing(false)
        throw new Error(errorMessage)
      }

      console.log('[Screenshot] Screen recording permission granted, proceeding with capture...')

      // Get the primary display
      const primaryDisplay = screen.getPrimaryDisplay()
      const { width, height } = primaryDisplay.size

      console.log(`[Screenshot] Primary display size: ${width}x${height}`)

      // Get all available sources
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width, height }
      })

      console.log(`[Screenshot] Found ${sources.length} screen sources`)

      if (sources.length === 0) {
        const errorMessage = 'No screen sources available despite permission being granted. This may indicate a system issue. Please try restarting the application or check System Preferences > Security & Privacy > Privacy > Screen Recording.'
        console.error('[Screenshot]', errorMessage)
        AppState.setProcessing(false)
        throw new Error(errorMessage)
      }

      // Find the primary display source
      const primarySource = sources.find(source => source.name === 'Entire Screen' ||
                                                  source.name === 'Screen 1' ||
                                                  source.id.includes('screen'))

      if (!primarySource || !primarySource.thumbnail) {
        throw new Error('Failed to capture primary screen - no valid source found')
      }

      console.log(`[Screenshot] Using screen source: ${primarySource.name}`)

      // Convert the thumbnail to base64
      const base64Image = primarySource.thumbnail.toDataURL()

      // Reset processing state
      AppState.setProcessing(false)

      return base64Image
    } catch (error) {
      console.error('Error capturing full screen:', error)
      AppState.setProcessing(false)
      throw error
    }
  }

  /**
   * Captures a screenshot of the active window
   * @returns Promise<string> Base64 encoded image data
   */
  public async captureActiveWindow(): Promise<string> {
    try {
      // Set processing state
      AppState.setProcessing(true)

      console.log('[Screenshot] Attempting to capture active window...')

      // Check screen recording permission first
      const permissionCheck = await this.checkScreenRecordingPermission()
      if (!permissionCheck.granted) {
        const errorMessage = `Screen recording permission ${permissionCheck.status}. ${permissionCheck.userGuidance || 'Please grant permission in System Preferences.'}`
        console.error('[Screenshot] Permission denied for window capture:', errorMessage)
        AppState.setProcessing(false)
        throw new Error(errorMessage)
      }

      console.log('[Screenshot] Screen recording permission granted, proceeding with window capture...')

      // Get all available window sources with larger thumbnail for better quality
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 1920, height: 1080 },
        fetchWindowIcons: false // Optimize performance
      })

      console.log(`[Screenshot] Found ${sources.length} window sources`)

      if (sources.length === 0) {
        console.warn('[Screenshot] No window sources available despite permission being granted.')
        console.warn('[Screenshot] This may indicate a system issue. Falling back to full screen capture...')
        return this.captureFullScreen()
      }

      // Log all available windows for debugging
      sources.forEach((source, index) => {
        const thumbnailSize = source.thumbnail ? source.thumbnail.getSize() : { width: 0, height: 0 }
        console.log(`[Screenshot] Window ${index}: "${source.name}" - ${thumbnailSize.width}x${thumbnailSize.height}`)
      })

      // Filter out our own window and find the most relevant window
      const filteredSources = sources.filter(source => {
        const isOwnWindow = source.name.toLowerCase().includes('closezly') ||
                           source.name.toLowerCase().includes('electron')
        const hasValidThumbnail = source.thumbnail &&
                                 source.thumbnail.getSize().width > 100 &&
                                 source.thumbnail.getSize().height > 100
        const hasValidData = source.thumbnail &&
                            source.thumbnail.toDataURL().length > 100

        console.log(`[Screenshot] Evaluating "${source.name}": isOwnWindow=${isOwnWindow}, hasValidThumbnail=${hasValidThumbnail}, hasValidData=${hasValidData}`)

        return !isOwnWindow && hasValidThumbnail && hasValidData
      })

      const activeWindow = filteredSources[0]

      if (!activeWindow || !activeWindow.thumbnail) {
        console.warn('[Screenshot] No suitable active window found after filtering, falling back to full screen')
        console.warn('[Screenshot] Available windows:', sources.map(s => s.name))
        return this.captureFullScreen()
      }

      console.log(`[Screenshot] Capturing window: ${activeWindow.name}`)

      // Convert the thumbnail to base64
      const base64Image = activeWindow.thumbnail.toDataURL()

      // Debug: Check the captured image data
      console.log('[Screenshot] Raw image data info:', {
        dataLength: base64Image.length,
        hasDataPrefix: base64Image.startsWith('data:'),
        format: base64Image.match(/^data:image\/([a-z]+);base64,/)?.[1] || 'unknown',
        preview: base64Image.substring(0, 100) + '...'
      })

      // Validate the captured image
      if (!base64Image || base64Image.length < 100) {
        console.error('[Screenshot] Captured image data is too small or invalid:', {
          length: base64Image?.length || 0,
          data: base64Image
        })
        throw new Error('Screenshot capture returned invalid or empty data')
      }

      // Reset processing state
      AppState.setProcessing(false)

      console.log('[Screenshot] Active window captured successfully')
      return base64Image
    } catch (error) {
      console.error('[Screenshot] Error capturing active window:', error)
      AppState.setProcessing(false)

      // Try fallback to full screen
      try {
        console.log('[Screenshot] Attempting fallback to full screen capture...')
        return await this.captureFullScreen()
      } catch (fallbackError) {
        console.error('[Screenshot] Fallback to full screen also failed:', fallbackError)
        const errorMessage = error instanceof Error ? error.message : String(error)
        const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        throw new Error(`Failed to capture screenshot: ${errorMessage}. Fallback also failed: ${fallbackErrorMessage}`)
      }
    }
  }

  /**
   * Safely captures a screenshot with comprehensive error handling and fallbacks
   * @param preferWindow Whether to prefer window capture over full screen
   * @returns Promise<string | null> Base64 encoded image data or null if capture fails
   */
  public async captureScreenshotSafely(preferWindow: boolean = true): Promise<string | null> {
    try {
      console.log('[Screenshot] Starting safe screenshot capture...')

      // Check permission first
      const permissionCheck = await this.checkScreenRecordingPermission()
      if (!permissionCheck.granted) {
        console.error('[Screenshot] Cannot capture screenshot - permission not granted:', permissionCheck.status)

        // Attempt to request permission guidance
        if (permissionCheck.status === 'not-determined' || permissionCheck.status === 'denied') {
          try {
            await PermissionHelper.requestPermission('screen')
          } catch (requestError) {
            console.warn('[Screenshot] Permission request failed:', requestError)
          }
        }

        return null
      }

      // Try preferred capture method first
      if (preferWindow) {
        try {
          console.log('[Screenshot] Attempting window capture...')
          return await this.captureActiveWindow()
        } catch (windowError) {
          console.warn('[Screenshot] Window capture failed, trying full screen:', windowError)
          try {
            return await this.captureFullScreen()
          } catch (fullScreenError) {
            console.error('[Screenshot] Both window and full screen capture failed')
            return null
          }
        }
      } else {
        try {
          console.log('[Screenshot] Attempting full screen capture...')
          return await this.captureFullScreen()
        } catch (fullScreenError) {
          console.warn('[Screenshot] Full screen capture failed, trying window capture:', fullScreenError)
          try {
            return await this.captureActiveWindow()
          } catch (windowError) {
            console.error('[Screenshot] Both full screen and window capture failed')
            return null
          }
        }
      }
    } catch (error) {
      console.error('[Screenshot] Safe capture failed with unexpected error:', error)
      return null
    }
  }

  /**
   * Gets the current permission status for screen recording
   * @returns Promise<object> Permission status information
   */
  public async getPermissionStatus(): Promise<{
    granted: boolean
    status: string
    userGuidance?: string
    canRequest: boolean
  }> {
    try {
      const permissionResult = await PermissionHelper.checkPermission('screen')
      return {
        granted: permissionResult.status === 'granted',
        status: permissionResult.status,
        userGuidance: permissionResult.userGuidance,
        canRequest: permissionResult.canRequest
      }
    } catch (error) {
      console.error('[Screenshot] Error getting permission status:', error)
      return {
        granted: false,
        status: 'unknown',
        userGuidance: 'Unable to check screen recording permission.',
        canRequest: false
      }
    }
  }

  /**
   * Optimizes a base64 image for sending to the LLM
   * @param base64Image Base64 encoded image data
   * @returns Promise<string> Optimized base64 image
   */
  public async optimizeImageForLLM(base64Image: string): Promise<string> {
    try {
      console.log('[Screenshot] Starting image optimization for LLM...')
      console.log('[Screenshot] Input image info:', {
        totalLength: base64Image.length,
        hasDataPrefix: base64Image.startsWith('data:'),
        format: base64Image.match(/^data:image\/([a-z]+);base64,/)?.[1] || 'unknown'
      })

      // Extract the image data from the data URL
      const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '')
      console.log('[Screenshot] Extracted base64 data length:', base64Data.length)

      const imageBuffer = Buffer.from(base64Data, 'base64')
      console.log('[Screenshot] Image buffer size:', imageBuffer.length, 'bytes')

      // For now, we'll implement basic optimization without external libraries
      // In production, consider using Sharp or similar for better optimization

      // Check image size and compress if too large
      const maxSizeKB = 500 // 500KB limit for LLM
      const currentSizeKB = imageBuffer.length / 1024

      if (currentSizeKB <= maxSizeKB) {
        console.log(`[Screenshot] Image size OK: ${currentSizeKB.toFixed(1)}KB`)
        return base64Image
      }

      console.log(`[Screenshot] Image too large: ${currentSizeKB.toFixed(1)}KB, needs optimization`)

      // Simple compression by reducing quality (this is a basic implementation)
      // In a real scenario, you'd use proper image processing libraries
      const compressionRatio = Math.sqrt(maxSizeKB / currentSizeKB)

      // For now, return the original image with a warning
      // TODO: Implement proper image compression with Sharp or Jimp
      console.warn('[Screenshot] Image compression not fully implemented - returning original')

      return base64Image
    } catch (error) {
      console.error('[Screenshot] Error optimizing image:', error)
      // Return the original image if optimization fails
      return base64Image
    }
  }

  /**
   * Saves a screenshot temporarily for preview purposes
   * @param base64Image Base64 encoded image data
   * @returns Promise<string> File path to saved image
   */
  public async saveTemporaryScreenshot(base64Image: string): Promise<string> {
    try {
      const { app } = require('electron')
      const fs = require('fs')
      const path = require('path')

      // Create temp directory if it doesn't exist
      const tempDir = path.join(app.getPath('userData'), 'temp_screenshots')
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }

      // Generate unique filename
      const timestamp = Date.now()
      const filename = `screenshot_${timestamp}.png`
      const filePath = path.join(tempDir, filename)

      // Extract base64 data and save
      const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '')
      const imageBuffer = Buffer.from(base64Data, 'base64')

      fs.writeFileSync(filePath, imageBuffer)

      console.log(`[Screenshot] Saved temporary screenshot: ${filePath}`)
      return filePath
    } catch (error) {
      console.error('[Screenshot] Error saving temporary screenshot:', error)
      throw error
    }
  }

  /**
   * Cleans up old temporary screenshots
   */
  public cleanupTemporaryScreenshots(): void {
    try {
      const { app } = require('electron')
      const fs = require('fs')
      const path = require('path')

      const tempDir = path.join(app.getPath('userData'), 'temp_screenshots')

      if (!fs.existsSync(tempDir)) {
        return
      }

      const files = fs.readdirSync(tempDir)
      const now = Date.now()
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours

      files.forEach((file: string) => {
        const filePath = path.join(tempDir, file)
        const stats = fs.statSync(filePath)

        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath)
          console.log(`[Screenshot] Cleaned up old screenshot: ${file}`)
        }
      })
    } catch (error) {
      console.error('[Screenshot] Error cleaning up temporary screenshots:', error)
    }
  }

  /**
   * Gets metadata about a screenshot
   * @param base64Image Base64 encoded image data
   * @returns Object with image metadata
   */
  public getImageMetadata(base64Image: string): {
    sizeKB: number
    format: string
    isOptimized: boolean
  } {
    try {
      const base64Data = base64Image.replace(/^data:image\/([a-z]+);base64,/, '')
      const format = base64Image.match(/^data:image\/([a-z]+);base64,/)?.[1] || 'unknown'
      const imageBuffer = Buffer.from(base64Data, 'base64')
      const sizeKB = imageBuffer.length / 1024

      return {
        sizeKB: Math.round(sizeKB * 100) / 100,
        format,
        isOptimized: sizeKB <= 500 // Consider optimized if under 500KB
      }
    } catch (error) {
      console.error('[Screenshot] Error getting image metadata:', error)
      return {
        sizeKB: 0,
        format: 'unknown',
        isOptimized: false
      }
    }
  }
}

export default ScreenshotHelper.getInstance()

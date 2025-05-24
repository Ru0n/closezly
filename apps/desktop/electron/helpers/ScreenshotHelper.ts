/**
 * ScreenshotHelper.ts
 * 
 * Manages screen capture functionality for the Closezly desktop application.
 * Handles capturing screenshots of the desktop or specific windows.
 */

import { desktopCapturer, screen } from 'electron'
import AppState from './AppState'

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
   * Captures a screenshot of the entire primary display
   * @returns Promise<string> Base64 encoded image data
   */
  public async captureFullScreen(): Promise<string> {
    try {
      // Set processing state
      AppState.setProcessing(true)
      
      // Get the primary display
      const primaryDisplay = screen.getPrimaryDisplay()
      const { width, height } = primaryDisplay.size
      
      // Get all available sources
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width, height }
      })
      
      // Find the primary display source
      const primarySource = sources.find(source => source.name === 'Entire Screen' || 
                                                  source.name === 'Screen 1' || 
                                                  source.id.includes('screen'))
      
      if (!primarySource || !primarySource.thumbnail) {
        throw new Error('Failed to capture primary screen')
      }
      
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
      
      // Get all available window sources
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 1280, height: 720 }
      })
      
      // Find the active window (first in the list is usually the active one)
      const activeWindow = sources[0]
      
      if (!activeWindow || !activeWindow.thumbnail) {
        // Fallback to full screen if active window can't be determined
        return this.captureFullScreen()
      }
      
      // Convert the thumbnail to base64
      const base64Image = activeWindow.thumbnail.toDataURL()
      
      // Reset processing state
      AppState.setProcessing(false)
      
      return base64Image
    } catch (error) {
      console.error('Error capturing active window:', error)
      AppState.setProcessing(false)
      throw error
    }
  }

  /**
   * Optimizes a base64 image for sending to the LLM
   * @param base64Image Base64 encoded image data
   * @returns Promise<string> Optimized base64 image
   */
  public async optimizeImageForLLM(base64Image: string): Promise<string> {
    try {
      // In a real implementation, we would use a Node.js image processing library
      // like Sharp or Jimp to resize and optimize the image.
      // For now, we'll just return the original image.
      
      // TODO: Implement image optimization with a Node.js library
      console.log('Image optimization not implemented in main process yet')
      
      return base64Image
    } catch (error) {
      console.error('Error optimizing image:', error)
      // Return the original image if optimization fails
      return base64Image
    }
  }
}

export default ScreenshotHelper.getInstance()

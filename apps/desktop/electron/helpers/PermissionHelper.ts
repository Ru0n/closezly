/**
 * PermissionHelper.ts
 *
 * Manages macOS system permissions for screen recording, microphone access, etc.
 * Provides permission checking, user guidance, and error handling for Electron app permissions.
 */

import { systemPreferences, dialog, shell } from 'electron'
import { EventEmitter } from 'events'

export type PermissionStatus = 'granted' | 'denied' | 'not-determined' | 'restricted' | 'unknown'
export type MediaType = 'microphone' | 'camera' | 'screen'

interface PermissionCheckResult {
  status: PermissionStatus
  canRequest: boolean
  requiresManualGrant: boolean
  userGuidance?: string
}

class PermissionHelper extends EventEmitter {
  private static instance: PermissionHelper
  private permissionCache: Map<MediaType, { status: PermissionStatus; timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 5000 // 5 seconds cache to avoid excessive system calls

  private constructor() {
    super()
  }

  public static getInstance(): PermissionHelper {
    if (!PermissionHelper.instance) {
      PermissionHelper.instance = new PermissionHelper()
    }
    return PermissionHelper.instance
  }

  /**
   * Checks the current permission status for a media type
   */
  public async checkPermission(mediaType: MediaType): Promise<PermissionCheckResult> {
    try {
      // Check cache first
      const cached = this.permissionCache.get(mediaType)
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return this.buildPermissionResult(mediaType, cached.status)
      }

      // Get fresh permission status
      const status = systemPreferences.getMediaAccessStatus(mediaType)
      
      // Update cache
      this.permissionCache.set(mediaType, {
        status,
        timestamp: Date.now()
      })

      console.log(`[Permission] ${mediaType} permission status: ${status}`)
      
      return this.buildPermissionResult(mediaType, status)
    } catch (error) {
      console.error(`[Permission] Error checking ${mediaType} permission:`, error)
      return {
        status: 'unknown',
        canRequest: false,
        requiresManualGrant: true,
        userGuidance: `Unable to check ${mediaType} permission. Please check System Preferences manually.`
      }
    }
  }

  /**
   * Attempts to request permission for supported media types
   */
  public async requestPermission(mediaType: MediaType): Promise<PermissionCheckResult> {
    try {
      // Screen recording cannot be requested programmatically
      if (mediaType === 'screen') {
        return await this.handleScreenRecordingPermission()
      }

      // For microphone and camera, we can request permission
      if (mediaType === 'microphone' || mediaType === 'camera') {
        console.log(`[Permission] Requesting ${mediaType} permission...`)
        const granted = await systemPreferences.askForMediaAccess(mediaType)
        
        const newStatus: PermissionStatus = granted ? 'granted' : 'denied'
        
        // Update cache
        this.permissionCache.set(mediaType, {
          status: newStatus,
          timestamp: Date.now()
        })

        this.emit('permission-changed', mediaType, newStatus)
        
        return this.buildPermissionResult(mediaType, newStatus)
      }

      throw new Error(`Unsupported media type: ${mediaType}`)
    } catch (error) {
      console.error(`[Permission] Error requesting ${mediaType} permission:`, error)
      return {
        status: 'unknown',
        canRequest: false,
        requiresManualGrant: true,
        userGuidance: `Failed to request ${mediaType} permission. Please check System Preferences manually.`
      }
    }
  }

  /**
   * Handles screen recording permission which requires manual user action
   */
  private async handleScreenRecordingPermission(): Promise<PermissionCheckResult> {
    const currentStatus = await this.checkPermission('screen')
    
    if (currentStatus.status === 'granted') {
      return currentStatus
    }

    // Show user guidance dialog for screen recording permission
    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'Screen Recording Permission Required',
      message: 'Closezly needs screen recording permission to capture screenshots for AI analysis.',
      detail: 'To enable this feature:\n\n1. Open System Preferences\n2. Go to Security & Privacy\n3. Click on Privacy tab\n4. Select "Screen Recording" from the list\n5. Check the box next to Closezly\n6. Restart the application\n\nWould you like to open System Preferences now?',
      buttons: ['Open System Preferences', 'Cancel', 'Check Again'],
      defaultId: 0,
      cancelId: 1
    })

    if (result.response === 0) {
      // Open System Preferences to Privacy & Security
      await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture')
    } else if (result.response === 2) {
      // Check permission status again
      this.permissionCache.delete('screen') // Clear cache to force fresh check
      return await this.checkPermission('screen')
    }

    return currentStatus
  }

  /**
   * Builds a permission result object with appropriate guidance
   */
  private buildPermissionResult(mediaType: MediaType, status: PermissionStatus): PermissionCheckResult {
    const result: PermissionCheckResult = {
      status,
      canRequest: false,
      requiresManualGrant: false
    }

    switch (mediaType) {
      case 'screen':
        result.requiresManualGrant = true
        if (status !== 'granted') {
          result.userGuidance = 'Screen recording permission must be granted manually in System Preferences > Security & Privacy > Privacy > Screen Recording'
        }
        break

      case 'microphone':
      case 'camera':
        result.canRequest = status === 'not-determined'
        if (status === 'denied') {
          result.requiresManualGrant = true
          result.userGuidance = `${mediaType} permission was denied. Please enable it in System Preferences > Security & Privacy > Privacy > ${mediaType === 'microphone' ? 'Microphone' : 'Camera'}`
        }
        break
    }

    return result
  }

  /**
   * Checks if all required permissions are granted
   */
  public async checkAllRequiredPermissions(): Promise<{
    allGranted: boolean
    results: Record<MediaType, PermissionCheckResult>
  }> {
    const mediaTypes: MediaType[] = ['screen', 'microphone']
    const results: Record<MediaType, PermissionCheckResult> = {} as any

    for (const mediaType of mediaTypes) {
      results[mediaType] = await this.checkPermission(mediaType)
    }

    const allGranted = Object.values(results).every(result => result.status === 'granted')

    return { allGranted, results }
  }

  /**
   * Shows a comprehensive permission status dialog
   */
  public async showPermissionStatusDialog(): Promise<void> {
    const { allGranted, results } = await this.checkAllRequiredPermissions()

    if (allGranted) {
      await dialog.showMessageBox({
        type: 'info',
        title: 'Permissions Status',
        message: 'All required permissions are granted!',
        detail: 'Closezly has access to screen recording and microphone.',
        buttons: ['OK']
      })
      return
    }

    const missingPermissions = Object.entries(results)
      .filter(([_, result]) => result.status !== 'granted')
      .map(([mediaType, result]) => `• ${mediaType}: ${result.status}`)
      .join('\n')

    await dialog.showMessageBox({
      type: 'warning',
      title: 'Missing Permissions',
      message: 'Some permissions are not granted:',
      detail: `${missingPermissions}\n\nPlease grant these permissions in System Preferences for full functionality.`,
      buttons: ['Open System Preferences', 'OK'],
      defaultId: 0
    }).then(result => {
      if (result.response === 0) {
        shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy')
      }
    })
  }

  /**
   * Opens specific macOS privacy settings for a given permission type
   */
  public async openSpecificPrivacySettings(mediaType: MediaType): Promise<void> {
    let settingsUrl: string

    switch (mediaType) {
      case 'screen':
        settingsUrl = 'x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_ScreenCapture'
        break
      case 'microphone':
        settingsUrl = 'x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_Microphone'
        break
      case 'camera':
        settingsUrl = 'x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_Camera'
        break
      default:
        // Fallback to general privacy settings
        settingsUrl = 'x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy'
        break
    }

    try {
      await shell.openExternal(settingsUrl)
      console.log(`[Permission] Opened ${mediaType} privacy settings: ${settingsUrl}`)
    } catch (error) {
      console.error(`[Permission] Failed to open ${mediaType} privacy settings:`, error)
      // Fallback to general privacy settings
      await shell.openExternal('x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy')
    }
  }

  /**
   * Clears the permission cache to force fresh checks
   */
  public clearCache(): void {
    this.permissionCache.clear()
    console.log('[Permission] Permission cache cleared')
  }

  /**
   * Gets cached permission status without making system calls
   */
  public getCachedPermissionStatus(mediaType: MediaType): PermissionStatus | null {
    const cached = this.permissionCache.get(mediaType)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.status
    }
    return null
  }
}

export default PermissionHelper.getInstance()

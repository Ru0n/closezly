/**
 * ShortcutsHelper.ts
 *
 * Manages global keyboard shortcuts for the Closezly desktop application.
 * Handles registration and handling of shortcuts for toggling overlay visibility,
 * triggering manual AI queries, and controlling audio capture.
 */

import { globalShortcut } from 'electron'
import AppState from './AppState'
import WindowHelper from './WindowHelper'

class ShortcutsHelper {
  private static instance: ShortcutsHelper
  private registeredShortcuts: string[] = []

  private constructor() {}

  public static getInstance(): ShortcutsHelper {
    if (!ShortcutsHelper.instance) {
      ShortcutsHelper.instance = new ShortcutsHelper()
    }
    return ShortcutsHelper.instance
  }

  public registerShortcuts(): void {
    this.registerToggleOverlayShortcut()
    this.registerTriggerAIQueryShortcut()
    this.registerToggleCallRecordingShortcut()
    this.registerMoveOverlayShortcuts()
  }

  public unregisterAllShortcuts(): void {
    this.registeredShortcuts.forEach(shortcut => {
      globalShortcut.unregister(shortcut)
    })
    this.registeredShortcuts = []
  }

  private registerShortcut(accelerator: string, callback: () => void): void {
    try {
      globalShortcut.register(accelerator, callback)
      this.registeredShortcuts.push(accelerator)
      console.log(`Registered shortcut: ${accelerator}`)
    } catch (error) {
      console.error(`Failed to register shortcut: ${accelerator}`, error)
    }
  }

  private registerToggleOverlayShortcut(): void {
    // Toggle overlay visibility with Alt+H
    this.registerShortcut('Alt+H', () => {
      const isVisible = WindowHelper.toggleVisibility()
      AppState.setOverlayVisibility(isVisible)

      // Notify the renderer process about the change
      const mainWindow = WindowHelper.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('closezly:visibility-changed-by-hotkey', isVisible)
      }
    })
  }

  private registerTriggerAIQueryShortcut(): void {
    // Trigger AI query with Alt+Q
    this.registerShortcut('Alt+Q', () => {
      if (!AppState.isOverlayVisible()) {
        WindowHelper.setVisibility(true)
        AppState.setOverlayVisibility(true)
      }

      // Take screenshot and process
      const mainWindow = WindowHelper.getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.send('closezly:trigger-ai-query')
      }
    })
  }

  private registerToggleCallRecordingShortcut(): void {
    // Toggle call recording with Alt+R
    this.registerShortcut('Alt+R', () => {
      const activeCall = AppState.getActiveCall()

      if (activeCall.isActive) {
        AppState.endCall()
      } else {
        AppState.startCall()
      }

      const mainWindow = WindowHelper.getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.send('closezly:call-recording-toggled', AppState.getActiveCall().isActive)
      }
    })
  }

  private registerMoveOverlayShortcuts(): void {
    // Move overlay with Alt+Arrow keys (increased movement distance)
    this.registerShortcut('Alt+Up', () => {
      WindowHelper.moveWindow(0, -50)
    })

    this.registerShortcut('Alt+Down', () => {
      WindowHelper.moveWindow(0, 50)
    })

    this.registerShortcut('Alt+Left', () => {
      WindowHelper.moveWindow(-50, 0)
    })

    this.registerShortcut('Alt+Right', () => {
      WindowHelper.moveWindow(50, 0)
    })

    // Add Shift+Alt+Arrow for larger movements
    this.registerShortcut('Shift+Alt+Up', () => {
      WindowHelper.moveWindow(0, -100)
    })

    this.registerShortcut('Shift+Alt+Down', () => {
      WindowHelper.moveWindow(0, 100)
    })

    this.registerShortcut('Shift+Alt+Left', () => {
      WindowHelper.moveWindow(-100, 0)
    })

    this.registerShortcut('Shift+Alt+Right', () => {
      WindowHelper.moveWindow(100, 0)
    })
  }
}

export default ShortcutsHelper.getInstance()

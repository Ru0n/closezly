/**
 * main.ts
 *
 * Main entry point for the Electron application.
 * Handles application lifecycle, window creation, and IPC setup.
 */

import { app, BrowserWindow, screen } from 'electron'
import path from 'path'
import WindowHelper from './helpers/WindowHelper'
import ShortcutsHelper from './helpers/ShortcutsHelper'
import setupIpcHandlers from './helpers/ipcHandlers'
import AppState from './helpers/AppState'
import AuthHelper from './helpers/AuthHelper'

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit()
}

// Prevent multiple instances of the app
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', async (event, commandLine) => {
    // Someone tried to run a second instance, focus our window instead
    const mainWindow = WindowHelper.getMainWindow()
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }

    // Check if this is a protocol activation (Windows)
    if (process.platform === 'win32') {
      // Find the URL in the command line arguments
      const url = commandLine.find(arg => arg.startsWith('closezly://'))
      if (url) {
        try {
          const success = await AuthHelper.handleAuthCallback(url)
          if (success) {
            WindowHelper.setVisibility(true)
          }
        } catch (error) {
          console.error('Error handling auth callback in second-instance:', error)
        }
      }
    }
  })
}

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Setup IPC handlers
setupIpcHandlers()

// Create the main window when Electron is ready
app.whenReady().then(() => {
  // Create the main window
  WindowHelper.createMainWindow()

  // Ensure the window is visible across all workspaces and screens
  WindowHelper.ensureVisibilityAcrossWorkspaces()

  // Set initial transparency
  WindowHelper.setTransparency(true)

  // Start the interval to keep the window always on top
  WindowHelper.startAlwaysOnTopInterval()

  // Register global shortcuts
  ShortcutsHelper.registerShortcuts()

  // Register custom protocol handler for authentication
  app.setAsDefaultProtocolClient('closezly')

  // Handle protocol activation (macOS)
  app.on('open-url', async (event, url) => {
    event.preventDefault()
    // Pass the URL to AuthHelper for processing
    try {
      const success = await AuthHelper.handleAuthCallback(url)
      if (success) {
        // Show the main window if it was successful
        WindowHelper.setVisibility(true)
      }
    } catch (error) {
      console.error('Error handling auth callback in main process:', error)
    }
  })

  // Add event listeners for app focus events
  app.on('browser-window-focus', () => {
    // Re-assert always-on-top status when any window gains focus
    WindowHelper.ensureVisibilityAcrossWorkspaces()
  })

  app.on('browser-window-blur', () => {
    // Re-assert always-on-top status when any window loses focus
    WindowHelper.ensureVisibilityAcrossWorkspaces()
  })

  // Additional event listeners for app activation
  app.on('activate', () => {
    // Re-assert always-on-top status when app is activated
    WindowHelper.ensureVisibilityAcrossWorkspaces()
  })

  // Listen for display changes
  screen.on('display-added', () => {
    WindowHelper.ensureVisibilityAcrossWorkspaces()
  })

  screen.on('display-removed', () => {
    WindowHelper.ensureVisibilityAcrossWorkspaces()
  })

  screen.on('display-metrics-changed', () => {
    WindowHelper.ensureVisibilityAcrossWorkspaces()
  })

  // On macOS, recreate the window when the dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      WindowHelper.createMainWindow()
      WindowHelper.ensureVisibilityAcrossWorkspaces()
      WindowHelper.setTransparency(true)
      WindowHelper.startAlwaysOnTopInterval()
    }
  })
})

// Clean up before quitting
app.on('will-quit', () => {
  // Unregister all shortcuts
  ShortcutsHelper.unregisterAllShortcuts()

  // Stop the always-on-top interval
  WindowHelper.stopAlwaysOnTopInterval()
})

// Log that the main process has started
console.log('Closezly Electron Main Process started')
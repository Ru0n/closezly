/**
 * ModalWindowManager.ts
 *
 * Manages modal windows that are independent of the main window constraints.
 * Provides a system for creating properly sized and positioned modal dialogs.
 */

import { BrowserWindow, screen } from 'electron'
import path from 'path'

export interface ModalWindowOptions {
  width?: number
  height?: number
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  resizable?: boolean
  title?: string
  modal?: boolean
  alwaysOnTop?: boolean
  center?: boolean
  parent?: BrowserWindow
  webPreferences?: any
}

export interface ModalWindowInfo {
  id: string
  window: BrowserWindow
  options: ModalWindowOptions
}

class ModalWindowManager {
  private static instance: ModalWindowManager
  private modalWindows: Map<string, ModalWindowInfo> = new Map()
  private isDevelopment = process.env.NODE_ENV !== 'production'

  private constructor() {}

  public static getInstance(): ModalWindowManager {
    if (!ModalWindowManager.instance) {
      ModalWindowManager.instance = new ModalWindowManager()
    }
    return ModalWindowManager.instance
  }

  /**
   * Creates a new modal window with the specified options
   */
  public createModalWindow(
    modalId: string,
    options: ModalWindowOptions = {},
    parentWindow?: BrowserWindow
  ): BrowserWindow {
    // Close existing modal with the same ID if it exists
    this.closeModal(modalId)

    // Get screen dimensions for proper centering
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize

    // Default options for modal windows
    const defaultOptions: ModalWindowOptions = {
      width: 800,
      height: 600,
      minWidth: 400,
      minHeight: 300,
      resizable: true,
      modal: true,
      center: true,
      alwaysOnTop: false,
      title: 'Closezly'
    }

    // Merge provided options with defaults
    const finalOptions = { ...defaultOptions, ...options }

    // Calculate position if not centering automatically
    let x: number | undefined
    let y: number | undefined
    
    if (!finalOptions.center) {
      x = Math.floor((screenWidth - (finalOptions.width || 800)) / 2)
      y = Math.floor((screenHeight - (finalOptions.height || 600)) / 2)
    }

    // Create the modal window
    const modalWindow = new BrowserWindow({
      width: finalOptions.width,
      height: finalOptions.height,
      minWidth: finalOptions.minWidth,
      minHeight: finalOptions.minHeight,
      maxWidth: finalOptions.maxWidth,
      maxHeight: finalOptions.maxHeight,
      x,
      y,
      center: finalOptions.center,
      resizable: finalOptions.resizable,
      modal: finalOptions.modal,
      alwaysOnTop: finalOptions.alwaysOnTop,
      parent: parentWindow || undefined,
      title: finalOptions.title,
      frame: true, // Modal windows should have frames
      transparent: false, // Modal windows should not be transparent
      skipTaskbar: false, // Modal windows can appear in taskbar
      hasShadow: true, // Modal windows should have shadows
      focusable: true,
      webPreferences: {
        preload: path.join(__dirname, '../preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        sandbox: true,
        ...finalOptions.webPreferences
      }
    })

    // Load the app content
    if (this.isDevelopment) {
      // In development, load from the dev server with a modal parameter
      modalWindow.loadURL(`http://localhost:5173?modal=${modalId}`)

      // Note: DevTools auto-opening disabled to prevent unwanted developer windows
      // Developers can manually open DevTools if needed via View menu or keyboard shortcuts
    } else {
      // In production, load from the built files with modal parameter
      modalWindow.loadFile(path.join(__dirname, '../../index.html'), {
        query: { modal: modalId }
      })
    }

    // Store the modal window info
    const modalInfo: ModalWindowInfo = {
      id: modalId,
      window: modalWindow,
      options: finalOptions
    }
    this.modalWindows.set(modalId, modalInfo)

    // Handle window close
    modalWindow.on('closed', () => {
      this.modalWindows.delete(modalId)
    })

    // Ensure the modal is properly focused
    modalWindow.once('ready-to-show', () => {
      modalWindow.show()
      modalWindow.focus()
    })

    console.log(`[ModalWindowManager] Created modal window: ${modalId}`)
    return modalWindow
  }

  /**
   * Gets a modal window by ID
   */
  public getModal(modalId: string): BrowserWindow | null {
    const modalInfo = this.modalWindows.get(modalId)
    return modalInfo ? modalInfo.window : null
  }

  /**
   * Closes a modal window by ID
   */
  public closeModal(modalId: string): boolean {
    const modalInfo = this.modalWindows.get(modalId)
    if (modalInfo && !modalInfo.window.isDestroyed()) {
      modalInfo.window.close()
      this.modalWindows.delete(modalId)
      console.log(`[ModalWindowManager] Closed modal window: ${modalId}`)
      return true
    }
    return false
  }

  /**
   * Closes all modal windows
   */
  public closeAllModals(): void {
    for (const [modalId, modalInfo] of this.modalWindows) {
      if (!modalInfo.window.isDestroyed()) {
        modalInfo.window.close()
      }
    }
    this.modalWindows.clear()
    console.log('[ModalWindowManager] Closed all modal windows')
  }

  /**
   * Gets all active modal windows
   */
  public getAllModals(): ModalWindowInfo[] {
    return Array.from(this.modalWindows.values()).filter(
      modalInfo => !modalInfo.window.isDestroyed()
    )
  }

  /**
   * Checks if a modal window exists and is open
   */
  public isModalOpen(modalId: string): boolean {
    const modalInfo = this.modalWindows.get(modalId)
    return modalInfo ? !modalInfo.window.isDestroyed() && modalInfo.window.isVisible() : false
  }

  /**
   * Updates modal window options (for supported properties)
   */
  public updateModalOptions(modalId: string, options: Partial<ModalWindowOptions>): boolean {
    const modalInfo = this.modalWindows.get(modalId)
    if (!modalInfo || modalInfo.window.isDestroyed()) {
      return false
    }

    const { window } = modalInfo

    // Update supported properties
    if (options.width !== undefined || options.height !== undefined) {
      window.setSize(
        options.width || window.getSize()[0],
        options.height || window.getSize()[1]
      )
    }

    if (options.resizable !== undefined) {
      window.setResizable(options.resizable)
    }

    if (options.alwaysOnTop !== undefined) {
      window.setAlwaysOnTop(options.alwaysOnTop)
    }

    if (options.title !== undefined) {
      window.setTitle(options.title)
    }

    // Update stored options
    modalInfo.options = { ...modalInfo.options, ...options }

    return true
  }

  /**
   * Centers a modal window on the screen
   */
  public centerModal(modalId: string): boolean {
    const modalInfo = this.modalWindows.get(modalId)
    if (!modalInfo || modalInfo.window.isDestroyed()) {
      return false
    }

    modalInfo.window.center()
    return true
  }

  /**
   * Brings a modal window to front
   */
  public focusModal(modalId: string): boolean {
    const modalInfo = this.modalWindows.get(modalId)
    if (!modalInfo || modalInfo.window.isDestroyed()) {
      return false
    }

    modalInfo.window.focus()
    return true
  }
}

export default ModalWindowManager.getInstance()

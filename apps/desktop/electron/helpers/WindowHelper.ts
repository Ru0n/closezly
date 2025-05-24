/**
 * WindowHelper.ts
 *
 * Manages the overlay window for the Closezly desktop application.
 * Handles window creation, visibility, positioning, sizing, and transparency.
 */

import { BrowserWindow, screen } from 'electron'
import path from 'path'
import AppState from './AppState'

// Define constants for window dimensions
export const COMPACT_WINDOW_HEIGHT = 40; // px, for header only
export const EXPANDED_WINDOW_HEIGHT = 700; // px, for header + body
export const WINDOW_WIDTH = 650; // px, minimum width to ensure all elements are visible
// APP_SETTINGS_HEIGHT will be EXPANDED_WINDOW_HEIGHT for this feature
export const APP_SETTINGS_HEIGHT = EXPANDED_WINDOW_HEIGHT;

interface WindowPosition {
  x: number
  y: number
}

interface WindowSize {
  width: number
  height: number
}

class WindowHelper {
  private static instance: WindowHelper
  private mainWindow: BrowserWindow | null = null
  private isDevelopment = process.env.NODE_ENV !== 'production'
  private isManuallyPositioned: boolean = false
  private isHoverExpanded: boolean = false;
  private baseHeight: number = COMPACT_WINDOW_HEIGHT; // Initialize with compact height
  // Commented out unused property - will be used in future implementation
  // private previousHeightBeforeHover: number | null = null;

  private constructor() {}

  public static getInstance(): WindowHelper {
    if (!WindowHelper.instance) {
      WindowHelper.instance = new WindowHelper()
    }
    return WindowHelper.instance
  }

  public createMainWindow(): BrowserWindow {
    // Get the primary display dimensions
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width } = primaryDisplay.workAreaSize
    // const { height } = primaryDisplay.workAreaSize // Unused

    // Get the bounds of the primary display (includes menu bar area)
    // const displayBounds = primaryDisplay.bounds // Unused

    // Calculate top center position
    const initialWindowHeight = COMPACT_WINDOW_HEIGHT; // Use compact height initially
    const centerX = Math.floor((width - WINDOW_WIDTH) / 2)

    // Use workArea.y to position the window at the top visible edge (below menu bar)
    // See: https://github.com/electron/electron/blob/main/docs/breaking-changes.md#_snippet_123
    const topY = primaryDisplay.workArea.y

    // Debug logging for display geometry
    console.log('[WindowHelper] primaryDisplay.workArea:', primaryDisplay.workArea)
    console.log('[WindowHelper] primaryDisplay.bounds:', primaryDisplay.bounds)
    console.log('[WindowHelper] Calculated topY:', topY)

    // Create the browser window
    this.mainWindow = new BrowserWindow({
      width: WINDOW_WIDTH,
      height: initialWindowHeight, // Use initial compact height
      x: centerX, // Center horizontally
      y: topY, // Position at the top visible edge (below menu bar)
      frame: false, // No window frame
      transparent: true, // Transparent background
      resizable: false,
      alwaysOnTop: true, // Always on top of other windows
      skipTaskbar: true, // Don't show in taskbar
      hasShadow: false, // Remove window shadow for better transparency
      focusable: true, // Make it focusable so it can receive input
      webPreferences: {
        preload: path.join(__dirname, '../preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        sandbox: true
      }
    })

    // Set the window to be non-focusable in production
    // This allows clicks to pass through to the window underneath
    if (!this.isDevelopment) {
      this.mainWindow.setIgnoreMouseEvents(true, { forward: true })
    }

    // Load the app
    if (this.isDevelopment) {
      // In development, load from the dev server
      this.mainWindow.loadURL('http://localhost:5173')

      // Open DevTools in development
      this.mainWindow.webContents.openDevTools({ mode: 'detach' })
    } else {
      // In production, load from the built files
      this.mainWindow.loadFile(path.join(__dirname, '../../index.html'))
    }

    // Update AppState with the main window reference
    AppState.setMainWindow(this.mainWindow)

    // Set initial visibility based on AppState
    this.setVisibility(AppState.isOverlayVisible())

    // Handle window close
    this.mainWindow.on('closed', () => {
      this.mainWindow = null
    })

    // AGGRESSIVE HIDE ON BLUR (DIAGNOSTIC)
    this.mainWindow.on('blur', () => {
      if (this.mainWindow && !AppState.isOverlayVisible() && !this.mainWindow.webContents.isDevToolsFocused()) {
        console.log('[WindowHelper DEBUG] Window blurred while AppState.isOverlayVisible is false. Forcing hide.');
        this.mainWindow.hide();
        this.mainWindow.setFocusable(false);
      }
    });

    return this.mainWindow
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  public setVisibility(visible: boolean): void {
    if (!this.mainWindow) return

    if (visible) {
      this.mainWindow.setFocusable(true); // Make focusable before showing
      this.mainWindow.show()
      // In production, we need to handle mouse events differently
      if (!this.isDevelopment) {
        // When visible, we want to capture mouse events for the overlay UI
        this.mainWindow.setIgnoreMouseEvents(false)
      }
      // It's often good to explicitly focus after showing, especially if it was non-focusable
      // However, be cautious if this causes issues with other focus-dependent UI elements.
      // this.mainWindow.focus();
    } else {
      this.mainWindow.hide()
      this.mainWindow.setFocusable(false); // Make non-focusable after hiding
      // In production, when hidden, we want to ignore mouse events
      if (!this.isDevelopment) {
        this.mainWindow.setIgnoreMouseEvents(true, { forward: true })
      }
    }
  }

  public toggleVisibility(): boolean {
    const newVisibility = !this.isVisible()
    this.setVisibility(newVisibility)
    return newVisibility
  }

  public isVisible(): boolean {
    return this.mainWindow ? this.mainWindow.isVisible() : false
  }

  public setPosition(position: WindowPosition): void {
    if (!this.mainWindow) return
    this.mainWindow.setPosition(position.x, position.y)
    this.isManuallyPositioned = true
  }

  public getPosition(): WindowPosition {
    if (!this.mainWindow) return { x: 0, y: 0 }
    const [x, y] = this.mainWindow.getPosition()
    return { x, y }
  }

  public moveWindow(deltaX: number, deltaY: number): void {
    if (!this.mainWindow) return
    const currentPosition = this.getPosition()
    this.setPosition({
      x: currentPosition.x + deltaX,
      y: currentPosition.y + deltaY
    })
  }

  public setSize(size: WindowSize): void {
    if (!this.mainWindow) return
    this.mainWindow.setSize(size.width, size.height)
  }

  public getSize(): WindowSize {
    if (!this.mainWindow) return { width: 0, height: 0 }
    const [width, height] = this.mainWindow.getSize()
    return { width, height }
  }

  public setAlwaysOnTop(alwaysOnTop: boolean): void {
    if (!this.mainWindow) return
    this.mainWindow.setAlwaysOnTop(alwaysOnTop)
  }

  public setResizable(resizable: boolean): void {
    if (!this.mainWindow) return
    this.mainWindow.setResizable(resizable)
  }

  public setTransparency(transparent: boolean): void {
    if (!this.mainWindow) return
    // The BrowserWindow option `transparent: true` handles actual window transparency.
    // This method *could* control overall window content opacity if desired,
    // but for now, let's not force an opacity change here as it might conflict
    // with CSS opacity on elements like the header.
    // If you need to change overall window opacity, uncomment and adjust:
    // this.mainWindow.setOpacity(transparent ? 0.8 : 1.0)
    console.log(`[WindowHelper] setTransparency called with: ${transparent}. Opacity not changed by this method directly.`);
  }

  /**
   * Positions the window at the top of the screen
   */
  public positionAtTop(): void {
    if (!this.mainWindow) return

    // Get the primary display dimensions
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width } = primaryDisplay.workAreaSize
    const topY = primaryDisplay.workArea.y // Use workArea.y for top edge

    // Calculate center X position
    const [currentWidth] = this.mainWindow.getSize()
    const centerX = Math.floor((width - currentWidth) / 2)

    // Set position at the top visible edge (below menu bar)
    this.mainWindow.setPosition(centerX, topY)

    // Reset the manual positioning flag since this is an explicit repositioning
    this.isManuallyPositioned = false
  }

  public ensureVisibilityAcrossWorkspaces(): void {
    // If the overlay is not supposed to be visible according to AppState, do nothing.
    if (!AppState.isOverlayVisible()) {
      // Optionally, if it's not supposed to be visible, ensure it's actually hidden.
      // This might be redundant if setVisibility(false) was called correctly, but can be a safeguard.
      // if (this.mainWindow && this.mainWindow.isVisible()) {
      //   this.mainWindow.hide();
      //   this.mainWindow.setFocusable(false);
      // }
      return;
    }

    if (!this.mainWindow) return

    // Make sure it stays on top with the highest level
    // 'pop-up-menu' has a higher z-index than 'floating' for better visibility
    this.mainWindow.setAlwaysOnTop(true, 'pop-up-menu')

    // Set the window to be visible on all workspaces (macOS only)
    if (process.platform === 'darwin') {
      // For macOS, we need to set both visibleOnAllWorkspaces and level
      this.mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

      // For macOS, we need to use the correct approach for setting window levels
      // The 'pop-up-menu' level is already set above with setAlwaysOnTop, which is the correct way
      // to set window levels in Electron
    }

    // Force the window to show
    this.mainWindow.showInactive()

    // Only reposition the window if it hasn't been manually positioned
    if (!this.isManuallyPositioned) {
      this.positionAtTop()
    }
  }

  /**
   * Periodically reasserts the window's always-on-top status
   * This helps ensure the window stays visible across all applications
   */
  public startAlwaysOnTopInterval(): void {
    // Clear any existing interval
    this.stopAlwaysOnTopInterval()

    // Set up an interval to reassert always-on-top status every 1 second (more frequent checks)
    const intervalId = setInterval(() => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.ensureVisibilityAcrossWorkspaces()
      } else {
        this.stopAlwaysOnTopInterval()
      }
    }, 1000)

    // Store the interval ID for later cleanup
    // @ts-ignore - Adding a new property to the class
    this.alwaysOnTopIntervalId = intervalId
  }

  /**
   * Stops the always-on-top interval
   */
  public stopAlwaysOnTopInterval(): void {
    // @ts-ignore - Accessing the property we added
    if (this.alwaysOnTopIntervalId) {
      // @ts-ignore - Accessing the property we added
      clearInterval(this.alwaysOnTopIntervalId)
      // @ts-ignore - Accessing the property we added
      this.alwaysOnTopIntervalId = null
    }
  }

  /**
   * Resets the manual positioning flag
   * Call this when you want to allow automatic repositioning again
   */
  public resetManualPositioning(): void {
    this.isManuallyPositioned = false
  }

  /**
   * Checks if the window has been manually positioned
   * @returns boolean indicating if the window was manually positioned
   */
  public isWindowManuallyPositioned(): boolean {
    return this.isManuallyPositioned
  }

  public setHoverExpand(expand: boolean): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    if (expand) {
      if (!this.isHoverExpanded) { // Only store if not already hover-expanded
        // Store the actual current height before hover, could be compact or user-expanded
        // const currentHeight = this.mainWindow.getBounds().height;
        // Just using baseHeight instead of storing previous height
      }
      this.resizeWindow(WINDOW_WIDTH, APP_SETTINGS_HEIGHT); // Expand to settings height
      this.isHoverExpanded = true;
    } else {
      if (this.isHoverExpanded) {
        // When hover ends, restore to the current baseHeight (which might have been changed by a click)
        this.resizeWindow(WINDOW_WIDTH, this.baseHeight);
        this.isHoverExpanded = false;
        // Clear stored height (removed)
      }
    }
  }

  /**
   * Toggles the window between compact (header only) and expanded (header + body) states.
   */
  public toggleCompactExpand(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return

    if (this.baseHeight === COMPACT_WINDOW_HEIGHT) {
      this.baseHeight = EXPANDED_WINDOW_HEIGHT;
    } else {
      this.baseHeight = COMPACT_WINDOW_HEIGHT;
    }

    // If not currently hover-expanded, apply the new baseHeight immediately.
    // If hover-expanded, the new baseHeight will take effect when hover ends.
    if (!this.isHoverExpanded) {
      this.resizeWindow(WINDOW_WIDTH, this.baseHeight);
    }

    // Log the state change
    console.log(`[WindowHelper] Toggled compact/expand. New base height: ${this.baseHeight}px. Is hover expanded: ${this.isHoverExpanded}`);
  }

  /**
   * Resizes the window to the specified dimensions.
   * @param width The new width of the window (currently unused, keeping WINDOW_WIDTH).
   * @param height The new height of the window.
   */
  public resizeWindow(_width: number, height: number): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return

    const currentBounds = this.mainWindow.getBounds()
    // We only change height, width is fixed for now unless specified otherwise
    // Keep current x, y position
    this.mainWindow.setBounds({
        x: currentBounds.x,
        y: currentBounds.y,
        width: WINDOW_WIDTH, // Use constant WINDOW_WIDTH
        height: Math.round(height) // Ensure height is an integer
    })
    console.log(`[WindowHelper] Resized window to: ${WINDOW_WIDTH}x${Math.round(height)}`);
  }
}

export default WindowHelper.getInstance()

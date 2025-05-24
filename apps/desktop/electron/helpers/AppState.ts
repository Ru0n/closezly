/**
 * AppState.ts
 *
 * Singleton managing global app state for the Closezly desktop application.
 * Handles state management for authentication, UI state, active call context, etc.
 */

import { BrowserWindow } from 'electron'
import { EventEmitter } from 'events'

interface User {
  id: string
  email: string
  fullName?: string
  username?: string
  profilePictureUrl?: string
  subscriptionStatus?: 'free' | 'paid'
}

interface CallContext {
  isActive: boolean
  startTime?: Date
  transcriptSegments: TranscriptSegment[]
}

interface TranscriptSegment {
  speaker: 'user' | 'customer'
  text: string
  timestamp: string
}

interface Suggestion {
  id: string
  text: string
  type: 'objection-handling' | 'question-suggestion' | 'information' | 'next-steps'
  source?: string
}

interface CRMContext {
  contactInfo?: Record<string, any>
  accountInfo?: Record<string, any>
  opportunityInfo?: Record<string, any>
}

interface AppStateData {
  isAuthenticated: boolean
  user: User | null
  overlayVisible: boolean
  isProcessing: boolean
  activeCall: CallContext
  currentSuggestions: Suggestion[]
  crmContext: CRMContext
  currentQuery: string
}

class AppState extends EventEmitter {
  private static instance: AppState
  private mainWindow: BrowserWindow | null = null

  private state: AppStateData = {
    isAuthenticated: false,
    user: null,
    overlayVisible: true,
    isProcessing: false,
    activeCall: {
      isActive: false,
      transcriptSegments: []
    },
    currentSuggestions: [],
    crmContext: {},
    currentQuery: ''
  }

  private constructor() {
    super()
  }

  public static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState()
    }
    return AppState.instance
  }

  public setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  // Authentication methods
  public setAuthenticated(isAuthenticated: boolean, user?: User): void {
    this.state.isAuthenticated = isAuthenticated
    this.state.user = user || null
    this.emit('auth-changed', { isAuthenticated, user })
    this.syncStateToRenderer()
  }

  public isAuthenticated(): boolean {
    return this.state.isAuthenticated
  }

  public getUser(): User | null {
    return this.state.user
  }

  // Overlay visibility methods
  public toggleOverlayVisibility(): boolean {
    this.state.overlayVisible = !this.state.overlayVisible
    this.emit('overlay-visibility-changed', this.state.overlayVisible)
    this.syncStateToRenderer()
    return this.state.overlayVisible
  }

  public setOverlayVisibility(visible: boolean): void {
    this.state.overlayVisible = visible
    this.emit('overlay-visibility-changed', visible)
    this.syncStateToRenderer()
  }

  public isOverlayVisible(): boolean {
    return this.state.overlayVisible
  }

  // Call context methods
  public startCall(): void {
    this.state.activeCall = {
      isActive: true,
      startTime: new Date(),
      transcriptSegments: []
    }
    this.emit('call-started', this.state.activeCall)
    this.syncStateToRenderer()
  }

  public endCall(): void {
    if (this.state.activeCall.isActive) {
      this.state.activeCall.isActive = false
      this.emit('call-ended', this.state.activeCall)
      this.syncStateToRenderer()
    }
  }

  public addTranscriptSegment(segment: TranscriptSegment): void {
    this.state.activeCall.transcriptSegments.push(segment)
    this.emit('transcript-updated', segment)
    this.syncStateToRenderer()
  }

  public getActiveCall(): CallContext {
    return this.state.activeCall
  }

  // Suggestion methods
  public setSuggestions(suggestions: Suggestion[]): void {
    this.state.currentSuggestions = suggestions
    this.emit('suggestions-updated', suggestions)
    this.syncStateToRenderer()
  }

  public clearSuggestions(): void {
    this.state.currentSuggestions = []
    this.emit('suggestions-updated', [])
    this.syncStateToRenderer()
  }

  public getSuggestions(): Suggestion[] {
    return this.state.currentSuggestions
  }

  // CRM context methods
  public setCRMContext(context: CRMContext): void {
    this.state.crmContext = context
    this.emit('crm-context-updated', context)
    this.syncStateToRenderer()
  }

  public getCRMContext(): CRMContext {
    return this.state.crmContext
  }

  // Query methods
  public setCurrentQuery(query: string): void {
    this.state.currentQuery = query
    this.emit('query-updated', query)
    this.syncStateToRenderer()
  }

  public getCurrentQuery(): string {
    return this.state.currentQuery
  }

  // Processing state methods
  public setProcessing(isProcessing: boolean): void {
    this.state.isProcessing = isProcessing
    this.emit('processing-changed', isProcessing)
    this.syncStateToRenderer()
  }

  public isProcessing(): boolean {
    return this.state.isProcessing
  }

  // Sync state to renderer process
  private syncStateToRenderer(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('closezly:state-updated', this.getPublicState())
    }
  }

  // Get a safe version of the state to send to the renderer
  private getPublicState() {
    return {
      isAuthenticated: this.state.isAuthenticated,
      user: this.state.user ? {
        id: this.state.user.id,
        email: this.state.user.email,
        fullName: this.state.user.fullName,
        username: this.state.user.username,
        profilePictureUrl: this.state.user.profilePictureUrl,
        // Generate initials from username or email for avatar display
        initials: this.state.user.username
          ? this.state.user.username.substring(0, 2).toUpperCase()
          : this.state.user.email.substring(0, 2).toUpperCase(),
        // Use actual subscription status from user data
        subscriptionStatus: this.state.user.subscriptionStatus || 'free'
      } : null,
      overlayVisible: this.state.overlayVisible,
      isProcessing: this.state.isProcessing,
      activeCall: {
        isActive: this.state.activeCall.isActive,
        startTime: this.state.activeCall.startTime,
        transcriptSegments: this.state.activeCall.transcriptSegments
      },
      currentSuggestions: this.state.currentSuggestions,
      crmContext: this.state.crmContext,
      currentQuery: this.state.currentQuery
    }
  }
}

export default AppState.getInstance()

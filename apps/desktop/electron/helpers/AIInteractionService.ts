/**
 * AIInteractionService.ts
 *
 * Manages communication with the Closezly backend AI service.
 * Handles context preparation (screen capture + transcript + query),
 * API calls with authentication, and response handling for real-time sales assistance.
 */

import { EventEmitter } from 'events'
import fetch from 'node-fetch'
import AppState from './AppState'
import AuthHelper from './AuthHelper'
import ScreenshotHelper from './ScreenshotHelper'
import AudioCaptureService from './AudioCaptureService'

interface CallContext {
  currentTranscriptSegment?: string
  prospectName?: string
  companyName?: string
  dealStage?: string
  userQuery?: string
  screenContext?: string
}

interface AssistanceRequest {
  context: CallContext
  assistanceType: 'objection' | 'product_info' | 'competitive_positioning' | 'price_objection' | 'closing' | 'discovery' | 'general_assistance'
  query?: string
  imageBase64?: string
}

interface MultimodalAssistanceRequest {
  context: CallContext
  assistanceType: 'objection' | 'product_info' | 'competitive_positioning' | 'price_objection' | 'closing' | 'discovery' | 'general_assistance'
  query?: string
  audioData?: string // Base64 encoded audio
  imageData?: string // Base64 encoded image
  audioMimeType?: string
  imageMimeType?: string
}

interface AssistanceResponse {
  success: boolean
  suggestions?: Suggestion[]
  response?: string
  error?: string
  usage?: {
    promptTokens?: number
    candidatesTokens?: number
    totalTokens?: number
  }
}

interface Suggestion {
  id: string
  text: string
  type: 'objection-handling' | 'question-suggestion' | 'information' | 'next-steps'
  source?: string
  confidence?: number
}

class AIInteractionService extends EventEmitter {
  private static instance: AIInteractionService
  private backendUrl: string
  private isProcessing: boolean = false
  private requestTimeout: number = 30000 // 30 seconds

  private constructor() {
    super()
    this.backendUrl = process.env.BACKEND_URL || 'http://localhost:4000'
  }

  public static getInstance(): AIInteractionService {
    if (!AIInteractionService.instance) {
      AIInteractionService.instance = new AIInteractionService()
    }
    return AIInteractionService.instance
  }

  /**
   * Processes a manual query with current context using multimodal approach
   */
  public async processManualQuery(queryText: string): Promise<AssistanceResponse> {
    if (this.isProcessing) {
      return {
        success: false,
        error: 'Another AI request is already in progress'
      }
    }

    // Use the new multimodal approach for all queries
    return await this.processMultimodalAssistance(queryText)
  }

  /**
   * Processes a screenshot and provides contextual assistance using multimodal approach
   */
  public async processScreenshotContext(): Promise<AssistanceResponse> {
    if (this.isProcessing) {
      return {
        success: false,
        error: 'Another AI request is already in progress'
      }
    }

    // Use the new multimodal approach for screenshot processing
    return await this.processMultimodalAssistance()
  }

  /**
   * Handles specific objection scenarios
   */
  public async handleObjection(objectionText: string): Promise<AssistanceResponse> {
    try {
      console.log('[AIInteraction] Handling objection:', objectionText)

      const context = await this.prepareContext(objectionText)
      const screenshot = await this.captureScreenContext()

      const request: AssistanceRequest = {
        context,
        assistanceType: 'objection',
        query: objectionText,
        imageBase64: screenshot
      }

      return await this.makeAssistanceRequest(request)
    } catch (error) {
      console.error('[AIInteraction] Error handling objection:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Processes multimodal assistance request with audio and visual context
   */
  public async processMultimodalAssistance(queryText?: string): Promise<AssistanceResponse> {
    try {
      console.log('[AIInteraction] Processing multimodal assistance request')
      this.isProcessing = true
      AppState.setProcessing(true)
      AppState.setCurrentQuery(queryText || '')

      // Prepare context for multimodal processing
      const context = await this.prepareContext(queryText)

      // Capture screenshot for visual context with permission handling
      const screenContext = await this.captureScreenContext(true)

      // Capture recent audio if available
      const audioData = await this.captureRecentAudio()

      // Determine assistance type based on context
      const assistanceType = this.determineAssistanceType(context)

      // Validate that we have at least one input type for the API
      const hasQuery = queryText && queryText.trim().length > 0
      const hasAudio = audioData?.data && audioData.data.length > 0
      const hasImage = screenContext.screenshot && screenContext.screenshot.length > 0

      console.log('[AIInteraction] Input validation:', {
        hasQuery,
        hasAudio,
        hasImage,
        permissionStatus: screenContext.permissionStatus,
        queryLength: queryText?.length || 0,
        audioDataLength: audioData?.data?.length || 0,
        imageDataLength: screenContext.screenshot?.length || 0
      })

      // If no inputs are available, provide a fallback
      if (!hasQuery && !hasAudio && !hasImage) {
        console.warn('[AIInteraction] No input data available for multimodal request')

        // Try to provide a fallback query based on context and permission status
        let fallbackQuery = 'Please provide general sales assistance based on the current context.'

        if (screenContext.userMessage) {
          fallbackQuery = `${screenContext.userMessage} Please provide sales assistance based on available context.`
        } else if (context.currentTranscriptSegment) {
          fallbackQuery = `Please provide sales assistance based on this conversation: "${context.currentTranscriptSegment}"`
        } else if (context.prospectName || context.companyName) {
          fallbackQuery = `Please provide sales assistance for ${context.prospectName ? `prospect ${context.prospectName}` : ''}${context.companyName ? ` from ${context.companyName}` : ''}.`
        }

        console.log('[AIInteraction] Using fallback query:', fallbackQuery)
        queryText = fallbackQuery
      }

      // Make multimodal API request
      const request: MultimodalAssistanceRequest = {
        context,
        assistanceType,
        query: queryText,
        audioData: audioData?.data,
        imageData: screenContext.screenshot,
        audioMimeType: audioData?.mimeType || 'audio/wav',
        imageMimeType: 'image/png'
      }

      const response = await this.makeMultimodalAssistanceRequest(request)

      // If the response is successful, add permission context to the response
      if (response.success) {
        // Add permission status information to the response if relevant
        if (screenContext.permissionStatus !== 'granted' && screenContext.userMessage) {
          // Prepend permission message to the response
          if (response.response) {
            response.response = `${screenContext.userMessage}\n\n${response.response}`
          }

          // Add permission message as a suggestion
          if (response.suggestions) {
            response.suggestions.unshift({
              id: `permission_info_${Date.now()}`,
              text: screenContext.userMessage,
              type: 'information',
              source: 'system',
              confidence: 1.0
            })
          }
        }

        // Update AppState with suggestions
        if (response.suggestions) {
          AppState.setSuggestions(response.suggestions)
          this.emit('suggestions-received', response.suggestions)
        }
      }

      return response
    } catch (error) {
      console.error('[AIInteraction] Error processing multimodal assistance:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    } finally {
      this.isProcessing = false
      AppState.setProcessing(false)
    }
  }

  /**
   * Prepares context for multimodal AI requests
   */
  private async prepareContext(userQuery?: string): Promise<CallContext> {
    // Get CRM context if available
    const crmContext = AppState.getCRMContext()

    // Extract prospect information from CRM context
    const prospectName = crmContext.contactInfo?.name || crmContext.contactInfo?.firstName || 'Unknown'
    const companyName = crmContext.accountInfo?.name || crmContext.contactInfo?.company || 'Unknown'
    const dealStage = crmContext.opportunityInfo?.stage || 'discovery'

    // Prepare context object without transcript dependency
    const context: CallContext = {
      userQuery: userQuery || AppState.getCurrentQuery(),
      prospectName,
      companyName,
      dealStage
    }

    return context
  }

  /**
   * Captures recent audio data for multimodal processing
   */
  private async captureRecentAudio(): Promise<{ data: string; mimeType: string } | undefined> {
    try {
      // Check if audio capture is active
      const captureStatus = AudioCaptureService.getCaptureStatus()
      if (!captureStatus.isCapturing) {
        console.log('[AIInteraction] Audio capture not active, skipping audio data')
        return undefined
      }

      // Get recent audio from buffer (last 5 seconds)
      const recentAudio = AudioCaptureService.getRecentAudio(5000)
      if (recentAudio) {
        console.log('[AIInteraction] Captured recent audio for multimodal processing')
        return recentAudio
      } else {
        console.log('[AIInteraction] No recent audio available in buffer')
        return undefined
      }
    } catch (error) {
      console.warn('[AIInteraction] Failed to capture recent audio:', error)
      return undefined
    }
  }

  /**
   * Captures screenshot for visual context with comprehensive permission handling
   */
  private async captureScreenContext(showPermissionDialog: boolean = true): Promise<{
    screenshot?: string
    permissionStatus: 'granted' | 'denied' | 'not-determined' | 'restricted' | 'unknown'
    userMessage?: string
  }> {
    try {
      console.log('[AIInteraction] Attempting to capture screen context...')

      // First check if we have permission
      const permissionStatus = await ScreenshotHelper.getPermissionStatus()

      if (!permissionStatus.granted) {
        console.warn('[AIInteraction] Screen recording permission not granted:', permissionStatus.status)

        // If this is the first time or user explicitly requested, show permission dialog
        if (showPermissionDialog && (permissionStatus.status === 'not-determined' || permissionStatus.status === 'denied')) {
          console.log('[AIInteraction] Showing permission request dialog...')
          try {
            await PermissionHelper.requestPermission('screen')

            // Check permission again after request
            const newPermissionStatus = await ScreenshotHelper.getPermissionStatus()
            if (newPermissionStatus.granted) {
              // Permission granted, try capture again
              const screenshot = await ScreenshotHelper.captureScreenshotSafely(true)
              if (screenshot) {
                const optimizedScreenshot = await ScreenshotHelper.optimizeImageForLLM(screenshot)
                return {
                  screenshot: optimizedScreenshot,
                  permissionStatus: 'granted'
                }
              }
            }

            // Permission still not granted or capture failed
            return {
              permissionStatus: newPermissionStatus.status as any,
              userMessage: newPermissionStatus.userGuidance || 'Screen recording permission is required for visual AI analysis. You can still use text-based assistance.'
            }
          } catch (requestError) {
            console.warn('[AIInteraction] Permission request failed:', requestError)
            return {
              permissionStatus: permissionStatus.status as any,
              userMessage: 'Unable to request screen recording permission. You can still use text-based AI assistance.'
            }
          }
        } else {
          // Permission denied or restricted, return status without dialog
          return {
            permissionStatus: permissionStatus.status as any,
            userMessage: permissionStatus.userGuidance || 'Screen recording permission not available. Using text-based assistance.'
          }
        }
      }

      // Permission is granted, try to capture screenshot
      const screenshot = await ScreenshotHelper.captureScreenshotSafely(true)

      if (!screenshot) {
        console.warn('[AIInteraction] Screenshot capture returned null despite permission being granted')
        return {
          permissionStatus: 'granted',
          userMessage: 'Screen capture failed due to technical issue. Using text-based assistance.'
        }
      }

      // Optimize for LLM if needed
      const optimizedScreenshot = await ScreenshotHelper.optimizeImageForLLM(screenshot)
      console.log('[AIInteraction] Successfully captured and optimized screenshot')

      return {
        screenshot: optimizedScreenshot,
        permissionStatus: 'granted'
      }
    } catch (error) {
      console.error('[AIInteraction] Failed to capture screenshot context:', error)
      return {
        permissionStatus: 'unknown',
        userMessage: 'Screen capture encountered an error. Using text-based assistance.'
      }
    }
  }

  /**
   * Determines the appropriate assistance type based on context
   */
  private determineAssistanceType(context: CallContext): AssistanceRequest['assistanceType'] {
    const transcript = context.currentTranscriptSegment?.toLowerCase() || ''
    const query = context.userQuery?.toLowerCase() || ''

    // Simple keyword-based detection (can be enhanced with ML)
    if (transcript.includes('price') || transcript.includes('cost') || transcript.includes('expensive') ||
        query.includes('price') || query.includes('cost')) {
      return 'price_objection'
    }

    if (transcript.includes('competitor') || transcript.includes('alternative') ||
        query.includes('competitor') || query.includes('vs')) {
      return 'competitive_positioning'
    }

    if (transcript.includes('feature') || transcript.includes('how does') ||
        query.includes('feature') || query.includes('product')) {
      return 'product_info'
    }

    if (transcript.includes('close') || transcript.includes('next step') ||
        query.includes('close') || query.includes('next step')) {
      return 'closing'
    }

    if (transcript.includes('question') || context.dealStage === 'discovery') {
      return 'discovery'
    }

    // Default to general assistance
    return 'general_assistance'
  }

  /**
   * Makes the actual API request to the backend
   */
  private async makeAssistanceRequest(request: AssistanceRequest): Promise<AssistanceResponse> {
    try {
      // Get authentication token
      const tokens = AuthHelper.getTokens()
      if (!tokens || !tokens.accessToken) {
        throw new Error('No valid authentication token available')
      }

      // Prepare request body
      const requestBody = {
        context: request.context,
        assistanceType: request.assistanceType,
        query: request.query,
        imageBase64: request.imageBase64
      }

      console.log(`[AIInteraction] Making API request to ${this.backendUrl}/api/v1/assist/realtime`)

      // Make API call
      const response = await fetch(`${this.backendUrl}/api/v1/assist/realtime`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.accessToken}`
        },
        body: JSON.stringify(requestBody),
        timeout: this.requestTimeout
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Try to refresh token and retry
          const refreshed = await AuthHelper.refreshUserProfile()
          if (refreshed) {
            return await this.makeAssistanceRequest(request) // Retry once
          }
          throw new Error('Authentication failed')
        }

        const errorText = await response.text()
        throw new Error(`API request failed: ${response.status} ${errorText}`)
      }

      const data = await response.json() as any

      // Transform backend response to our format
      const suggestions: Suggestion[] = []

      if (data.response) {
        // If we get a text response, convert it to a suggestion
        suggestions.push({
          id: `suggestion_${Date.now()}`,
          text: data.response,
          type: this.mapAssistanceTypeToSuggestionType(request.assistanceType),
          source: 'ai',
          confidence: data.confidence || 0.8
        })
      }

      return {
        success: true,
        suggestions,
        response: data.response,
        usage: data.usage
      }
    } catch (error) {
      console.error('[AIInteraction] API request failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API request failed'
      }
    }
  }

  /**
   * Makes multimodal API request to the backend
   */
  private async makeMultimodalAssistanceRequest(request: MultimodalAssistanceRequest): Promise<AssistanceResponse> {
    try {
      // Get authentication token with detailed logging
      const tokens = AuthHelper.getTokens()
      console.log('[AIInteraction] Token check:', {
        hasTokens: !!tokens,
        hasAccessToken: !!(tokens?.accessToken),
        tokenExpiry: tokens?.expiresAt,
        currentTime: Date.now(),
        isExpired: tokens?.expiresAt ? tokens.expiresAt < Date.now() : 'unknown'
      })

      if (!tokens || !tokens.accessToken) {
        // Try to refresh the user profile to get fresh tokens
        console.log('[AIInteraction] No tokens available, attempting to refresh...')
        const refreshed = await AuthHelper.refreshUserProfile()
        if (!refreshed) {
          throw new Error('No valid authentication token available. Please log in again.')
        }

        // Get tokens again after refresh
        const newTokens = AuthHelper.getTokens()
        if (!newTokens || !newTokens.accessToken) {
          throw new Error('Failed to obtain valid authentication token after refresh')
        }
      }

      // Check if token is expired
      if (tokens && tokens.expiresAt && tokens.expiresAt < Date.now()) {
        console.log('[AIInteraction] Token expired, attempting refresh...')
        const refreshed = await AuthHelper.refreshUserProfile()
        if (!refreshed) {
          throw new Error('Authentication token expired and refresh failed. Please log in again.')
        }
      }

      // Get current tokens (may have been refreshed)
      const currentTokens = AuthHelper.getTokens()
      if (!currentTokens || !currentTokens.accessToken) {
        throw new Error('No valid authentication token available after refresh attempts')
      }

      // Prepare request body for multimodal endpoint
      const requestBody = {
        context: request.context,
        assistanceType: request.assistanceType,
        query: request.query,
        audioData: request.audioData,
        imageData: request.imageData,
        audioMimeType: request.audioMimeType,
        imageMimeType: request.imageMimeType
      }

      console.log(`[AIInteraction] Making multimodal API request to ${this.backendUrl}/api/v1/assist/multimodal`)
      console.log('[AIInteraction] Request includes:', {
        hasQuery: !!request.query,
        hasAudio: !!request.audioData,
        hasImage: !!request.imageData,
        assistanceType: request.assistanceType
      })

      // Make API call to multimodal endpoint
      const response = await fetch(`${this.backendUrl}/api/v1/assist/multimodal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentTokens.accessToken}`
        },
        body: JSON.stringify(requestBody),
        timeout: this.requestTimeout
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Try to refresh token and retry
          const refreshed = await AuthHelper.refreshUserProfile()
          if (refreshed) {
            return await this.makeMultimodalAssistanceRequest(request) // Retry once
          }
          throw new Error('Authentication failed')
        }

        const errorText = await response.text()
        throw new Error(`Multimodal API request failed: ${response.status} ${errorText}`)
      }

      const data = await response.json() as any

      // Transform backend response to our format
      const suggestions: Suggestion[] = []

      if (data.rawResponse) {
        // Parse the multimodal response into suggestions
        const responseLines = data.rawResponse.split('\n').filter((line: string) => line.trim().length > 0)
        responseLines.forEach((line: string, index: number) => {
          suggestions.push({
            id: `multimodal_suggestion_${Date.now()}_${index}`,
            text: line.trim(),
            type: this.mapAssistanceTypeToSuggestionType(request.assistanceType),
            source: 'ai-multimodal',
            confidence: data.usage ? 0.9 : 0.8 // Higher confidence for multimodal
          })
        })
      }

      return {
        success: true,
        suggestions,
        response: data.rawResponse,
        usage: data.usage
      }
    } catch (error) {
      console.error('[AIInteraction] Multimodal API request failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Multimodal API request failed'
      }
    }
  }

  /**
   * Maps assistance type to suggestion type
   */
  private mapAssistanceTypeToSuggestionType(assistanceType: AssistanceRequest['assistanceType']): Suggestion['type'] {
    switch (assistanceType) {
      case 'objection':
      case 'price_objection':
      case 'competitive_positioning':
        return 'objection-handling'
      case 'discovery':
        return 'question-suggestion'
      case 'closing':
        return 'next-steps'
      default:
        return 'information'
    }
  }

  /**
   * Gets current processing status
   */
  public isCurrentlyProcessing(): boolean {
    return this.isProcessing
  }

  /**
   * Updates backend URL configuration
   */
  public updateBackendUrl(url: string): void {
    this.backendUrl = url
    console.log(`[AIInteraction] Updated backend URL to: ${url}`)
  }

  /**
   * Updates request timeout
   */
  public updateTimeout(timeoutMs: number): void {
    this.requestTimeout = timeoutMs
    console.log(`[AIInteraction] Updated request timeout to: ${timeoutMs}ms`)
  }

  /**
   * Cleanup method for app shutdown
   */
  public async cleanup(): Promise<void> {
    console.log('[AIInteraction] Cleaning up AI interaction service...')
    this.removeAllListeners()
  }
}

export default AIInteractionService.getInstance()
export type { CallContext, AssistanceRequest, MultimodalAssistanceRequest, AssistanceResponse, Suggestion }

import { GoogleGenAI } from '@google/genai'

// Ensure GEMINI_API_KEY is loaded from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in environment variables.')
}

const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

interface GenerateTextOptions {
  prompt: string
  temperature?: number
  maxOutputTokens?: number
  topK?: number
  topP?: number
}

interface MultimodalContent {
  text?: string
  audioData?: string // Base64 encoded audio
  imageData?: string // Base64 encoded image
  audioMimeType?: string // e.g., 'audio/wav', 'audio/mp3'
  imageMimeType?: string // e.g., 'image/png', 'image/jpeg'
}

interface GenerateMultimodalOptions {
  content: MultimodalContent
  temperature?: number
  maxOutputTokens?: number
  topK?: number
  topP?: number
}

interface GenerateTextResponse {
  success: boolean
  text?: string
  error?: string
  usage?: {
    promptTokens?: number
    candidatesTokens?: number
    totalTokens?: number
  }
}

/**
 * Generates text content based on a given prompt using the configured Gemini model.
 */
async function generateText(
  options: GenerateTextOptions
): Promise<GenerateTextResponse> {
  const { prompt, temperature = 0.7, maxOutputTokens = 1000, topK = 40, topP = 0.95 } = options

  if (!prompt || prompt.trim().length === 0) {
    return { success: false, error: 'Prompt cannot be empty.' }
  }

  try {
    console.log(`[LLMService] Sending prompt to Gemini: "${prompt.substring(0, 100)}..."`)

    const result = await genAI.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature,
        maxOutputTokens,
        topK,
        topP,
        candidateCount: 1,
      }
    })

    const response = result
    const text = response.text

    if (!text) {
      return { success: false, error: 'No text generated from the model.' }
    }

    console.log(`[LLMService] Received response from Gemini (${text.length} characters)`)

    // Extract usage metadata if available
    const usage = response.usageMetadata ? {
      promptTokens: response.usageMetadata.promptTokenCount,
      candidatesTokens: response.usageMetadata.candidatesTokenCount,
      totalTokens: response.usageMetadata.totalTokenCount,
    } : undefined

    return {
      success: true,
      text,
      usage
    }
  } catch (error: any) {
    console.error('[LLMService] Error generating content from Gemini:', error)

    // More specific error handling based on common Gemini API errors
    let errorMessage = 'Failed to generate text from LLM.'

    if (error.message?.includes('not found for API version')) {
      errorMessage = `Invalid model name. Please use a valid Gemini model like 'gemini-2.0-flash-001'`
    } else if (error.message?.includes('API key')) {
      errorMessage = 'Invalid or missing API key. Please check your GEMINI_API_KEY environment variable.'
    } else if (error.message?.includes('quota')) {
      errorMessage = 'API quota exceeded. Please check your Gemini API usage limits.'
    } else if (error.message?.includes('safety')) {
      errorMessage = 'Content was blocked due to safety filters.'
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'Rate limit exceeded. Please try again later.'
    } else if (error.message) {
      errorMessage = error.message
    }

    return { success: false, error: errorMessage }
  }
}

/**
 * Generates text content with streaming response for real-time applications.
 */
async function generateTextStream(
  options: GenerateTextOptions
): Promise<AsyncGenerator<{ text: string; done: boolean }>> {
  const { prompt, temperature = 0.7, maxOutputTokens = 1000, topK = 40, topP = 0.95 } = options

  if (!prompt || prompt.trim().length === 0) {
    throw new Error('Prompt cannot be empty.')
  }

  try {
    console.log(`[LLMService] Starting streaming generation for prompt: "${prompt.substring(0, 100)}..."`)

    const result = await genAI.models.generateContentStream({
      model: 'gemini-2.0-flash-001',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature,
        maxOutputTokens,
        topK,
        topP,
        candidateCount: 1,
      }
    })

    async function* streamGenerator() {
      for await (const chunk of result) {
        if (chunk.text) {
          yield { text: chunk.text, done: false }
        }
      }
      yield { text: '', done: true }
    }

    return streamGenerator()
  } catch (error: any) {
    console.error('[LLMService] Error in streaming generation:', error)
    throw new Error(`Streaming generation failed: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Generates content using multimodal inputs (text, audio, images) with Gemini.
 */
async function generateMultimodalContent(
  options: GenerateMultimodalOptions
): Promise<GenerateTextResponse> {
  const { content, temperature = 0.7, maxOutputTokens = 1000, topK = 40, topP = 0.95 } = options

  if (!content.text && !content.audioData && !content.imageData) {
    return { success: false, error: 'At least one content type (text, audio, or image) must be provided.' }
  }

  try {
    console.log('[LLMService] Sending multimodal content to Gemini...')

    // Build the content array for Gemini API
    const parts: any[] = []

    // Add text content if provided
    if (content.text && content.text.trim().length > 0) {
      parts.push({ text: content.text })
    }

    // Add image content if provided
    if (content.imageData) {
      const imageMimeType = content.imageMimeType || 'image/png'

      // Debug: Log image data details
      console.log('[LLMService] Processing image data:', {
        originalLength: content.imageData.length,
        hasDataPrefix: content.imageData.startsWith('data:'),
        mimeType: imageMimeType,
        preview: content.imageData.substring(0, 100) + '...'
      })

      const cleanImageData = content.imageData.replace(/^data:image\/[a-z]+;base64,/, '')
      console.log('[LLMService] Clean image data length:', cleanImageData.length)

      // Validate image data before sending to Gemini
      if (!cleanImageData || cleanImageData.length < 100) {
        console.error('[LLMService] Image data is too small or invalid:', {
          length: cleanImageData.length,
          data: cleanImageData.substring(0, 50)
        })
        return { success: false, error: 'Invalid image data provided - data is too small or corrupted' }
      }

      parts.push({
        inlineData: {
          mimeType: imageMimeType,
          data: cleanImageData
        }
      })
    }

    // Add audio content if provided
    if (content.audioData) {
      const audioMimeType = content.audioMimeType || 'audio/wav'
      parts.push({
        inlineData: {
          mimeType: audioMimeType,
          data: content.audioData.replace(/^data:audio\/[a-z]+;base64,/, '') // Remove data URL prefix if present
        }
      })
    }

    const result = await genAI.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: [{ parts }],
      config: {
        temperature,
        maxOutputTokens,
        topK,
        topP,
        candidateCount: 1,
      }
    })

    const response = result
    const text = response.text

    if (!text) {
      return { success: false, error: 'No text generated from the multimodal model.' }
    }

    console.log(`[LLMService] Received multimodal response from Gemini (${text.length} characters)`)

    // Extract usage metadata if available
    const usage = response.usageMetadata ? {
      promptTokens: response.usageMetadata.promptTokenCount,
      candidatesTokens: response.usageMetadata.candidatesTokenCount,
      totalTokens: response.usageMetadata.totalTokenCount,
    } : undefined

    return {
      success: true,
      text,
      usage
    }
  } catch (error: any) {
    console.error('[LLMService] Error generating multimodal content from Gemini:', error)

    // Handle multimodal-specific errors
    let errorMessage = 'Failed to generate content from multimodal LLM.'

    if (error.message?.includes('not found for API version')) {
      errorMessage = `Invalid model name. Please use a valid Gemini model like 'gemini-2.0-flash-001'`
    } else if (error.message?.includes('API key')) {
      errorMessage = 'Invalid or missing API key. Please check your GEMINI_API_KEY environment variable.'
    } else if (error.message?.includes('quota')) {
      errorMessage = 'API quota exceeded. Please check your Gemini API usage limits.'
    } else if (error.message?.includes('safety')) {
      errorMessage = 'Content was blocked due to safety filters.'
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'Rate limit exceeded. Please try again later.'
    } else if (error.message?.includes('unsupported')) {
      errorMessage = 'Unsupported media format. Please check audio/image formats.'
    } else if (error.message) {
      errorMessage = error.message
    }

    return { success: false, error: errorMessage }
  }
}

/**
 * Validates if the Gemini API is accessible and working.
 */
async function validateConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[LLMService] Validating Gemini API connection...')

    const testResult = await generateText({
      prompt: 'Hello, this is a connection test. Please respond with "Connection successful".',
      maxOutputTokens: 50
    })

    if (testResult.success) {
      console.log('[LLMService] Gemini API connection validated successfully')
      return { success: true }
    } else {
      return { success: false, error: testResult.error }
    }
  } catch (error: any) {
    console.error('[LLMService] Connection validation failed:', error)
    return { success: false, error: error.message || 'Connection validation failed' }
  }
}

export const LLMOrchestrationService = {
  generateText,
  generateTextStream,
  generateMultimodalContent,
  validateConnection,
}

export type { GenerateTextOptions, GenerateTextResponse, GenerateMultimodalOptions, MultimodalContent }

import { CallContext } from '../prompts/salesPromptTemplates'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings?: string[]
}

export interface AssistanceRequest {
  context: CallContext
  assistanceType: string
  query?: string
}

/**
 * Validates the assistance request structure and content
 */
export function validateAssistanceRequest(request: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check if request exists
  if (!request) {
    return {
      isValid: false,
      errors: ['Request body is required']
    }
  }

  // Validate context
  if (!request.context) {
    errors.push('Context is required')
  } else {
    const contextValidation = validateCallContext(request.context)
    if (!contextValidation.isValid) {
      errors.push(...contextValidation.errors.map(e => `Context validation: ${e}`))
    }
    if (contextValidation.warnings) {
      warnings.push(...contextValidation.warnings.map(w => `Context warning: ${w}`))
    }
  }

  // Validate assistance type
  if (!request.assistanceType) {
    errors.push('Assistance type is required')
  } else {
    const validTypes = [
      'objection',
      'product_info',
      'general_assistance',
      'competitive_positioning',
      'closing',
      'discovery',
      'price_objection'
    ]

    if (!validTypes.includes(request.assistanceType)) {
      errors.push(`Invalid assistance type. Must be one of: ${validTypes.join(', ')}`)
    }
  }

  // Validate query for types that require it
  const requiresQuery = ['objection', 'product_info', 'competitive_positioning', 'price_objection']
  if (requiresQuery.includes(request.assistanceType)) {
    if (!request.query) {
      errors.push(`Query is required for assistance type: ${request.assistanceType}`)
    } else if (typeof request.query !== 'string' || request.query.trim().length === 0) {
      errors.push('Query must be a non-empty string')
    } else if (request.query.length > 1000) {
      errors.push('Query must be less than 1000 characters')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}

/**
 * Validates the call context structure
 */
export function validateCallContext(context: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (typeof context !== 'object') {
    return {
      isValid: false,
      errors: ['Context must be an object']
    }
  }

  // Validate string fields
  const stringFields = [
    'currentTranscriptSegment',
    'onScreenText',
    'userQuery',
    'prospectName',
    'companyName',
    'dealStage',
    'previousInteractions'
  ]

  stringFields.forEach(field => {
    if (context[field] !== undefined) {
      if (typeof context[field] !== 'string') {
        errors.push(`${field} must be a string`)
      } else if (context[field].length > 5000) {
        warnings.push(`${field} is very long (${context[field].length} characters). Consider truncating for better performance.`)
      }
    }
  })

  // Validate CRM data if present
  if (context.crmData !== undefined) {
    if (typeof context.crmData !== 'object') {
      errors.push('crmData must be an object')
    } else {
      try {
        JSON.stringify(context.crmData)
      } catch (e) {
        errors.push('crmData must be serializable to JSON')
      }
    }
  }

  // Check if context has any meaningful content
  const hasContent = stringFields.some(field =>
    context[field] && typeof context[field] === 'string' && context[field].trim().length > 0
  ) || (context.crmData && Object.keys(context.crmData).length > 0)

  if (!hasContent) {
    warnings.push('Context appears to be empty. Consider providing conversation transcript, prospect information, or other relevant context for better assistance.')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}

/**
 * Sanitizes and normalizes the assistance request
 */
export function sanitizeAssistanceRequest(request: AssistanceRequest): AssistanceRequest {
  const sanitized: AssistanceRequest = {
    context: sanitizeCallContext(request.context),
    assistanceType: request.assistanceType.toLowerCase().trim()
  }

  if (request.query) {
    sanitized.query = request.query.trim()
  }

  return sanitized
}

/**
 * Sanitizes the call context
 */
export function sanitizeCallContext(context: CallContext): CallContext {
  const sanitized: CallContext = {}

  // Sanitize string fields
  const stringFields: (keyof CallContext)[] = [
    'currentTranscriptSegment',
    'onScreenText',
    'userQuery',
    'prospectName',
    'companyName',
    'dealStage',
    'previousInteractions'
  ]

  stringFields.forEach(field => {
    if (context[field] && typeof context[field] === 'string') {
      sanitized[field] = (context[field] as string).trim()
    }
  })

  // Handle CRM data
  if (context.crmData && typeof context.crmData === 'object') {
    sanitized.crmData = context.crmData
  }

  return sanitized
}

/**
 * Validates environment configuration
 */
export function validateEnvironmentConfig(): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check required environment variables
  if (!process.env.GEMINI_API_KEY) {
    errors.push('GEMINI_API_KEY environment variable is required')
  } else if (process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    errors.push('GEMINI_API_KEY is set to placeholder value. Please set a valid API key.')
  }

  if (!process.env.SUPABASE_URL) {
    warnings.push('SUPABASE_URL not set. Some features may not work.')
  }

  if (!process.env.SUPABASE_SERVICE_KEY) {
    warnings.push('SUPABASE_SERVICE_KEY not set. Authentication may not work.')
  }

  // Check Node.js version
  const nodeVersion = process.version
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0])
  if (majorVersion < 18) {
    warnings.push(`Node.js version ${nodeVersion} detected. Google GenAI SDK requires Node.js 18+`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}

/**
 * Rate limiting validation (basic implementation)
 */
export function validateRateLimit(userId: string, endpoint: string): ValidationResult {
  // This is a basic implementation. In production, you'd use Redis or similar
  // For now, we'll just return valid
  return {
    isValid: true,
    errors: []
  }
}

/**
 * Content safety validation
 */
export function validateContentSafety(text: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Basic content validation
  if (text.length > 10000) {
    errors.push('Content is too long (max 10,000 characters)')
  }

  // Check for potentially harmful patterns (basic implementation)
  const suspiciousPatterns = [
    /\b(hack|exploit|vulnerability)\b/i,
    /\b(password|secret|token)\s*[:=]\s*\S+/i,
    /\bpassword\s+is\s+\S+/i
  ]

  suspiciousPatterns.forEach(pattern => {
    if (pattern.test(text)) {
      warnings.push('Content may contain sensitive information')
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}

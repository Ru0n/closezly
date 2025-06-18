import {
  validateAssistanceRequest,
  validateCallContext,
  sanitizeAssistanceRequest,
  validateContentSafety,
  validateEnvironmentConfig
} from '../utils/validation'

describe('Validation Utils', () => {
  describe('validateAssistanceRequest', () => {
    it('should validate a valid request', () => {
      const request = {
        context: {
          currentTranscriptSegment: 'Test conversation',
          prospectName: 'John Doe'
        },
        assistanceType: 'general_assistance'
      }

      const result = validateAssistanceRequest(request)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should require context', () => {
      const request = {
        assistanceType: 'general_assistance'
      }

      const result = validateAssistanceRequest(request)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Context is required')
    })

    it('should require assistanceType', () => {
      const request = {
        context: {}
      }

      const result = validateAssistanceRequest(request)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Assistance type is required')
    })

    it('should validate assistance type values', () => {
      const request = {
        context: {},
        assistanceType: 'invalid_type'
      }

      const result = validateAssistanceRequest(request)
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('Invalid assistance type')
    })

    it('should require query for objection handling', () => {
      const request = {
        context: {},
        assistanceType: 'objection'
      }

      const result = validateAssistanceRequest(request)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Query is required for assistance type: objection')
    })

    it('should validate query length', () => {
      const request = {
        context: {},
        assistanceType: 'objection',
        query: 'a'.repeat(1001) // Too long
      }

      const result = validateAssistanceRequest(request)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Query must be less than 1000 characters')
    })
  })

  describe('validateCallContext', () => {
    it('should validate a valid context', () => {
      const context = {
        currentTranscriptSegment: 'Test conversation',
        prospectName: 'John Doe',
        companyName: 'Acme Corp'
      }

      const result = validateCallContext(context)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should require context to be an object', () => {
      const result = validateCallContext('not an object')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Context must be an object')
    })

    it('should validate string field types', () => {
      const context = {
        prospectName: 123 // Should be string
      }

      const result = validateCallContext(context)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('prospectName must be a string')
    })

    it('should warn about very long fields', () => {
      const context = {
        currentTranscriptSegment: 'a'.repeat(5001)
      }

      const result = validateCallContext(context)
      expect(result.isValid).toBe(true)
      expect(result.warnings).toBeDefined()
      expect(result.warnings![0]).toContain('very long')
    })

    it('should warn about empty context', () => {
      const context = {}

      const result = validateCallContext(context)
      expect(result.isValid).toBe(true)
      expect(result.warnings).toBeDefined()
      expect(result.warnings![0]).toContain('Context appears to be empty')
    })
  })

  describe('sanitizeAssistanceRequest', () => {
    it('should sanitize and normalize request', () => {
      const request = {
        context: {
          prospectName: '  John Doe  ',
          currentTranscriptSegment: '  Test conversation  '
        },
        assistanceType: '  OBJECTION  ',
        query: '  Test query  '
      }

      const sanitized = sanitizeAssistanceRequest(request)
      expect(sanitized.context.prospectName).toBe('John Doe')
      expect(sanitized.context.currentTranscriptSegment).toBe('Test conversation')
      expect(sanitized.assistanceType).toBe('objection')
      expect(sanitized.query).toBe('Test query')
    })
  })

  describe('validateContentSafety', () => {
    it('should validate safe content', () => {
      const result = validateContentSafety('This is a normal sales conversation')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject content that is too long', () => {
      const longContent = 'a'.repeat(10001)
      const result = validateContentSafety(longContent)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Content is too long (max 10,000 characters)')
    })

    it('should warn about potentially sensitive content', () => {
      const result = validateContentSafety('My password is secret123')
      expect(result.isValid).toBe(true)
      expect(result.warnings).toBeDefined()
      expect(result.warnings![0]).toContain('sensitive information')
    })
  })

  describe('validateEnvironmentConfig', () => {
    const originalEnv = process.env

    beforeEach(() => {
      jest.resetModules()
      process.env = { ...originalEnv }
    })

    afterAll(() => {
      process.env = originalEnv
    })

    it('should validate when GEMINI_API_KEY is set', () => {
      process.env.GEMINI_API_KEY = 'valid-api-key'
      const result = validateEnvironmentConfig()
      expect(result.isValid).toBe(true)
    })

    it('should fail when GEMINI_API_KEY is missing', () => {
      delete process.env.GEMINI_API_KEY
      const result = validateEnvironmentConfig()
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('GEMINI_API_KEY environment variable is required')
    })

    it('should fail when GEMINI_API_KEY is placeholder', () => {
      process.env.GEMINI_API_KEY = 'your_gemini_api_key_here'
      const result = validateEnvironmentConfig()
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('placeholder value')
    })
  })
})

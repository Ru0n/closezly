import { SalesPromptTemplates, CallContext } from '../prompts/salesPromptTemplates'

describe('Sales Prompt Templates', () => {
  const mockContext: CallContext = {
    currentTranscriptSegment: 'Prospect: I think your price is too high.',
    prospectName: 'John Doe',
    companyName: 'Acme Corp',
    dealStage: 'negotiation',
    userQuery: 'How should I handle this?'
  }

  describe('getObjectionHandlingPrompt', () => {
    it('should generate objection handling prompt', () => {
      const prompt = SalesPromptTemplates.getObjectionHandlingPrompt(
        'Price is too high',
        mockContext
      )

      expect(prompt).toContain('Closezly')
      expect(prompt).toContain('Price is too high')
      expect(prompt).toContain('John Doe')
      expect(prompt).toContain('Acme Corp')
      expect(prompt).toContain('SUGGESTED RESPONSES')
    })

    it('should include context information', () => {
      const prompt = SalesPromptTemplates.getObjectionHandlingPrompt(
        'Price objection',
        mockContext
      )

      expect(prompt).toContain('[Prospect Information]')
      expect(prompt).toContain('[Current Conversation]')
      expect(prompt).toContain('[Salesperson\'s Question]')
    })
  })

  describe('getProductInfoPrompt', () => {
    it('should generate product info prompt', () => {
      const prompt = SalesPromptTemplates.getProductInfoPrompt(
        'security features',
        mockContext
      )

      expect(prompt).toContain('Closezly')
      expect(prompt).toContain('security features')
      expect(prompt).toContain('INFORMATION')
    })
  })

  describe('getRealtimeAssistancePrompt', () => {
    it('should generate general assistance prompt', () => {
      const prompt = SalesPromptTemplates.getRealtimeAssistancePrompt(mockContext)

      expect(prompt).toContain('Closezly')
      expect(prompt).toContain('SUGGESTION')
      expect(prompt).toContain('John Doe')
    })

    it('should handle empty context', () => {
      const prompt = SalesPromptTemplates.getRealtimeAssistancePrompt({})

      expect(prompt).toContain('Closezly')
      expect(prompt).toContain('[No additional context provided]')
    })
  })

  describe('getCompetitivePositioningPrompt', () => {
    it('should generate competitive positioning prompt', () => {
      const prompt = SalesPromptTemplates.getCompetitivePositioningPrompt(
        'Salesforce',
        mockContext
      )

      expect(prompt).toContain('Closezly')
      expect(prompt).toContain('Salesforce')
      expect(prompt).toContain('POSITIONING STRATEGY')
    })
  })

  describe('getClosingPrompt', () => {
    it('should generate closing prompt', () => {
      const prompt = SalesPromptTemplates.getClosingPrompt(mockContext)

      expect(prompt).toContain('Closezly')
      expect(prompt).toContain('CLOSING STRATEGY')
      expect(prompt).toContain('next steps')
    })
  })

  describe('getDiscoveryPrompt', () => {
    it('should generate discovery questions prompt', () => {
      const prompt = SalesPromptTemplates.getDiscoveryPrompt(mockContext)

      expect(prompt).toContain('Closezly')
      expect(prompt).toContain('DISCOVERY QUESTIONS')
      expect(prompt).toContain('pain points')
    })
  })

  describe('getPriceObjectionPrompt', () => {
    it('should generate price objection prompt', () => {
      const prompt = SalesPromptTemplates.getPriceObjectionPrompt(
        'Too expensive for our budget',
        mockContext
      )

      expect(prompt).toContain('Closezly')
      expect(prompt).toContain('Too expensive for our budget')
      expect(prompt).toContain('PRICE OBJECTION RESPONSES')
      expect(prompt).toContain('value')
    })
  })

  describe('Context formatting', () => {
    it('should format complete context properly', () => {
      const fullContext: CallContext = {
        currentTranscriptSegment: 'Recent conversation',
        onScreenText: 'Screen content',
        userQuery: 'User question',
        prospectName: 'Jane Smith',
        companyName: 'TechCorp',
        dealStage: 'discovery',
        previousInteractions: 'Previous meeting notes',
        crmData: { industry: 'Technology', size: 'Enterprise' }
      }

      const prompt = SalesPromptTemplates.getRealtimeAssistancePrompt(fullContext)

      expect(prompt).toContain('[Prospect Information]')
      expect(prompt).toContain('Jane Smith')
      expect(prompt).toContain('TechCorp')
      expect(prompt).toContain('discovery')
      expect(prompt).toContain('[Previous Interactions]')
      expect(prompt).toContain('[Current Conversation]')
      expect(prompt).toContain('[On-Screen Content]')
      expect(prompt).toContain('[CRM Data]')
      expect(prompt).toContain('[Salesperson\'s Question]')
    })

    it('should handle partial context gracefully', () => {
      const partialContext: CallContext = {
        prospectName: 'John Doe'
      }

      const prompt = SalesPromptTemplates.getRealtimeAssistancePrompt(partialContext)

      expect(prompt).toContain('[Prospect Information]')
      expect(prompt).toContain('John Doe')
      expect(prompt).not.toContain('[Current Conversation]')
      expect(prompt).not.toContain('[CRM Data]')
    })
  })

  describe('System prompt consistency', () => {
    it('should include consistent system prompt across all templates', () => {
      const templates = [
        SalesPromptTemplates.getObjectionHandlingPrompt('test', mockContext),
        SalesPromptTemplates.getProductInfoPrompt('test', mockContext),
        SalesPromptTemplates.getRealtimeAssistancePrompt(mockContext),
        SalesPromptTemplates.getCompetitivePositioningPrompt('test', mockContext),
        SalesPromptTemplates.getClosingPrompt(mockContext),
        SalesPromptTemplates.getDiscoveryPrompt(mockContext),
        SalesPromptTemplates.getPriceObjectionPrompt('test', mockContext)
      ]

      templates.forEach(prompt => {
        expect(prompt).toContain('You are Closezly')
        expect(prompt).toContain('AI Sales Co-Pilot')
        expect(prompt).toContain('B2B salespeople')
      })
    })
  })
})

interface CallContext {
  currentTranscriptSegment?: string // Last few turns of conversation
  onScreenText?: string // Text extracted from screenshot (placeholder for now)
  crmData?: any // Relevant CRM data (placeholder for now)
  userQuery?: string // Specific question from user
  prospectName?: string // Name of the prospect
  companyName?: string // Prospect's company name
  dealStage?: string // Current stage of the deal
  previousInteractions?: string // Summary of previous interactions
}

// System prompt to define Closezly's persona and overall task
const CLOSEZLY_SYSTEM_PROMPT = `You are Closezly, an AI Sales Co-Pilot designed to provide real-time assistance to B2B salespeople during live sales calls.

Your core mission is to help salespeople:
- Navigate conversations smoothly and professionally
- Handle objections with confidence and empathy
- Recall relevant product information instantly
- Identify opportunities to advance the deal
- Maintain rapport and build trust with prospects

Guidelines for your responses:
- Be concise, actionable, and highly relevant
- Provide suggestions as if you are whispering in their ear
- Use a professional, confident, and supportive tone
- When offering multiple options, number them clearly
- Keep responses brief unless detail is specifically requested
- Always consider the context of the conversation
- Focus on moving the deal forward while maintaining authenticity

Remember: You are helping a salesperson succeed, not replacing human connection and judgment.

---
CONTEXT:`

function formatContext(context: CallContext): string {
  let formattedContext = ""

  if (context.prospectName || context.companyName) {
    formattedContext += `\n[Prospect Information]:\n`
    if (context.prospectName) formattedContext += `Name: ${context.prospectName}\n`
    if (context.companyName) formattedContext += `Company: ${context.companyName}\n`
    if (context.dealStage) formattedContext += `Deal Stage: ${context.dealStage}\n`
  }

  if (context.previousInteractions) {
    formattedContext += `\n[Previous Interactions]:\n${context.previousInteractions}\n`
  }

  if (context.currentTranscriptSegment) {
    formattedContext += `\n[Current Conversation]:\n${context.currentTranscriptSegment}\n`
  }

  if (context.onScreenText) {
    formattedContext += `\n[On-Screen Content]:\n${context.onScreenText}\n`
  }

  if (context.crmData) {
    formattedContext += `\n[CRM Data]:\n${JSON.stringify(context.crmData, null, 2)}\n`
  }

  if (context.userQuery) {
    formattedContext += `\n[Salesperson's Question]: ${context.userQuery}\n`
  }

  return formattedContext.trim() === "" ? "\n[No additional context provided]\n" : formattedContext
}

/**
 * Generates a prompt for handling a sales objection.
 */
function getObjectionHandlingPrompt(objection: string, context: CallContext): string {
  const formattedContext = formatContext(context)
  return `${CLOSEZLY_SYSTEM_PROMPT}${formattedContext}

---
TASK: The prospect has raised this objection: "${objection}"

Provide 2-3 effective responses the salesperson can use. Each response should:
- Acknowledge the concern with empathy
- Provide a thoughtful rebuttal or clarifying question
- Help move the conversation forward

Format your response as numbered options:

SUGGESTED RESPONSES:`
}

/**
 * Generates a prompt for providing product information.
 */
function getProductInfoPrompt(productFeatureQuery: string, context: CallContext): string {
  const formattedContext = formatContext(context)
  return `${CLOSEZLY_SYSTEM_PROMPT}${formattedContext}

---
TASK: The salesperson needs information about: "${productFeatureQuery}"

Provide a clear, concise answer that:
- Addresses the specific query
- Is appropriate for the sales context
- Helps position the product/service favorably
- If you don't have specific information, suggest how to find it or redirect the conversation

INFORMATION:`
}

/**
 * Generic prompt for real-time assistance based on context.
 */
function getRealtimeAssistancePrompt(context: CallContext): string {
  const formattedContext = formatContext(context)
  return `${CLOSEZLY_SYSTEM_PROMPT}${formattedContext}

---
TASK: Based on the current conversation context, provide the most helpful suggestion for the salesperson.

This could be:
- A strategic question to ask
- A key point to emphasize
- An opportunity to identify
- A next step to propose
- A way to build rapport

If the context is unclear, suggest a clarifying question the salesperson could ask.

SUGGESTION:`
}

/**
 * Generates a prompt for competitive positioning.
 */
function getCompetitivePositioningPrompt(competitor: string, context: CallContext): string {
  const formattedContext = formatContext(context)
  return `${CLOSEZLY_SYSTEM_PROMPT}${formattedContext}

---
TASK: The prospect mentioned competitor: "${competitor}"

Provide guidance on how to position against this competitor:
- Acknowledge their strengths professionally
- Highlight your unique differentiators
- Ask questions to understand their evaluation criteria
- Avoid negative comments about competitors

POSITIONING STRATEGY:`
}

/**
 * Generates a prompt for closing and next steps.
 */
function getClosingPrompt(context: CallContext): string {
  const formattedContext = formatContext(context)
  return `${CLOSEZLY_SYSTEM_PROMPT}${formattedContext}

---
TASK: Help the salesperson identify the best approach for closing this conversation and securing next steps.

Consider:
- The current stage of the conversation
- The prospect's level of interest
- Any concerns that need addressing
- Appropriate next steps for this deal stage

Provide specific suggestions for:
1. How to summarize the conversation
2. What next steps to propose
3. How to secure commitment

CLOSING STRATEGY:`
}

/**
 * Generates a prompt for discovery questions.
 */
function getDiscoveryPrompt(context: CallContext): string {
  const formattedContext = formatContext(context)
  return `${CLOSEZLY_SYSTEM_PROMPT}${formattedContext}

---
TASK: Suggest powerful discovery questions the salesperson should ask to better understand the prospect's needs, challenges, and decision-making process.

Focus on questions that:
- Uncover pain points and challenges
- Understand their current process
- Identify decision criteria and timeline
- Reveal budget and authority
- Build rapport and trust

DISCOVERY QUESTIONS:`
}

/**
 * Generates a prompt for handling price objections specifically.
 */
function getPriceObjectionPrompt(priceObjection: string, context: CallContext): string {
  const formattedContext = formatContext(context)
  return `${CLOSEZLY_SYSTEM_PROMPT}${formattedContext}

---
TASK: The prospect has raised this price-related concern: "${priceObjection}"

Provide strategies to address this price objection:
- Reframe the conversation around value
- Ask questions to understand their budget constraints
- Offer alternative solutions or packages
- Emphasize ROI and cost of inaction

PRICE OBJECTION RESPONSES:`
}

// Multimodal System Prompt for enhanced context understanding
const MULTIMODAL_SYSTEM_PROMPT = `You are Closezly, an AI Sales Co-Pilot with advanced multimodal capabilities. You can analyze audio conversations, visual content, and text simultaneously to provide comprehensive real-time sales assistance.

Your enhanced capabilities include:
- Understanding tone, emotion, and context from audio conversations
- Analyzing visual content like presentations, documents, and screen content
- Processing conversation flow and non-verbal cues
- Providing contextually aware suggestions based on multiple input types

Guidelines for multimodal responses:
- Consider audio tone and emotion when crafting responses
- Reference visual content when relevant to the conversation
- Provide suggestions that account for both what is said and how it's said
- Use insights from screen content to enhance your recommendations
- Maintain the same professional, supportive tone as always

Your responses should be even more precise and contextually relevant due to the rich multimodal input.

---
CONTEXT:`

/**
 * Multimodal prompt for handling objections with audio and visual context
 */
function getMultimodalObjectionPrompt(context: CallContext): string {
  const formattedContext = formatContext(context)
  return `${MULTIMODAL_SYSTEM_PROMPT}${formattedContext}

---
TASK: Analyze the audio conversation and visual content to help handle any objections or concerns raised by the prospect.

Consider:
- Tone and emotion in the prospect's voice
- Visual cues from presentations or documents
- Body language or engagement level (if visible)
- Context from screen content or materials being discussed

Provide 2-3 tailored responses that:
- Address the specific concern with appropriate empathy
- Reference relevant visual content if applicable
- Match the emotional tone of the conversation
- Help move the conversation forward constructively

MULTIMODAL OBJECTION ANALYSIS:`
}

/**
 * Multimodal prompt for product information with enhanced context
 */
function getMultimodalProductInfoPrompt(context: CallContext): string {
  const formattedContext = formatContext(context)
  return `${MULTIMODAL_SYSTEM_PROMPT}${formattedContext}

---
TASK: Provide product information based on the multimodal conversation context.

Analyze:
- What the prospect is asking about (from audio)
- Visual content they might be viewing
- Their level of interest and engagement
- Any specific features or benefits being discussed

Provide information that:
- Directly addresses their spoken questions
- References visual materials if relevant
- Matches their level of technical detail
- Positions the product favorably for their specific needs

CONTEXTUAL PRODUCT INFORMATION:`
}

/**
 * Multimodal prompt for competitive positioning with full context
 */
function getMultimodalCompetitivePrompt(context: CallContext): string {
  const formattedContext = formatContext(context)
  return `${MULTIMODAL_SYSTEM_PROMPT}${formattedContext}

---
TASK: Help position against competitors using insights from audio conversation and visual content.

Consider:
- How the competitor was mentioned (tone, context)
- Any competitive materials or comparisons being viewed
- The prospect's apparent concerns or interests
- Visual content that might support your positioning

Provide positioning strategy that:
- Acknowledges competitor strengths professionally
- Highlights unique differentiators relevant to their needs
- Uses visual content to support your points
- Asks strategic questions based on conversation flow

MULTIMODAL COMPETITIVE POSITIONING:`
}

/**
 * Multimodal prompt for price objections with enhanced context
 */
function getMultimodalPriceObjectionPrompt(context: CallContext): string {
  const formattedContext = formatContext(context)
  return `${MULTIMODAL_SYSTEM_PROMPT}${formattedContext}

---
TASK: Address price-related concerns using insights from audio conversation and visual content.

Analyze:
- The tone and emotion behind the price objection
- Any pricing materials or proposals being viewed
- The prospect's body language or engagement level
- Context clues about their budget or decision-making process

Provide strategies that:
- Acknowledge their concern with appropriate empathy
- Reframe around value based on visual content
- Ask strategic questions about budget and ROI
- Reference specific benefits visible in materials

MULTIMODAL PRICE OBJECTION RESPONSE:`
}

/**
 * Multimodal prompt for closing and next steps with full context
 */
function getMultimodalClosingPrompt(context: CallContext): string {
  const formattedContext = formatContext(context)
  return `${MULTIMODAL_SYSTEM_PROMPT}${formattedContext}

---
TASK: Identify the best closing approach using insights from audio conversation and visual content.

Consider:
- The prospect's verbal and non-verbal engagement level
- Visual materials that support next steps
- Tone and energy in the conversation
- Any concerns or hesitations detected

Provide closing strategy that:
- Matches the conversation's energy and tone
- References relevant visual content for next steps
- Addresses any unspoken concerns
- Proposes appropriate next actions based on engagement level

MULTIMODAL CLOSING STRATEGY:`
}

/**
 * Multimodal prompt for discovery questions with enhanced context
 */
function getMultimodalDiscoveryPrompt(context: CallContext): string {
  const formattedContext = formatContext(context)
  return `${MULTIMODAL_SYSTEM_PROMPT}${formattedContext}

---
TASK: Suggest discovery questions based on multimodal conversation analysis.

Analyze:
- What the prospect has revealed verbally
- Visual content that might indicate their needs
- Tone and engagement level in their responses
- Any gaps in information that need exploring

Suggest questions that:
- Build on what you've observed from audio and visual cues
- Explore areas indicated by their engagement level
- Reference visual content when appropriate
- Uncover deeper needs and decision criteria

MULTIMODAL DISCOVERY QUESTIONS:`
}

/**
 * Multimodal prompt for general real-time assistance
 */
function getMultimodalRealtimeAssistancePrompt(context: CallContext): string {
  const formattedContext = formatContext(context)
  return `${MULTIMODAL_SYSTEM_PROMPT}${formattedContext}

---
TASK: Provide the most helpful suggestion based on comprehensive multimodal analysis.

Analyze all available inputs:
- Audio conversation flow and tone
- Visual content and materials being discussed
- Engagement level and non-verbal cues
- Overall conversation momentum

Provide the most strategic suggestion:
- A key insight based on multimodal analysis
- A strategic question that leverages visual content
- An opportunity to advance the conversation
- A way to address unspoken concerns
- Next steps that feel natural given the context

MULTIMODAL STRATEGIC SUGGESTION:`
}

export const SalesPromptTemplates = {
  getObjectionHandlingPrompt,
  getProductInfoPrompt,
  getRealtimeAssistancePrompt,
  getCompetitivePositioningPrompt,
  getClosingPrompt,
  getDiscoveryPrompt,
  getPriceObjectionPrompt,
  // Multimodal prompt functions
  getMultimodalObjectionPrompt,
  getMultimodalProductInfoPrompt,
  getMultimodalCompetitivePrompt,
  getMultimodalPriceObjectionPrompt,
  getMultimodalClosingPrompt,
  getMultimodalDiscoveryPrompt,
  getMultimodalRealtimeAssistancePrompt,
}

export type { CallContext }

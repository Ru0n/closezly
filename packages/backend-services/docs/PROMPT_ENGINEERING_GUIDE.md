# Prompt Engineering Guide - Closezly AI

This guide covers the prompt engineering strategies and best practices used in Closezly's AI sales assistance system.

## Overview

Closezly uses a structured prompt engineering approach with:
- **System Prompt**: Defines the AI's persona and role
- **Context Formatting**: Structures conversation and CRM data
- **Task-Specific Templates**: Specialized prompts for different sales scenarios
- **Response Formatting**: Guides output structure and tone

## System Prompt Design

### Core Persona Definition

```
You are Closezly, an AI Sales Co-Pilot designed to provide real-time assistance to B2B salespeople during live sales calls.

Your core mission is to help salespeople:
- Navigate conversations smoothly and professionally
- Handle objections with confidence and empathy
- Recall relevant product information instantly
- Identify opportunities to advance the deal
- Maintain rapport and build trust with prospects
```

### Guidelines and Constraints

The system prompt includes specific behavioral guidelines:
- Be concise, actionable, and highly relevant
- Provide suggestions as if whispering in their ear
- Use professional, confident, and supportive tone
- Number multiple options clearly
- Keep responses brief unless detail is requested
- Always consider conversation context
- Focus on moving deals forward while maintaining authenticity

## Context Formatting Strategy

### Structured Context Sections

1. **Prospect Information**
   - Name and company
   - Deal stage
   - Previous interactions

2. **Current Conversation**
   - Recent transcript segment
   - On-screen content

3. **CRM Data**
   - Relevant customer data
   - Deal history

4. **Specific Query**
   - Salesperson's direct question

### Example Context Format

```
[Prospect Information]:
Name: John Doe
Company: Acme Corp
Deal Stage: discovery

[Current Conversation]:
Prospect: "We're currently using Competitor X, but we're not entirely satisfied with their customer support."
Salesperson: "I understand. What specific issues have you encountered?"

[Salesperson's Question]: How should I position our superior support?
```

## Template Categories

### 1. Objection Handling

**Purpose**: Help salespeople respond to prospect concerns

**Template Structure**:
```
TASK: The prospect has raised this objection: "{objection}"

Provide 2-3 effective responses that:
- Acknowledge the concern with empathy
- Provide thoughtful rebuttal or clarifying question
- Help move the conversation forward

Format as numbered options:
SUGGESTED RESPONSES:
```

**Best Practices**:
- Acknowledge before addressing
- Ask clarifying questions
- Provide social proof when relevant
- Avoid being defensive

### 2. Product Information

**Purpose**: Provide relevant product details in sales context

**Template Structure**:
```
TASK: The salesperson needs information about: "{query}"

Provide a clear, concise answer that:
- Addresses the specific query
- Is appropriate for the sales context
- Helps position the product/service favorably
- If you don't have specific information, suggest how to find it

INFORMATION:
```

**Best Practices**:
- Focus on benefits, not just features
- Relate to prospect's specific needs
- Use accessible language
- Suggest follow-up actions

### 3. Discovery Questions

**Purpose**: Generate strategic questions to uncover needs

**Template Structure**:
```
TASK: Suggest powerful discovery questions to better understand the prospect's needs, challenges, and decision-making process.

Focus on questions that:
- Uncover pain points and challenges
- Understand their current process
- Identify decision criteria and timeline
- Reveal budget and authority
- Build rapport and trust

DISCOVERY QUESTIONS:
```

**Best Practices**:
- Use open-ended questions
- Build on previous responses
- Uncover emotional drivers
- Identify decision-making process

### 4. Competitive Positioning

**Purpose**: Position against competitors professionally

**Template Structure**:
```
TASK: The prospect mentioned competitor: "{competitor}"

Provide guidance on how to position against this competitor:
- Acknowledge their strengths professionally
- Highlight your unique differentiators
- Ask questions to understand their evaluation criteria
- Avoid negative comments about competitors

POSITIONING STRATEGY:
```

**Best Practices**:
- Never disparage competitors
- Focus on unique value propositions
- Ask about evaluation criteria
- Emphasize fit for their specific needs

### 5. Closing and Next Steps

**Purpose**: Guide toward deal advancement

**Template Structure**:
```
TASK: Help identify the best approach for closing this conversation and securing next steps.

Consider:
- Current stage of conversation
- Prospect's level of interest
- Any concerns that need addressing
- Appropriate next steps for this deal stage

Provide specific suggestions for:
1. How to summarize the conversation
2. What next steps to propose
3. How to secure commitment

CLOSING STRATEGY:
```

**Best Practices**:
- Match closing style to prospect
- Create urgency appropriately
- Secure specific commitments
- Plan follow-up actions

## Advanced Prompt Techniques

### 1. Few-Shot Examples

Include examples in prompts for better output:

```
Example responses:
1. "I understand your concern about implementation time. What's driving the urgency for your timeline?"
2. "Many clients initially worry about this. They typically find that our support team helps them get up to speed quickly."
```

### 2. Chain of Thought

Guide the AI through reasoning steps:

```
First, consider the prospect's underlying concern.
Then, think about how to address it while advancing the sale.
Finally, suggest specific language the salesperson can use.
```

### 3. Role-Playing

Set up scenarios for better context understanding:

```
You are advising a salesperson who is speaking with a technical decision-maker at a mid-size company. The prospect has expressed concerns about integration complexity.
```

### 4. Constraint Setting

Define clear boundaries:

```
Keep responses under 50 words each.
Provide exactly 3 options.
Focus only on immediate next steps.
```

## Response Quality Guidelines

### Structure

1. **Direct Answer**: Address the specific question
2. **Context Consideration**: Reference conversation details
3. **Actionable Advice**: Provide specific next steps
4. **Professional Tone**: Maintain sales-appropriate language

### Tone Characteristics

- **Confident**: Show expertise without arrogance
- **Empathetic**: Understand prospect concerns
- **Strategic**: Focus on deal advancement
- **Supportive**: Help salesperson succeed

### Content Quality

- **Relevant**: Directly applicable to situation
- **Specific**: Avoid generic advice
- **Balanced**: Consider multiple perspectives
- **Practical**: Easy to implement immediately

## Testing and Iteration

### A/B Testing Prompts

1. Create variations of prompt templates
2. Test with similar scenarios
3. Measure response quality and relevance
4. Iterate based on feedback

### Quality Metrics

- **Relevance**: How well does response match context?
- **Actionability**: Can salesperson immediately use advice?
- **Accuracy**: Is information correct and helpful?
- **Tone**: Does it match professional sales context?

### Feedback Loop

1. Collect user feedback on responses
2. Analyze common issues or gaps
3. Refine prompts based on patterns
4. Test improvements with real scenarios

## Common Pitfalls and Solutions

### Pitfall: Generic Responses
**Solution**: Include more specific context and constraints

### Pitfall: Too Verbose
**Solution**: Add length constraints and emphasize brevity

### Pitfall: Inappropriate Tone
**Solution**: Strengthen persona definition and examples

### Pitfall: Missing Context
**Solution**: Improve context formatting and validation

## Customization Guidelines

### Industry-Specific Adaptations

- Adjust terminology for industry
- Include relevant compliance considerations
- Reference industry-specific pain points
- Use appropriate communication styles

### Company-Specific Customization

- Include product-specific information
- Reference company values and positioning
- Adapt to sales methodology
- Include competitive differentiators

### Role-Based Variations

- **SDRs**: Focus on qualification and discovery
- **AEs**: Emphasize closing and negotiation
- **CSMs**: Highlight retention and expansion

## Future Enhancements

1. **Dynamic Prompts**: Adjust based on deal stage
2. **Personalization**: Adapt to individual salesperson style
3. **Learning**: Improve based on successful outcomes
4. **Integration**: Connect with CRM for better context
5. **Multimodal**: Include visual context from screen sharing

For implementation details, see the [AI Setup Guide](./AI_SETUP.md) and [API Reference](./API_REFERENCE.md).

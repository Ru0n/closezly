# AI Setup Guide - Closezly Backend Services

This guide covers the setup and configuration of the AI integration using Google Gemini for Closezly's sales assistance features.

## Prerequisites

- Node.js 18+ (required for Google GenAI SDK)
- Google Cloud Project with Gemini API enabled
- Valid Gemini API key from Google AI Studio

## Getting Your Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key or use an existing one
4. Copy the API key for configuration

## Environment Configuration

### 1. Set Environment Variables

Add the following to your `.env` file in `packages/backend-services/`:

```env
# Google Gemini AI Configuration
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Optional: Logging configuration
LOG_LEVEL=INFO  # Options: ERROR, WARN, INFO, DEBUG
NODE_ENV=development  # or production
```

### 2. Verify Installation

The Google GenAI SDK should already be installed. If not, run:

```bash
cd packages/backend-services
npm install @google/genai
```

## Architecture Overview

### Core Components

1. **LLMOrchestrationService** (`src/services/llmOrchestrationService.ts`)
   - Handles communication with Google Gemini API
   - Provides text generation and streaming capabilities
   - Includes error handling and connection validation

2. **SalesPromptTemplates** (`src/prompts/salesPromptTemplates.ts`)
   - Contains specialized prompts for sales scenarios
   - Supports 7 different assistance types
   - Includes context formatting and persona definition

3. **Assist API** (`src/api/v1/assist.ts`)
   - RESTful endpoints for AI assistance
   - Request validation and error handling
   - Performance monitoring and logging

### Supported Assistance Types

- `objection` - Handle sales objections
- `product_info` - Provide product information
- `competitive_positioning` - Position against competitors
- `price_objection` - Handle price-related concerns
- `closing` - Suggest closing strategies
- `discovery` - Generate discovery questions
- `general_assistance` - Provide contextual help

## API Endpoints

### POST /api/v1/assist/realtime

Main endpoint for synchronous AI assistance.

**Request Body:**
```json
{
  "context": {
    "currentTranscriptSegment": "Recent conversation...",
    "prospectName": "John Doe",
    "companyName": "Acme Corp",
    "dealStage": "discovery",
    "userQuery": "Optional specific question"
  },
  "assistanceType": "objection",
  "query": "They said our price is too high"
}
```

**Response:**
```json
{
  "success": true,
  "assistanceType": "objection",
  "suggestions": [
    "I understand price is a concern. What specific aspect of the pricing structure concerns you most?",
    "Many of our clients initially felt that way. They found that the ROI became clear once we..."
  ],
  "rawResponse": "Full AI response text",
  "usage": {
    "promptTokens": 150,
    "candidatesTokens": 75,
    "totalTokens": 225
  },
  "performance": {
    "totalDuration": 1250,
    "requestId": "req_123456"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### POST /api/v1/assist/stream

Streaming endpoint for real-time responses.

**Request:** Same as `/realtime`

**Response:** Server-Sent Events stream
```
data: {"text": "I understand", "done": false}
data: {"text": " your concern about", "done": false}
data: {"done": true}
```

### GET /api/v1/assist/health

Health check endpoint for the AI service.

**Response:**
```json
{
  "status": "healthy",
  "service": "assist",
  "llm": "connected",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Configuration Options

### LLM Generation Parameters

You can customize the AI generation behavior:

```typescript
const response = await LLMOrchestrationService.generateText({
  prompt: "Your prompt here",
  temperature: 0.7,      // Creativity (0.0-1.0)
  maxOutputTokens: 500,  // Maximum response length
  topK: 40,              // Token selection diversity
  topP: 0.95             // Nucleus sampling
})
```

### Model Selection

Currently using `gemini-2.0-flash-001` for optimal performance and latest capabilities. To change:

```typescript
// In llmOrchestrationService.ts
const result = await genAI.models.generateContent({
  model: 'gemini-2.0-flash-001', // Change this
  contents: [{ parts: [{ text: prompt }] }],
  config: { /* ... */ }
})
```

## Error Handling

The system includes comprehensive error handling:

### Common Error Codes

- `VALIDATION_ERROR` - Invalid request format
- `MISSING_QUERY` - Required query parameter missing
- `LLM_ERROR` - AI generation failed
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `AUTHENTICATION_ERROR` - Invalid or missing auth

### Error Response Format

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "additionalInfo": "..."
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req_123456"
}
```

## Monitoring and Logging

### Log Levels

Set `LOG_LEVEL` environment variable:
- `ERROR` - Only errors
- `WARN` - Warnings and errors
- `INFO` - General information (default)
- `DEBUG` - Detailed debugging

### Performance Monitoring

Each request includes performance metrics:
- Total duration
- Checkpoint timings
- Token usage
- Request tracking

### Health Monitoring

Monitor the `/health` endpoint for:
- Service availability
- LLM connectivity
- Response times

## Security Considerations

1. **API Key Protection**
   - Never commit API keys to version control
   - Use environment variables
   - Rotate keys regularly

2. **Content Safety**
   - Built-in content validation
   - Safety filters enabled
   - Input sanitization

3. **Rate Limiting**
   - Framework in place for rate limiting
   - Monitor API usage
   - Implement quotas as needed

## Troubleshooting

### Common Issues

1. **"GEMINI_API_KEY is not set"**
   - Verify `.env` file exists
   - Check API key is correctly set
   - Restart the server

2. **"API quota exceeded"**
   - Check Google Cloud Console quotas
   - Monitor usage patterns
   - Consider upgrading plan

3. **"Content was blocked"**
   - Review input content
   - Adjust safety settings if needed
   - Rephrase prompts

### Debug Mode

Enable debug logging:
```env
LOG_LEVEL=DEBUG
```

This will show detailed request/response information.

## Next Steps

1. Test the integration with your Gemini API key
2. Customize prompts for your specific use cases
3. Implement additional assistance types as needed
4. Set up monitoring and alerting
5. Consider implementing caching for frequently used prompts

For more information, see the API Reference documentation.

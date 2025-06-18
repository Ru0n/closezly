# API Reference - Closezly Backend Services

## Base URL

```
http://localhost:4000/api/v1
```

## Authentication

All AI assistance endpoints require authentication. Include the authorization header:

```
Authorization: Bearer <your-token>
```

## AI Assistance Endpoints

### POST /assist/realtime

Generate real-time sales assistance based on conversation context.

#### Request

**Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer <token>`

**Body:**
```json
{
  "context": {
    "currentTranscriptSegment": "string (optional)",
    "onScreenText": "string (optional)",
    "userQuery": "string (optional)",
    "prospectName": "string (optional)",
    "companyName": "string (optional)",
    "dealStage": "string (optional)",
    "previousInteractions": "string (optional)",
    "crmData": "object (optional)"
  },
  "assistanceType": "string (required)",
  "query": "string (conditional)"
}
```

**Assistance Types:**
- `objection` - Handle sales objections (requires `query`)
- `product_info` - Provide product information (requires `query`)
- `competitive_positioning` - Position against competitors (requires `query`)
- `price_objection` - Handle price concerns (requires `query`)
- `closing` - Suggest closing strategies
- `discovery` - Generate discovery questions
- `general_assistance` - Provide contextual help

#### Response

**Success (200):**
```json
{
  "success": true,
  "assistanceType": "objection",
  "suggestions": [
    "Suggestion 1",
    "Suggestion 2"
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

**Error (400/500):**
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": {},
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req_123456"
}
```

### POST /assist/stream

Stream real-time sales assistance responses.

#### Request

Same as `/assist/realtime`

#### Response

Server-Sent Events stream:

```
data: {"text": "Partial response", "done": false}
data: {"text": " continuation", "done": false}
data: {"done": true}
```

### GET /assist/health

Check the health status of the AI assistance service.

#### Response

**Healthy (200):**
```json
{
  "status": "healthy",
  "service": "assist",
  "llm": "connected",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Unhealthy (503):**
```json
{
  "status": "unhealthy",
  "service": "assist",
  "llm": "disconnected",
  "error": "Connection failed",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Example Requests

### Handling an Objection

```bash
curl -X POST http://localhost:4000/api/v1/assist/realtime \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "context": {
      "currentTranscriptSegment": "Prospect: Your solution seems too expensive for our budget.",
      "prospectName": "Sarah Johnson",
      "companyName": "TechCorp Inc",
      "dealStage": "negotiation"
    },
    "assistanceType": "objection",
    "query": "They said our price is too high"
  }'
```

### Getting Product Information

```bash
curl -X POST http://localhost:4000/api/v1/assist/realtime \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "context": {
      "currentTranscriptSegment": "Prospect: Can you tell me more about your security features?",
      "prospectName": "Mike Chen",
      "companyName": "SecureData Ltd"
    },
    "assistanceType": "product_info",
    "query": "security features and compliance"
  }'
```

### Discovery Questions

```bash
curl -X POST http://localhost:4000/api/v1/assist/realtime \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "context": {
      "currentTranscriptSegment": "We are in the early stages of evaluating solutions.",
      "prospectName": "Lisa Wang",
      "companyName": "GrowthCo",
      "dealStage": "discovery"
    },
    "assistanceType": "discovery"
  }'
```

### Competitive Positioning

```bash
curl -X POST http://localhost:4000/api/v1/assist/realtime \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "context": {
      "currentTranscriptSegment": "We are also looking at Salesforce as an option.",
      "prospectName": "David Kim",
      "companyName": "Enterprise Corp"
    },
    "assistanceType": "competitive_positioning",
    "query": "Salesforce"
  }'
```

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `MISSING_REQUIRED_FIELDS` | Required fields missing | 400 |
| `MISSING_QUERY` | Query required for assistance type | 400 |
| `INVALID_ASSISTANCE_TYPE` | Unknown assistance type | 400 |
| `AUTHENTICATION_ERROR` | Authentication required | 401 |
| `AUTHORIZATION_ERROR` | Insufficient permissions | 403 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `LLM_ERROR` | AI generation failed | 500 |
| `EXTERNAL_SERVICE_ERROR` | External service unavailable | 502 |
| `INTERNAL_ERROR` | Internal server error | 500 |

## Rate Limiting

- Default: 100 requests per minute per user
- Headers included in response:
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

## Response Headers

All responses include:
- `X-Request-ID`: Unique request identifier
- `Content-Type`: Response content type
- `X-Response-Time`: Processing time in milliseconds

## Validation Rules

### Context Object
- All fields are optional
- String fields max length: 5000 characters
- `crmData` must be valid JSON object

### Query Parameter
- Required for: `objection`, `product_info`, `competitive_positioning`, `price_objection`
- Max length: 1000 characters
- Must be non-empty string

### Assistance Type
- Must be one of the supported types
- Case-sensitive

## Best Practices

1. **Include Context**: Provide as much relevant context as possible for better responses
2. **Specific Queries**: Be specific in your queries for targeted assistance
3. **Error Handling**: Always handle error responses gracefully
4. **Rate Limiting**: Implement client-side rate limiting
5. **Logging**: Log request IDs for debugging
6. **Timeouts**: Set appropriate request timeouts (recommended: 30 seconds)

## SDK Examples

### JavaScript/TypeScript

```typescript
interface AssistanceRequest {
  context: {
    currentTranscriptSegment?: string;
    prospectName?: string;
    companyName?: string;
    dealStage?: string;
  };
  assistanceType: string;
  query?: string;
}

async function getAssistance(request: AssistanceRequest): Promise<any> {
  const response = await fetch('/api/v1/assist/realtime', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}
```

### Python

```python
import requests

def get_assistance(context, assistance_type, query=None, token=None):
    url = "http://localhost:4000/api/v1/assist/realtime"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    data = {
        "context": context,
        "assistanceType": assistance_type
    }
    if query:
        data["query"] = query
    
    response = requests.post(url, json=data, headers=headers)
    response.raise_for_status()
    return response.json()
```

For more detailed setup instructions, see the [AI Setup Guide](./AI_SETUP.md).

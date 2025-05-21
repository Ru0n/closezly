
# Closezly - Technical Architecture and Design

**Version:** 1.0
**Date:** May 6th, 2025
**Status:** Draft

## Table of Contents
1.  [Introduction & Goals](#1-introduction--goals)
    1.1. [System Purpose](#11-system-purpose)
    1.2. [Architectural Goals](#12-architectural-goals)
2.  [System Overview Diagram](#2-system-overview-diagram)
3.  [Desktop Application Architecture (Electron App)](#3-desktop-application-architecture-electron-app)
    3.1. [Main Process Design](#31-main-process-design)
    3.2. [Renderer Process Design (UI Overlay)](#32-renderer-process-design-ui-overlay)
    3.3. [IPC Contract](#33-ipc-contract)
    3.4. [Key Data Flow Diagrams (Desktop)](#34-key-data-flow-diagrams-desktop)
4.  [Backend Services Architecture](#4-backend-services-architecture)
    4.1. [Deployment Strategy](#41-deployment-strategy)
    4.2. [Service Breakdown](#42-service-breakdown)
    4.3. [API Design Principles](#43-api-design-principles)
    4.4. [Key Data Flow Diagrams (Backend)](#44-key-data-flow-diagrams-backend)
5.  [Database Design](#5-database-design)
    5.1. [Primary Database (PostgreSQL)](#51-primary-database-postgresql)
    5.2. [Vector Database (pgvector)](#52-vector-database-pgvector)
    5.3. [Data Access Layer (DAL)](#53-data-access-layer-dal)
6.  [API Specifications](#6-api-specifications)
7.  [Integration Points](#7-integration-points)
    7.1. [LLM Service (Google Gemini / OpenAI GPT-4V)](#71-llm-service-google-gemini--openai-gpt-4v)
    7.2. [Real-Time Transcription Service](#72-real-time-transcription-service)
    7.3. [CRM Integrations (Salesforce, HubSpot)](#73-crm-integrations-salesforce-hubspot)
    7.4. [Payment Gateway (Stripe)](#74-payment-gateway-stripe)
8.  [Security Design](#8-security-design)
    8.1. [Authentication & Authorization](#81-authentication--authorization)
    8.2. [Data Security](#82-data-security)
    8.3. [Desktop App Security](#83-desktop-app-security)
    8.4. [Web Portal Security](#84-web-portal-security)
9.  [Deployment & Infrastructure (Web Portal & Backend)](#9-deployment--infrastructure-web-portal--backend)
    9.1. [Hosting Environment](#91-hosting-environment)
    9.2. [CI/CD Pipeline](#92-cicd-pipeline)
    9.3. [Logging, Monitoring & Alerting](#93-logging-monitoring--alerting)
    9.4. [Environment Configuration](#94-environment-configuration)
10. [Scalability & Performance](#10-scalability--performance)
    10.1. [Desktop Application](#101-desktop-application)
    10.2. [Backend Services](#102-backend-services)
    10.3. [Database](#103-database)
11. [Tech Stack Summary](#11-tech-stack-summary)
12. [Open Issues & Future Considerations](#12-open-issues--future-considerations)

---

## 1. Introduction & Goals

### 1.1. System Purpose
Closezly is an AI-powered sales co-pilot delivered as a desktop application. It provides real-time guidance to sales professionals during live calls by analyzing screen content and audio conversations, integrating with CRMs, and leveraging a custom knowledge base. The system aims to enhance sales effectiveness, efficiency, and skill development.
(Reference: PRD.md Section 1)

### 1.2. Architectural Goals
*   **Scalability:** System must handle a growing number of users, concurrent calls, and increasing data volumes for RAG and analytics.
*   **Reliability & Availability:** Ensure high uptime for backend services and robust performance of the desktop application. Minimize downtime.
*   **Performance & Low Latency:** Real-time suggestions are critical. Minimize latency in audio transcription, LLM responses, and RAG retrievals.
*   **Security:** Protect sensitive user data (call transcripts, screen content, CRM data, PII) through robust authentication, authorization, and encryption.
*   **Maintainability & Extensibility:** Design for ease of updates, bug fixes, and future feature additions (e.g., new CRM integrations, AI Sales Agent).
*   **Cost-Effectiveness:** Optimize infrastructure and API usage to manage operational costs, especially for LLM and transcription services.
*   **User Experience:** Ensure the desktop overlay is non-intrusive, responsive, and genuinely helpful.

## 2. System Overview Diagram

```mermaid
graph TD
    subgraph User Desktop
        DA[Closezly Desktop App (Electron)]
    end

    subgraph Closezly Cloud Platform
        WP[Web Portal (Next.js on Vercel)]
        Auth[Authentication Service (e.g., Supabase Auth/Auth0)]
        API[Backend API (Node.js/TypeScript on Serverless/Containers)]
        DB[Primary Database (PostgreSQL w/ pgvector on Supabase/Neon/RDS)]
        RAG[RAG Service (Vector Ops)]
        CRMInt[CRM Integration Service]
        SubMgt[Subscription Mgt Service]
    end

    subgraph Third-Party Services
        LLM[Multimodal LLM (Gemini/GPT-4V)]
        Transcribe[Transcription Service (AssemblyAI/Deepgram)]
        SFDC[Salesforce API]
        HS[HubSpot API]
        Stripe[Stripe API]
    end

    DA -- HTTPS (API Calls) --> API
    DA -- Secure Connection --> Auth
    DA -- Websocket/HTTP (Audio Chunks) --> Transcribe
    DA -- HTTPS (LLM Prompts) --> LLM

    WP -- HTTPS --> API
    WP -- Secure Connection --> Auth
    WP -- HTTPS (Payment) --> Stripe

    API -- SQL --> DB
    API -- SDK/HTTP --> LLM
    API -- SDK/HTTP --> Transcribe
    API -- Internal Call --> RAG
    API -- Internal Call --> CRMInt
    API -- Internal Call --> SubMgt
    API -- SDK/HTTP --> Auth
    API -- SDK/HTTP --> Stripe

    RAG -- Vector Ops --> DB
    CRMInt -- HTTPS --> SFDC
    CRMInt -- HTTPS --> HS
```
*Figure 1: High-Level System Architecture*

## 3. Desktop Application Architecture (Electron App)

(Leveraging insights from "Free Cluely" clone structure)

### 3.1. Main Process Design (`electron/main.ts`)
*   **Responsibilities:**
    *   Application lifecycle management.
    *   `BrowserWindow` (overlay) creation and management (`WindowHelper.ts`).
    *   Global keyboard shortcut registration and handling (`ShortcutsHelper.ts`).
    *   IPC handling for communication with Renderer process (`ipcHandlers.ts`).
    *   Core application state management (`AppState.ts` - singleton).
    *   Orchestration of screen capture, audio capture, and data processing.
    *   Secure storage of user tokens and sensitive settings.
*   **Key Modules:**
    *   `AppState.ts`: Singleton managing global app state (current view, auth status, active call context, etc.).
    *   `WindowHelper.ts`: Manages overlay window (creation, visibility, positioning, sizing, transparency).
    *   `ScreenshotHelper.ts`: Manages screen capture (using `desktopCapturer` or `screenshot-desktop`), image formatting.
    *   `AudioHelper.ts`: Manages microphone and system audio input (using `navigator.mediaDevices.getUserMedia` or native bindings if necessary for system audio), chunking, and forwarding to transcription service.
    *   `TranscriptionOrchestrator.ts`: Manages connection to real-time transcription service, receives transcripts, and updates `AppState`.
    *   `LLMInteractionHelper.ts`: Constructs multimodal prompts (screen image, transcript, RAG context) and communicates with the backend API for LLM processing.
    *   `RAGQueryHelper.ts`: (If some RAG logic is client-side, or to trigger backend RAG) - interacts with backend for RAG.
    *   `CRMContextHelper.ts`: Interacts with backend to fetch/display relevant CRM context.
    *   `AuthHelper.ts`: Manages authentication tokens, refresh mechanisms, and communication with Auth service via backend.
    *   `SettingsManager.ts`: Manages user preferences and app settings (persisted locally via `electron-store`).
*   **OS Interaction:**
    *   Screen Capture: `electron.desktopCapturer.getSources()` followed by `navigator.mediaDevices.getUserMedia({video: {mandatory: {chromeMediaSource: 'desktop', chromeMediaSourceId: source.id}}})` for specific windows/screen. `screenshot-desktop` as a fallback or for full screen.
    *   Audio Capture: `navigator.mediaDevices.getUserMedia({audio: true})` for microphone. System audio might require OS-specific APIs or virtual audio drivers (explore `node-loudness` or similar for ideas, though direct capture is preferred).
    *   File System: For temporary storage of screenshots if needed before sending, and managing local settings.

### 3.2. Renderer Process Design (UI Overlay - `src/` directory)
*   **Framework:** React with TypeScript.
*   **Bundler:** Vite.
*   **Styling:** Tailwind CSS.
*   **Responsibilities:**
    *   Rendering the overlay UI based on data received from the Main process.
    *   Displaying real-time suggestions, CRM info, query results.
    *   Handling user input in the overlay (e.g., manual query text box).
    *   Communicating user actions back to the Main process via IPC.
*   **Component Structure (High-Level):**
    *   `App.tsx`: Root component, routing for different overlay states (idle, suggesting, querying, settings peek).
    *   `OverlayView.tsx`: Main view displaying suggestions and contextual info.
    *   `QueryInput.tsx`: Component for manual text queries.
    *   `SuggestionItem.tsx`: Component to display individual AI suggestions.
    *   `SettingsPanel.tsx` (Minimal, if any direct settings in overlay): Quick toggles.
*   **State Management:** Zustand or Jotai for managing UI state (visibility, content, loading states).
*   **Communication:** Via `window.electronAPI` exposed by `electron/preload.ts`.

### 3.3. IPC Contract (`electron/preload.ts` and `electron/ipcHandlers.ts`)
*(Examples; to be fully defined)*
*   `closezly:toggle-visibility` (Main -> Renderer, Renderer -> Main)
*   `closezly:take-screenshot-and-process` (Renderer -> Main) -> Triggers full processing loop.
*   `closezly:process-manual-query` (Renderer -> Main, Payload: { queryText: string })
*   `closezly:update-overlay-content` (Main -> Renderer, Payload: { suggestions: [], crmData: {}, currentQuery: "" })
*   `closezly:set-window-position` (Renderer -> Main, Payload: { deltaX: number, deltaY: number })
*   `closezly:get-auth-status` (Renderer -> Main) -> (Main -> Renderer, Payload: { isAuthenticated: boolean })
*   `closezly:connect-crm` (Renderer -> Main, Payload: { crmType: string }) -> Triggers OAuth flow via backend/web.
*   `closezly:upload-document-trigger` (Renderer -> Main) -> Opens web portal or file dialog.
*   `closezly:audio-chunk-for-transcription` (Main -> Backend API/Transcription Service directly, or Renderer captures and Main forwards)
*   `closezly:live-transcript-segment` (Transcription Service/Backend API -> Main -> Renderer)
*   `closezly:resize-window-from-content` (Renderer -> Main, Payload: { width: number, height: number })

### 3.4. Key Data Flow Diagrams (Desktop)

*   **Live Suggestion Flow:**
    1.  User on call (audio capture active via `AudioHelper`).
    2.  Hotkey pressed OR AI detects trigger phrase from live transcript.
    3.  `ShortcutHelper` notifies `AppState`.
    4.  `ScreenshotHelper` captures screen -> image buffer.
    5.  `TranscriptionOrchestrator` provides latest transcript segment.
    6.  `LLMInteractionHelper` packages image buffer, transcript, (and RAG context from backend via `RAGQueryHelper`) into multimodal prompt.
    7.  Sends request to Backend API (`/api/v1/assist/realtime`).
    8.  Backend API forwards to LLM, gets response.
    9.  Backend API returns suggestion to Desktop App.
    10. `AppState` updates, `ipcRenderer.send('closezly:update-overlay-content', ...)`
    11. Renderer process displays suggestion in overlay.

*   **Document Upload for RAG (Triggered from Desktop, Processed by Backend):**
    1. User clicks "Upload Document" in Desktop App (minimal UI or link).
    2. Desktop App opens Web Portal page (`/dashboard/knowledge`) or triggers OS file dialog.
    3. User uploads file via Web Portal.
    4. Web Portal sends file to Backend API (`/api/v1/knowledge/upload`).
    5. Backend RAG Service processes, chunks, embeds, and stores in Vector DB.

## 4. Backend Services Architecture

### 4.1. Deployment Strategy
*   **Primary:** Serverless Functions (Vercel Functions for Next.js API routes, or AWS Lambda/Google Cloud Functions for dedicated microservices).
*   **Secondary (if needed for long-running tasks like large document processing):** Containerized services (e.g., Google Cloud Run, AWS Fargate).

### 4.2. Service Breakdown (Logical Monolith with distinct modules, or Microservices)
*   **Gateway/API Service (Main Entry Point):**
    *   Handles incoming requests from Desktop App and Web Portal.
    *   Authentication middleware.
    *   Request validation.
    *   Routes requests to appropriate internal handlers/services.
*   **User & Auth Service:**
    *   Manages user registration, login, profile, password reset.
    *   Integrates with external Identity Provider (Supabase Auth/Auth0).
    *   Manages API keys or tokens for desktop app sessions.
*   **Subscription & Billing Service:**
    *   Integrates with Stripe for subscription management, payment processing, invoicing.
    *   Manages user subscription tiers and feature access.
*   **LLM Orchestration Service:**
    *   Receives prompts from Desktop App.
    *   Adds system prompts, few-shot examples.
    *   Manages interaction with chosen Multimodal LLM API (Gemini/GPT-4V).
    *   Handles LLM API error handling, retries.
    *   Parses and formats LLM responses.
*   **RAG Service:**
    *   **Ingestion API:** Endpoint for uploading documents. Chunks text, generates embeddings (via LLM embedding API), stores in Vector DB.
    *   **Query API:** Endpoint for semantic search. Takes query text, generates embedding, queries Vector DB, returns relevant chunks.
*   **CRM Integration Service:**
    *   Handles OAuth flows for connecting Salesforce, HubSpot.
    *   Securely stores CRM API tokens.
    *   Provides an abstraction layer for fetching data from and writing data to CRMs.
    *   Translates Closezly data models to CRM-specific object models.
*   **Transcription Service Gateway:**
    *   If using a cloud transcription service, this might be a thin wrapper or the desktop client might connect directly if the service supports secure client-side streaming.
    *   Handles authentication with the transcription service.
*   **Call Analytics Service:**
    *   Processes stored call transcripts post-call.
    *   Calculates metrics (talk/listen ratio, etc.).
    *   Generates summaries and follow-up email drafts (via LLM).

### 4.3. API Design Principles
*   **RESTful APIs:** Primarily using standard HTTP methods (GET, POST, PUT, DELETE).
*   **JSON Payloads:** For requests and responses.
*   **Stateless:** APIs should be stateless where possible; client sends necessary context (e.g., auth token).
*   **Versioning:** API versioning via URL prefix (e.g., `/api/v1/...`).
*   **Idempotency:** Ensure operations like payment processing are idempotent.

### 4.4. Key Data Flow Diagrams (Backend)

*   **Real-time Assistance Request:**
    `Desktop App -> API Gateway -> Auth Middleware -> LLM Orchestration Service -> (RAG Service for context) -> LLM Service -> LLM Orchestration Service -> API Gateway -> Desktop App`

*   **Document Upload & Indexing for RAG:**
    `Web Portal/Desktop -> API Gateway -> Auth Middleware -> RAG Service (Ingestion) -> LLM Embedding API -> Vector DB (Store Embeddings)`

*   **Post-Call Summary Generation:**
    `Desktop App (request summary) -> API Gateway -> Auth Middleware -> Call Analytics Service -> DB (fetch transcript) -> LLM Orchestration Service -> LLM Service -> Call Analytics Service -> DB (store summary) -> API Gateway -> Desktop App`

## 5. Database Design

### 5.1. Primary Database (PostgreSQL - e.g., via Supabase, Neon, AWS RDS)
*(Simplified Schemas - to be detailed further)*

*   **`users`**: `user_id (PK, UUID)`, `email (UNIQUE)`, `hashed_password` (if not fully offloaded to IdP), `full_name`, `created_at`, `updated_at`, `auth_provider_user_id` (if using external IdP).
*   **`subscriptions`**: `subscription_id (PK, UUID)`, `user_id (FK)`, `plan_id (FK)`, `stripe_subscription_id`, `status (active, canceled, past_due)`, `current_period_start`, `current_period_end`, `created_at`, `updated_at`.
*   **`plans`**: `plan_id (PK, UUID)`, `name (e.g., Free, Pro, Team)`, `price_monthly`, `price_annually`, `feature_limits (JSONB)`.
*   **`crm_connections`**: `connection_id (PK, UUID)`, `user_id (FK)`, `crm_type (salesforce, hubspot)`, `access_token (encrypted)`, `refresh_token (encrypted)`, `instance_url` (for Salesforce), `status (active, revoked)`, `created_at`, `updated_at`.
*   **`user_documents`**: `document_id (PK, UUID)`, `user_id (FK)`, `file_name`, `storage_path (S3/GCS link)`, `mime_type`, `status (pending, processing, indexed, error)`, `created_at`, `updated_at`, `team_id (FK, nullable)`.
*   **`document_chunks`**: `chunk_id (PK, UUID)`, `document_id (FK)`, `chunk_text (TEXT)`, `embedding (vector via pgvector)`, `metadata (JSONB)`, `created_at`. (This table effectively becomes part of the Vector DB functionality with pgvector).
*   **`call_transcripts`**: `transcript_id (PK, UUID)`, `user_id (FK)`, `call_start_time`, `call_end_time`, `full_transcript (TEXT or JSONB with speaker diarization)`, `raw_audio_storage_path (nullable)`, `created_at`.
*   **`call_summaries`**: `summary_id (PK, UUID)`, `transcript_id (FK)`, `summary_text (TEXT)`, `key_points (JSONB)`, `action_items (JSONB)`, `sentiment_overview (JSONB, stretch)`, `created_at`.

### 5.2. Vector Database (using `pgvector` extension within PostgreSQL)
*   The `document_chunks` table will have a `vector` column of type `vector(dimensions)` (e.g., `vector(1536)` for OpenAI embeddings).
*   An IVFFlat or HNSW index will be created on the `embedding` column for efficient similarity search.

### 5.3. Data Access Layer (DAL)
*   **ORM:** Prisma or TypeORM recommended for Node.js/TypeScript backend for type safety and developer productivity.
*   Raw SQL queries for complex analytics or pgvector operations if ORM support is limited.

## 6. API Specifications

*(To be detailed in a separate `OPENAPI_SPEC.yaml` file, generated using Swagger/OpenAPI tools or annotations like Tsoa for NestJS/Express)*

**Example Endpoints:**

*   **Auth:**
    *   `POST /api/v1/auth/register`
    *   `POST /api/v1/auth/login` (returns JWT)
    *   `POST /api/v1/auth/refresh-token`
    *   `GET /api/v1/auth/me`
*   **Real-time Assistance:**
    *   `POST /api/v1/assist/realtime` (Payload: { image_base64?: string, transcript_segment: string, crm_context_ids?: string[], rag_query_text?: string })
*   **Knowledge Base (RAG):**
    *   `POST /api/v1/knowledge/documents` (Upload document - multipart/form-data)
    *   `GET /api/v1/knowledge/documents` (List user's documents)
    *   `DELETE /api/v1/knowledge/documents/{document_id}`
*   **CRM:**
    *   `POST /api/v1/crm/connect/{crm_type}` (Initiate OAuth flow)
    *   `GET /api/v1/crm/callback/{crm_type}` (OAuth callback)
    *   `GET /api/v1/crm/context` (Payload: { active_call_info }) -> Returns relevant CRM data.
    *   `POST /api/v1/crm/log_call_summary` (Payload: { crm_record_id, summary_object })
*   **Call Analytics:**
    *   `POST /api/v1/calls/transcripts` (Desktop app uploads full transcript post-call if not streamed)
    *   `GET /api/v1/calls/summaries/{transcript_id}`
    *   `POST /api/v1/calls/summaries/{transcript_id}/generate_email_draft`

## 7. Integration Points

### 7.1. LLM Service (Google Gemini / OpenAI GPT-4V / Anthropic Claude 3)
*   **Interaction:** Via official SDKs (e.g., `@google/generative-ai`, `openai`) or direct HTTPS REST API calls.
*   **Authentication:** API Keys managed securely in backend environment variables/secrets manager.
*   **Prompting:** Multimodal prompts including image data (base64 encoded), text (transcripts, RAG context, system instructions).
*   **Error Handling:** Implement retries with exponential backoff for transient errors. Handle rate limits gracefully.

### 7.2. Real-Time Transcription Service (e.g., AssemblyAI, Deepgram)
*   **Interaction:** Typically via WebSocket for real-time streaming or batched HTTP for shorter segments.
*   **Authentication:** API Keys.
*   **Features:** Expect speaker diarization, punctuation, and low latency.
*   **Data Format:** Audio chunks (e.g., PCM, Opus, WAV) sent; text transcripts received.

### 7.3. CRM Integrations (Salesforce, HubSpot)
*   **Authentication:** OAuth 2.0 Authorization Code Grant Flow. Securely store access and refresh tokens (encrypted).
*   **APIs:**
    *   Salesforce: REST API (using `jsforce` library or direct HTTP). Key objects: Lead, Contact, Account, Opportunity, Task, Event.
    *   HubSpot: REST API (using `@hubspot/api-client` library or direct HTTP). Key objects: Contact, Company, Deal, Engagement (Note, Call).
*   **Data Mapping:** Define mappings between Closezly concepts (e.g., call summary) and CRM objects/fields.
*   **Rate Limits:** Adhere to CRM API rate limits.

### 7.4. Payment Gateway (Stripe)
*   **Interaction:** Stripe SDK (`stripe-node`) for backend; Stripe Elements or Checkout for frontend (Web Portal).
*   **Features:** Subscription creation, plan changes, cancellations, payment processing, invoice generation, webhook handling for subscription events.

## 8. Security Design

### 8.1. Authentication & Authorization
*   **Users:** JWT-based authentication for API access. Secure password hashing (if managing passwords directly) or reliance on IdP.
*   **Desktop App:** Secure storage of refresh tokens. Short-lived access tokens.
*   **Backend Services:** Service-to-service authentication if using microservices (e.g., internal tokens, mTLS).
*   **Role-Based Access Control (RBAC):** For future team features (e.g., admin vs. user roles).

### 8.2. Data Security
*   **Encryption in Transit:** HTTPS/TLS for all external communication.
*   **Encryption at Rest:**
    *   Database encryption (provided by managed DB services).
    *   Sensitive tokens (CRM access/refresh tokens) encrypted in the database using application-level encryption (e.g., AES-256 with keys managed by a secrets manager like AWS KMS, Google Cloud KMS, HashiCorp Vault).
    *   User documents in cloud storage (S3/GCS) encrypted at rest.
*   **Data Minimization:** Only collect and store data necessary for functionality.
*   **PII Handling:** Identify and handle PII according to privacy policies and regulations (GDPR, CCPA).
*   **API Key Management:** LLM, Transcription, and other third-party API keys stored securely in backend environment/secrets, not exposed to clients.

### 8.3. Desktop App Security
*   **Electron Security Best Practices:**
    *   `contextIsolation: true` (default in newer Electron)
    *   `nodeIntegration: false` in renderer (use preload script for specific Node capabilities)
    *   `webSecurity: true`
    *   `sandbox: true` for renderer processes if feasible.
    *   Validate all IPC messages.
    *   Content Security Policy (CSP).
*   **Code Signing:** Sign macOS and Windows application bundles.
*   **Secure Local Storage:** Use `electron-store` with encryption for sensitive local settings if any, or prefer server-side storage.

### 8.4. Web Portal Security
*   Standard web security practices (OWASP Top 10).
*   HTTPS, HSTS.
*   CSRF protection.
*   XSS prevention (React helps, but be mindful of `dangerouslySetInnerHTML`).
*   Secure HTTP headers.
*   Input validation on all API endpoints.

## 9. Deployment & Infrastructure (Web Portal & Backend)

### 9.1. Hosting Environment
*   **Web Portal (Next.js):** Vercel (preferred for ease of use, scalability, Next.js optimization).
*   **Backend API (Node.js/TypeScript):**
    *   Vercel Serverless Functions.
    *   Alternative: AWS Lambda + API Gateway, Google Cloud Functions + API Gateway, or container platforms (Google Cloud Run, AWS Fargate).
*   **Database:** Managed PostgreSQL service (Supabase, Neon, AWS RDS, Google Cloud SQL).
*   **Vector DB:** Integrated with PostgreSQL (pgvector) or separate managed service (Pinecone, Weaviate Cloud).
*   **Object Storage (for user documents, audio recordings):** AWS S3, Google Cloud Storage.

### 9.2. CI/CD Pipeline
*   **Source Control:** Git (e.g., GitHub, GitLab).
*   **Automation:**
    *   GitHub Actions, GitLab CI, or Vercel's built-in CI/CD.
    *   Automated builds, tests (unit, integration, E2E for web), and deployments.
    *   Separate pipelines for Desktop App, Backend API, Web Portal.
    *   Electron app builds via `electron-builder` integrated into CI.

### 9.3. Logging, Monitoring & Alerting
*   **Logging:**
    *   Structured logging (JSON).
    *   Centralized logging service (e.g., Sentry, Datadog, AWS CloudWatch Logs, Google Cloud Logging).
*   **Monitoring:**
    *   Application Performance Monitoring (APM) (Sentry, Datadog, New Relic).
    *   Infrastructure metrics (from cloud provider).
    *   API uptime and latency monitoring.
*   **Alerting:**
    *   Alerts for critical errors, high latency, resource exhaustion (e.g., via PagerDuty, Opsgenie, or integrated monitoring tool alerts).

### 9.4. Environment Configuration
*   Separate environments for Development, Staging, and Production.
*   Configuration managed via environment variables and secrets management services (e.g., Doppler, AWS Secrets Manager, Google Secret Manager, HashiCorp Vault, Vercel Environment Variables).

## 10. Scalability & Performance

### 10.1. Desktop Application
*   Optimize React rendering (memoization, virtualized lists if needed).
*   Efficient image handling and minimization before sending to LLM if necessary.
*   Asynchronous operations for all I/O and IPC to keep UI responsive.
*   Minimize main process workload.

### 10.2. Backend Services
*   **Stateless Services:** Design APIs to be stateless for easier horizontal scaling.
*   **Asynchronous Processing:** Use message queues (e.g., AWS SQS, Google Pub/Sub, Redis Streams) for background tasks like document embedding, extensive post-call analytics.
*   **Caching:**
    *   CDN for static assets (Vercel handles this for Next.js).
    *   API response caching (e.g., Redis, Memcached) for frequently accessed, non-dynamic data.
    *   Cache LLM embedding results.
*   **Load Balancing:** Handled by serverless platforms or container orchestrators.
*   **API Rate Limiting:** Implement rate limiting on public APIs to prevent abuse.

### 10.3. Database
*   **Connection Pooling:** Essential for backend API.
*   **Efficient Indexing:** Proper indexing on frequently queried columns in PostgreSQL.
*   **Read Replicas:** For scaling read-heavy workloads if needed.
*   **Query Optimization:** Analyze and optimize slow queries.
*   **Vector DB Optimization:** Choose appropriate indexing (IVFFlat, HNSW) and query parameters for pgvector or managed vector DB.

## 11. Tech Stack Summary
*   **Desktop App:** Electron, React, TypeScript, Vite, Tailwind CSS, Zustand/Jotai.
*   **Backend API:** Node.js, TypeScript, (NestJS or Express.js optional), Serverless (Vercel Functions/AWS Lambda/Google Cloud Functions) or Containers.
*   **Web Portal:** Next.js, React, TypeScript, Tailwind CSS, Shadcn/UI.
*   **Database:** PostgreSQL (with pgvector), managed via Supabase/Neon/RDS/Cloud SQL.
*   **AI - LLM:** Google Gemini 1.5 Pro / OpenAI GPT-4V / Anthropic Claude 3 (Multimodal).
*   **AI - Transcription:** AssemblyAI / Deepgram / Google STT / AWS Transcribe.
*   **AI - Embeddings:** Models from LLM provider or dedicated embedding models.
*   **Authentication:** Supabase Auth / Auth0 / Clerk.
*   **Payments:** Stripe.
*   **Deployment (Web/Backend):** Vercel / AWS / GCP.
*   **CI/CD:** GitHub Actions / GitLab CI.
*   **Monitoring/Logging:** Sentry / Datadog.

## 12. Open Issues & Future Considerations
*   Final selection of Multimodal LLM and Transcription service based on prototyping and cost-performance analysis.
*   Detailed strategy for handling system audio capture reliably across macOS and Windows.
*   Specifics of token management and refresh strategy for desktop app long-lived sessions.
*   Real-world latency testing and optimization for the end-to-end suggestion loop.
*   Data residency and compliance requirements for specific target markets.
*   Detailed error handling and retry strategies for all third-party API integrations.
*   Approach for A/B testing AI prompts and features.

---
```

This document is designed to be a comprehensive technical guide. Developers would refer to specific sections based on the components they are working on. It should be a "living document," updated as architectural decisions are refined or changes are made during development.

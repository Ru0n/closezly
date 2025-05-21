# Closezly - Product Requirements Document (PRD)

**Version:** 1.0
**Date:** 20th may 2025
**Product Name:** Closezly
**Author/Team:** Aashish Sapkota

## 1. Introduction

Closezly is an undetectable AI sales co-pilot designed to empower high-ticket B2B sales professionals. It operates as a desktop application, providing real-time, on-call guidance, seamless CRM integration, custom knowledge retrieval, and actionable post-call analytics. By "seeing" the salesperson's screen and "hearing" their calls, Closezly delivers contextual suggestions and information privately to the user, helping them navigate complex sales conversations, handle objections, and ultimately close more deals effectively.

## 2. Goals and Objectives

### 2.1. Product Goals
*   Provide sales professionals with real-time, actionable intelligence during live sales calls.
*   Reduce call preparation time and post-call administrative work.
*   Improve the consistency and quality of sales conversations.
*   Enable users to leverage their custom sales playbooks and product knowledge effectively during calls.
*   Offer insightful post-call analytics to help salespeople learn and improve.
*   Ensure the application is undetectable during screen-sharing and discreet in its operation.

### 2.2. Business Goals (for MVP/V1)
*   Achieve [Target Number, e.g., 100-500] active users within [Target Timeframe, e.g., 6 months] post-launch.
*   Validate the core value proposition with the target ICP (Ideal Customer Profile).
*   Achieve a target user satisfaction score (e.g., NPS > 40, CSAT > 80%).
*   Gather feedback to inform V2 development, particularly for the AI Sales Agent.
*   Establish initial paying customers and validate the tiered pricing model.

## 3. Target Audience & User Personas

### 3.1. Primary Target Audience (Individuals)
*   **Role:** Account Executives (AEs) in high-ticket B2B sales.
*   **Industries:** Enterprise SaaS, High-Value B2B Services (Consulting, Agencies), Complex Financial Products, High-End Manufacturing/Technology.
*   **Pain Points:** Difficulty recalling specific product details or playbook responses under pressure, managing objections effectively, time spent on call prep and CRM updates, lack of objective feedback on call performance.
*   **Needs:** Instant access to relevant information, confidence in handling any query, improved efficiency, tools for skill development.

### 3.2. Secondary Target Audience (B2B Companies)
*   **Decision Makers:** VP of Sales, Head of Sales, Sales Enablement Managers, Sales Operations.
*   **Team Size:** Initially SMBs (5-50 salespeople), with plans to scale to larger enterprises.
*   **Pain Points:** Inconsistent sales messaging, long ramp-up times for new hires, underutilization of sales playbooks, difficulty scaling best practices, poor CRM data hygiene.
*   **Needs:** Tools to standardize sales execution, accelerate new hire productivity, ensure playbook adherence, provide data-driven coaching insights, improve CRM data quality.

### 3.3. User Personas (Examples)

*   **Alex Chen, Account Executive (AE):**
    *   *Background:* 3 years in B2B SaaS sales, tech-savvy, quota-driven.
    *   *Goals:* Exceed quota, reduce call anxiety, master complex product details, spend less time on admin.
    *   *Frustrations:* Forgetting key counter-objections, fumbling for data mid-call, tedious CRM logging.
    *   *How Closezly helps Alex:* Provides instant on-screen answers, objection handling tips, auto-fills CRM notes.

*   **Sarah Miller, VP of Sales:**
    *   *Background:* 15 years in sales leadership, manages a team of 20 AEs.
    *   *Goals:* Increase team win rates, shorten sales cycles, improve forecast accuracy, reduce new rep ramp time.
    *   *Frustrations:* Inconsistent performance across reps, high cost of training, difficulty scaling best practices.
    *   *How Closezly helps Sarah's Team:* Standardizes playbook access, provides real-time coaching, offers team performance insights (future), ensures better CRM data.

## 4. User Stories

### 4.1. Onboarding & Setup
*   As a new user, I want to easily download and install Closezly on my macOS/Windows desktop so I can start using it quickly.
*   As a user, I want a simple onboarding process that explains how to grant necessary permissions (mic, screen) and connect my primary CRM.
*   As a user, I want to upload my sales playbooks, product FAQs, and other relevant documents so Closezly can use them for guidance.
*   As an admin, I want to be able to upload and manage a central repository of knowledge documents for my entire team.

### 4.2. Live Call Assistance
*   As an AE, I want Closezly to silently listen to my sales call (my audio and the prospect's audio) and analyze what's being said in real-time.
*   As an AE, I want Closezly to monitor my active screen (e.g., CRM page, presentation slides) to understand the visual context of my call.
*   As an AE, when a prospect raises an objection, I want Closezly to instantly show me relevant rebuttals or information from my playbooks in a discreet overlay.
*   As an AE, if a prospect asks a technical question, I want Closezly to provide the answer from my product documentation or pre-loaded knowledge.
*   As an AE, I want to be able to quickly ask Closezly a question via a hotkey and get an immediate answer based on call context and my knowledge base.
*   As an AE, I want the Closezly overlay to be easily movable and resizable so it doesn't obstruct important screen elements.
*   As an AE, I want to be confident that Closezly's overlay is not visible to other meeting participants during screen sharing.

### 4.3. Knowledge Management (RAG)
*   As an AE, when I have a PDF of our new pricing sheet open, I want Closezly to be able to pull specific pricing details if asked during a call.
*   As an AE, I want Closezly to prioritize answers from my uploaded custom knowledge base over general knowledge.
*   As an admin, I want to see which knowledge documents are most frequently accessed by Closezly to identify high-value content.

### 4.4. CRM Integration
*   As an AE, before a call, I want Closezly to automatically pull relevant prospect information (e.g., past interactions, company details) from my connected CRM.
*   As an AE, I want Closezly to use information from my CRM to provide more personalized and contextual suggestions during a call.
*   As an AE, after a call, I want Closezly to automatically generate a concise call summary and log it into the appropriate CRM record.
*   As an AE, I want Closezly to help me update key fields in my CRM based on the call's outcome (e.g., next steps, deal stage).

### 4.5. Post-Call Analysis & Improvement
*   As an AE, after a call, I want to review a transcript of the conversation along with key highlights identified by Closezly.
*   As an AE, I want Closezly to provide me with feedback on my call performance, such as talk/listen ratio, clarity, and areas for improvement.
*   As an AE, I want Closezly to help me draft follow-up emails based on the call discussion and identified action items.

### 4.6. Core Application
*   As a user, I want to easily toggle the Closezly overlay visibility with a global hotkey.
*   As a user, I want to manage my Closezly account and subscription through a web portal.
*   As a user, I want to be assured that my call data and screen information are handled securely and privately.

## 5. Product Features (MVP/V1)

### 5.1. Core Desktop Application
*   **5.1.1. Electron-Based Client:**
    *   Cross-platform support (macOS initial focus, Windows to follow).
    *   Installation via downloadable package.
    *   Auto-update mechanism.
*   **5.1.2. Undetectable Overlay UI:**
    *   Transparent, frameless, always-on-top window.
    *   Resizable and movable by the user via hotkeys.
    *   Content dynamically adjusts window size.
    *   Invisible during screen sharing.
*   **5.1.3. Global Hotkey System:**
    *   Toggle overlay visibility.
    *   Trigger manual AI query.
    *   Start/Stop audio capture (if manual control is desired).
    *   Move overlay window.
*   **5.1.4. Secure Authentication & User Management:**
    *   Login/Signup via web portal, token-based auth for desktop app.
    *   Subscription tier management.
*   **5.1.5. Settings Configuration:**
    *   Microphone selection.
    *   CRM connection management.
    *   Hotkey customization (Stretch Goal).
    *   Knowledge base management (uploading/linking documents).

### 5.2. Real-Time Call Assistance
*   **5.2.1. Live Audio Ingestion & Transcription:**
    *   Capture user's microphone audio.
    *   Capture system audio (other participants in meeting apps like Zoom, Meet, Teams).
    *   Real-time transcription of the conversation (both parties).
*   **5.2.2. Screen Context Understanding (Multimodal LLM):**
    *   Capture active window/full screen screenshots.
    *   Send screenshot data directly to a vision-enabled LLM (e.g., Gemini 1.5 Pro, GPT-4V) for text extraction and contextual understanding.
    *   No separate client-side OCR library.
*   **5.2.3. AI-Powered Suggestion Engine:**
    *   LLM analyzes combined audio transcript, screen context, and RAG results.
    *   Provides real-time suggestions for:
        *   Objection handling.
        *   Relevant product information/features.
        *   Key talking points from playbooks.
        *   Questions to ask the prospect.
    *   Suggestions displayed in the overlay.
*   **5.2.4. Manual AI Query:**
    *   User can type a question into the overlay (or trigger via hotkey) for an immediate AI response based on current context.

### 5.3. Knowledge Management (Retrieval Augmented Generation - RAG)
*   **5.3.1. Document Ingestion:**
    *   Users can upload documents (PDF, DOCX, TXT initially) to their Closezly knowledge base via the web portal or desktop app.
    *   Documents are processed, chunked, embedded, and stored in a vector database.
*   **5.3.2. Contextual Retrieval:**
    *   During AI processing, relevant chunks from the user's knowledge base are retrieved based on call context.
    *   Retrieved information is used to augment prompts to the LLM, ensuring domain-specific and accurate answers.

### 5.4. CRM Integration (V1 Focus: Salesforce & HubSpot)
*   **5.4.1. CRM Data Read:**
    *   Securely connect to user's Salesforce or HubSpot instance.
    *   Fetch relevant prospect/account/opportunity data based on active call context (e.g., participant email, open CRM record).
    *   Display key CRM insights within the Closezly overlay or use for AI prompt augmentation.
*   **5.4.2. CRM Data Write (Post-Call):**
    *   Log call activity (participants, duration).
    *   Save AI-generated call summaries to the relevant CRM record.
    *   Suggest updates for key CRM fields (e.g., next steps, deal stage) based on call outcomes.

### 5.5. Post-Call Analytics & Summaries
*   **5.5.1. Call Transcription & Recording (Storage):**
    *   Store full call transcripts securely.
    *   (Optional for V1: Store audio recordings if user consents and compliance allows).
*   **5.5.2. AI-Generated Call Summaries:**
    *   LLM generates concise summaries highlighting key discussion points, decisions, and action items.
*   **5.5.3. Basic Call Metrics:**
    *   Talk/listen ratio.
    *   (Stretch Goal for V1: Sentiment analysis overview).
*   **5.5.4. Draft Follow-Up Emails:**
    *   AI assists in drafting follow-up emails based on the call summary and action items.

## 6. Design & UX Principles

*   **Undetectable & Discreet:** The overlay must be invisible during screen sharing and operate silently without distracting the user or other meeting participants.
*   **Minimalist & Contextual:** The UI should be clean, uncluttered, and only display highly relevant information when needed. Avoid information overload.
*   **Efficient & Low Cognitive Load:** Interactions should be quick, primarily hotkey-driven, allowing the salesperson to focus on the conversation.
*   **Trustworthy & Secure:** Users must trust Closezly with sensitive call and screen data. Emphasize privacy and robust security measures.
*   **Actionable & Empowering:** Suggestions and insights should be practical, easy to implement, and make the salesperson feel more capable.
*   **Adaptive (Future Goal):** The AI should eventually learn the user's style and preferences to provide more personalized guidance.

## 7. Technical Considerations (High-Level)

*   **Desktop App:** Electron, React (TypeScript, Vite), Tailwind CSS.
*   **Backend Services:** Node.js (TypeScript), deployed via serverless functions (e.g., Vercel, AWS Lambda) or containers.
*   **AI Models:** Vision-enabled multimodal LLMs (e.g., Google Gemini 1.5 Pro, GPT-4V). Cloud-based real-time transcription service.
*   **Database:** Managed PostgreSQL (e.g., Supabase, Neon, AWS RDS) for user data, metadata, and `pgvector` for RAG.
*   **Authentication:** Managed identity provider (e.g., Supabase Auth, Auth0, Clerk).
*   **Security & Privacy:** End-to-end encryption for sensitive data where possible, secure API key management, compliance with data privacy regulations (GDPR, CCPA). Permissions for screen/audio capture must be explicit and transparent.
*   **Scalability & Reliability:** Leverage managed cloud services for AI, database, and hosting to ensure scalability and uptime.

## 8. Success Metrics & KPIs (Key Performance Indicators)

### 8.1. Product Engagement
*   Daily Active Users (DAU) / Monthly Active Users (MAU).
*   Average session duration (time overlay is active during calls).
*   Feature adoption rate (e.g., % of users connecting CRM, uploading documents).
*   Number of AI suggestions utilized per call.
*   Task completion rate (e.g., successful CRM logging via Closezly).

### 8.2. User Satisfaction
*   Net Promoter Score (NPS).
*   Customer Satisfaction Score (CSAT).
*   User retention rate / Churn rate.
*   Qualitative feedback from user interviews and support channels.

### 8.3. Business & Sales Impact
*   Free-to-Paid conversion rate.
*   Customer Lifetime Value (LTV).
*   (Aspirational, through user surveys/testimonials): Reported impact on user's close rates, deal size, sales cycle length.

## 9. Future Considerations (Post-MVP/V1)

*   **AI Sales Agent Mode:** Autonomous capabilities for handling parts of sales calls.
*   **Advanced Team Analytics & Dashboards:** Aggregated performance insights for sales managers.
*   **Deeper Integrations:** More CRMs, sales engagement platforms (Outreach, Salesloft), calendar tools, Google Docs/Confluence direct sync.
*   **Proactive Suggestions:** AI anticipates needs without explicit user triggers.
*   **Voice Commands:** Interact with Closezly using voice.
*   **A/B Testing Framework:** For optimizing suggestions and UI elements.
*   **Mobile Companion App:** For reviewing call summaries and analytics on the go.
*   **Multi-language Support.**

## 10. Out of Scope (for MVP/V1)

*   Full AI Sales Agent mode.
*   Advanced team features (e.g., shared playbooks with granular permissions, team dashboards).
*   Mobile application (desktop only for V1).
*   Integrations beyond core targets (Zoom, Meet, Teams, Salesforce, HubSpot).
*   Voice command interaction.
*   Extensive hotkey customization (use sensible defaults).
*   Offline functionality (requires an active internet connection for AI services).

## 11. Open Questions & Assumptions

### 11.1. Open Questions
*   Which specific multimodal LLM (Gemini vs. GPT-4V vs. Claude 3) will offer the best balance of screen understanding accuracy, sales guidance quality, latency, and cost for our specific use cases? (Requires prototyping).
*   What is the optimal pricing for each subscription tier?
*   Which real-time transcription service provides the best accuracy-to-cost ratio for sales conversations?
*   What are the specific API limitations (e.g., image size/resolution, rate limits) for the chosen multimodal LLM, and how will we engineer around them?
*   How will users manage large volumes of documents for the RAG system effectively?

### 11.2. Assumptions
*   Users will be comfortable granting necessary screen and audio permissions for the app to function.
*   The quality and relevance of AI-generated suggestions will be high enough to provide tangible value to salespeople.
*   The "undetectable" nature of the overlay can be reliably maintained across target OS updates.
*   A sufficient number of target users are willing to pay for a premium AI sales co-pilot.
*   Integration with core CRMs (Salesforce, HubSpot) will cover a significant portion of the initial target market.
*   Multimodal LLMs can effectively replace the need for a separate client-side OCR library without significantly compromising performance or accuracy for our use case.

---

This PRD should provide a solid foundation for the development of Closezly. It will evolve as we learn more during the development and testing phases.
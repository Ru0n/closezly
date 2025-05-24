# Closezly

Closezly is an AI-powered sales co-pilot designed to empower high-ticket B2B sales professionals. It provides real-time, on-call guidance, seamless CRM integration, custom knowledge retrieval, and actionable post-call analytics.

## Project Status

The project is currently in development with the following components implemented:

- ✅ **Supabase Local Development**: Database setup with pgvector extension for RAG functionality
- ✅ **Database Schema**: Tables for users, profiles, call transcripts, summaries, and document chunks
- ✅ **Desktop App (Electron)**: Basic structure with main process, renderer process, and IPC communication
- 🔄 **Backend Services**: Initial structure set up
- 🔄 **Web Portal**: Initial structure set up

## Project Structure

This is a monorepo with the following structure:

- `apps/desktop`: Electron desktop application
- `apps/web-portal`: Next.js web portal
- `packages/backend-services`: Express backend services
- `packages/utils`: Shared utilities
- `documentation`: Technical architecture and product requirements
- `supabase`: Supabase configuration and migrations

## Prerequisites

- Node.js (v18+)
- npm (v9+)
- PostgreSQL (v15)
- Supabase CLI

## Setup Instructions

### 1. Install Dependencies

```bash
# Install all dependencies
npm install

# Install desktop app dependencies
cd apps/desktop
npm install
```

### 2. Set Up Supabase Local Development

```bash
# Start Supabase local development
npx supabase start

# If you need to reset the database
npx supabase db reset
```

### 3. Set Up Environment Variables

Create `.env` files in the following locations:

**apps/web-portal/.env**
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

**packages/backend-services/.env**
```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
PORT=4000
```

## Running the Applications

### Desktop App (Electron)

The desktop app has been set up with TypeScript, React, and Electron. It includes:

- Main process with AppState, WindowHelper, ShortcutsHelper, and ScreenshotHelper
- Renderer process with React components
- IPC communication between main and renderer processes

To run the desktop app:

```bash
cd apps/desktop

# For development with hot reloading
npm run electron:dev

# OR for a simple start without hot reloading
npm run start
```

#### Desktop App Features

- **Window Management**: Create, show/hide, position, and resize the overlay window
- **Global Shortcuts**:
  - `Alt+Space`: Toggle overlay visibility
  - `Alt+Q`: Trigger AI query (takes a screenshot)
  - `Alt+R`: Toggle call recording
  - `Alt+Arrow keys`: Move the overlay window
- **Screenshot Capture**: Capture the screen for AI analysis
- **State Management**: Track application state including authentication, call status, and suggestions

### Web Portal (Next.js)

```bash
cd apps/web-portal
npm run dev
```

### Backend Services (Express)

```bash
cd packages/backend-services
npm run dev
```

## Supabase Resources

- Supabase Studio: http://127.0.0.1:54323
- Supabase API: http://127.0.0.1:54321
- Database: postgresql://postgres:postgres@127.0.0.1:54322/postgres

## Database Schema

The database includes the following tables:

- `users`: User accounts
- `user_profiles`: User profile information
- `call_transcripts`: Transcripts of sales calls
- `call_summaries`: AI-generated summaries of calls
- `document_chunks`: Vector embeddings for RAG functionality (with pgvector)
- `documents`: Document metadata

## Development Workflow

1. Make changes to the codebase
2. Run linting: `npm run lint`
3. Format code: `npm run format:fix`
4. Test your changes
5. Commit and push

### Desktop App Development

When working on the desktop app:

1. Make changes to TypeScript files
2. Compile TypeScript: `npm run build:electron`
3. Run the app: `npm run start`

For continuous development:
- Use `npm run electron:dev` which watches for changes and recompiles automatically

### Building the Desktop App

To build the desktop app for distribution:

```bash
cd apps/desktop
npm run package  # Creates a package in the out/ directory
npm run make     # Creates installers for the current platform
```

## Troubleshooting

### Common Issues

1. **TypeScript Compilation Errors**: Make sure to run `npm run build:electron` before starting the app
2. **Electron Not Starting**: Ensure the Vite server is running before starting Electron
3. **Missing Dependencies**: Run `npm install` in both the root directory and the app directories

## Next Steps

- [ ] Implement image optimization in the desktop app
- [ ] Connect desktop app to backend services
- [ ] Implement authentication flow
- [ ] Develop the web portal UI
- [ ] Set up CRM integrations

## Additional Resources

For more detailed information, refer to the documentation in the `documentation/` directory:

- `TECHNICAL_ARCHITECTURE_AND_DESIGN.md`: Technical architecture details
- `prd.md`: Product Requirements Document

## License

Proprietary - All rights reserved

# Closezly Project Startup Guide

This guide provides the correct startup sequence and commands for running the Closezly project locally.

## Prerequisites

Before starting, ensure you have:
- ✅ Node.js (v18+) installed
- ✅ npm (v9+) installed
- ✅ Supabase CLI installed
- ✅ All dependencies installed (`npm install` in root directory)

## Quick Start (All Services)

To start all services in the correct order, open **4 separate terminal windows** and run:

### Terminal 1: Supabase (Database)
```bash
cd /path/to/closezly
npx supabase start
```
**Expected output:** Supabase services running on ports 54321 (API), 54322 (DB), 54323 (Studio)

### Terminal 2: Backend Services
```bash
cd /path/to/closezly/packages/backend-services
npm run dev
```
**Expected output:** "Closezly Backend API running on port 4000"

### Terminal 3: Web Portal
```bash
cd /path/to/closezly/apps/web-portal
npm run dev
```
**Expected output:** "Ready in X.Xs" and "Local: http://localhost:3000"

### Terminal 4: Desktop App
```bash
cd /path/to/closezly/apps/desktop
npm run start
```
**Expected output:** "Closezly Electron Main Process started" with shortcuts registered

## Detailed Startup Instructions

### 1. Start Supabase Local Development

Supabase must be started first as other services depend on it.

```bash
# Check if Supabase is already running
npx supabase status

# Start Supabase if not running
npx supabase start

# Reset database if needed
npx supabase db reset
```

**Verify Supabase is running:**
- API URL: http://127.0.0.1:54321
- Studio URL: http://127.0.0.1:54323
- Database: postgresql://postgres:postgres@127.0.0.1:54322/postgres

### 2. Start Backend Services

The Express backend provides API endpoints and connects to Supabase.

```bash
cd packages/backend-services
npm run dev
```

**Verify backend is running:**
```bash
# Test health endpoint
curl http://localhost:4000/health
# Expected: {"status":"ok","env":"development"}

# Test Supabase connection
curl http://localhost:4000/supabase-status
# Expected: {"status":"ok","userSample":[...]}
```

### 3. Start Web Portal

The Next.js web portal provides the user interface.

```bash
cd apps/web-portal
npm run dev
```

**Verify web portal is running:**
- Open http://localhost:3000 in your browser
- Should see the Closezly landing page

### 4. Start Desktop App

The Electron desktop app provides the overlay interface.

```bash
cd apps/desktop
npm run start
```

**Verify desktop app is running:**
- Electron window should appear
- Global shortcuts should be registered (Alt+H, Alt+Q, Alt+R, etc.)

## Service URLs and Ports

| Service | URL | Port | Purpose |
|---------|-----|------|---------|
| Supabase API | http://127.0.0.1:54321 | 54321 | Database API |
| Supabase Studio | http://127.0.0.1:54323 | 54323 | Database Admin |
| Supabase DB | postgresql://postgres:postgres@127.0.0.1:54322/postgres | 54322 | PostgreSQL Database |
| Backend Services | http://localhost:4000 | 4000 | Express API |
| Web Portal | http://localhost:3000 | 3000 | Next.js Frontend |
| Desktop App | N/A | N/A | Electron Overlay |

## Troubleshooting

### Common Issues and Solutions

#### 1. "Cannot find module '@next/bundle-analyzer'"
**Solution:** Install the missing dependency
```bash
cd apps/web-portal
npm install @next/bundle-analyzer --save-dev
```

#### 2. "column users.user_id does not exist"
**Solution:** This was fixed in the backend code. The column is named `id`, not `user_id`.

#### 3. TypeScript compilation errors in desktop app
**Solution:** Use `npm run start` instead of `npm run electron:dev` for production mode.

#### 4. Supabase not starting
**Solution:** 
```bash
npx supabase stop
npx supabase start
```

#### 5. Port already in use
**Solution:** Kill existing processes
```bash
# Find process using port
lsof -i :3000  # or :4000, :54321, etc.
# Kill process
kill -9 <PID>
```

### Environment Variables

Ensure all `.env` files are properly configured:

**apps/web-portal/.env:**
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**packages/backend-services/.env:**
```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=4000
GEMINI_API_KEY=your_gemini_api_key_here
```

**apps/desktop/.env:**
```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
BACKEND_URL=http://localhost:4000
WEB_PORTAL_URL=http://localhost:3000
ELECTRON_STORE_ENCRYPTION_KEY=closezly-secure-key
```

## Development Workflow

### Making Changes

1. **Web Portal Changes:** Hot reload is enabled, changes appear automatically
2. **Backend Changes:** Server restarts automatically with `npm run dev`
3. **Desktop App Changes:** Restart the app with `npm run start`

### Testing the Full Stack

1. Start all services as described above
2. Open web portal at http://localhost:3000
3. Test authentication flow
4. Test desktop app integration
5. Verify backend API endpoints

## Alternative Startup Commands

### Web Portal
```bash
npm run dev          # Development with hot reload
npm run dev:fast     # Development with Turbo mode
npm run build        # Build for production
npm run start        # Start production build
```

### Backend Services
```bash
npm run dev          # Development with auto-restart
npm run build        # Compile TypeScript
npm run start        # Start production build
```

### Desktop App
```bash
npm run electron:dev # Development with hot reload (may have TS errors)
npm run start        # Production mode (recommended)
npm run build        # Build for distribution
```

## Success Indicators

When everything is running correctly, you should see:

✅ **Supabase:** "supabase local development setup is running"
✅ **Backend:** "Closezly Backend API running on port 4000"
✅ **Web Portal:** "Ready in X.Xs" and accessible at localhost:3000
✅ **Desktop App:** "Closezly Electron Main Process started" with shortcuts registered

## Next Steps

After successful startup:
1. Visit http://localhost:3000 to access the web portal
2. Test user registration and login
3. Test desktop app authentication flow
4. Explore the dashboard and features

For more detailed information, refer to the main README.md file.

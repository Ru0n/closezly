# Fix Google OAuth Redirect Issue

## 🎯 Problem Identified
The user is being created successfully in the database, but the OAuth redirect flow is incorrect.

**Current Issue:**
- Google is redirecting to: `http://localhost:3000/?code=...`
- Should redirect to: `http://127.0.0.1:54321/auth/v1/callback?code=...`

## 🔧 Root Cause
The Google OAuth app redirect URI is configured incorrectly.

## ✅ Correct OAuth Flow
1. User clicks "Sign in with Google"
2. Redirects to Google OAuth consent screen
3. **Google redirects to Supabase:** `http://127.0.0.1:54321/auth/v1/callback?code=...`
4. **Supabase processes OAuth and redirects to our app:** `http://localhost:3000/auth/callback`
5. Our app's callback handler redirects to dashboard

## 🛠️ Fix Required

### Step 1: Update Google OAuth App Configuration
1. **Go to:** [Google Cloud Console](https://console.cloud.google.com/)
2. **Navigate to:** APIs & Services > Credentials
3. **Find your OAuth 2.0 Client ID** (the one you're using)
4. **Click Edit**
5. **Update Authorized redirect URIs:**
   - **Remove:** `http://localhost:3000/auth/callback` (if present)
   - **Add:** `http://127.0.0.1:54321/auth/v1/callback`
6. **Save changes**

### Step 2: Verify Supabase Configuration
The Supabase config should already be correct:
```toml
[auth.external.google]
enabled = true
client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"
redirect_uri = ""  # This should be empty for local development
```

### Step 3: Verify App Callback Configuration
The app's social login component should be correct:
```typescript
redirectTo: `${window.location.origin}/auth/callback`
// This becomes: http://localhost:3000/auth/callback
```

## 🧪 Test After Fix
1. **Update Google OAuth app redirect URI**
2. **Test the flow:**
   - Go to: http://localhost:3000/login
   - Click "Sign in with Google"
   - Should redirect to Google, then back to dashboard
   - Check browser network tab for correct redirect flow

## 🔍 Expected Network Flow
1. `GET http://localhost:3000/login`
2. `GET https://accounts.google.com/oauth/authorize?...`
3. `GET http://127.0.0.1:54321/auth/v1/callback?code=...`
4. `GET http://localhost:3000/auth/callback`
5. `GET http://localhost:3000/dashboard`

## ⚠️ Important Notes
- The redirect URI in Google OAuth app MUST be exactly: `http://127.0.0.1:54321/auth/v1/callback`
- Do NOT use `localhost` - use `127.0.0.1`
- Do NOT include any path after `/auth/v1/callback`
- The port MUST be `54321` (Supabase local API port)

# OAuth Provider Setup for Closezly

This document outlines the OAuth providers configured for Closezly and the required environment variables.

## Configured Providers

The following OAuth providers are enabled for both login and signup, specifically chosen for B2B sales professionals:

1. **Google** - Primary choice for business users
2. **Microsoft Azure** - Enterprise environments
3. **LinkedIn** - Sales professional relevance

## Implementation Status

✅ **Completed:**
- Social login UI components (`SocialLoginSection`, `SocialLoginButton`)
- Social icons (Google, Microsoft, LinkedIn)
- OAuth providers configured in Supabase
- Auth callback route handler
- Session management middleware
- Database triggers for user profile creation
- Server-side and client-side Supabase clients

## Required Environment Variables

Add these environment variables to your `.env.local` file for local development:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google OAuth
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your_google_client_id
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your_google_client_secret

# Microsoft Azure OAuth
SUPABASE_AUTH_EXTERNAL_AZURE_CLIENT_ID=your_azure_client_id
SUPABASE_AUTH_EXTERNAL_AZURE_SECRET=your_azure_client_secret

# LinkedIn OAuth
SUPABASE_AUTH_EXTERNAL_LINKEDIN_CLIENT_ID=your_linkedin_client_id
SUPABASE_AUTH_EXTERNAL_LINKEDIN_SECRET=your_linkedin_client_secret
```

## OAuth Provider Configuration

### 1. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Configure the OAuth consent screen if prompted
6. Select **Web application** as application type
7. Add authorized redirect URIs:
   - For local development: `http://127.0.0.1:54321/auth/v1/callback`
   - For production: `https://your-project-ref.supabase.co/auth/v1/callback`
8. Copy the **Client ID** and **Client Secret**

### 2. Microsoft Azure OAuth Setup

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Configure:
   - Name: "Closezly Web Portal"
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: `https://your-project-ref.supabase.co/auth/v1/callback`
5. After creation, go to **Certificates & secrets**
6. Create a new client secret
7. Copy the **Application (client) ID** and **Client Secret**

### 3. LinkedIn OAuth Setup

1. Go to [LinkedIn Developer Portal](https://developer.linkedin.com/)
2. Click **Create app**
3. Fill in app details:
   - App name: "Closezly"
   - LinkedIn Page: Your company page (or create one)
   - App logo: Upload your logo
4. In **Auth** tab, add redirect URLs:
   - `https://your-project-ref.supabase.co/auth/v1/callback`
5. Request access to **Sign In with LinkedIn using OpenID Connect**
6. Copy the **Client ID** and **Client Secret**

## Testing the Implementation

1. **Start your local development server:**
   ```bash
   cd apps/web-portal
   npm run dev
   ```

2. **Navigate to the login page:**
   - Go to `http://localhost:3000/login`
   - You should see social login buttons for Google, Microsoft, and LinkedIn

3. **Test OAuth flow:**
   - Click on any social login button
   - You should be redirected to the provider's login page
   - After successful authentication, you should be redirected back to `/dashboard`

## Troubleshooting

### Common Issues:

1. **"Invalid redirect URI" error:**
   - Ensure the redirect URI in your OAuth app matches exactly: `https://your-project-ref.supabase.co/auth/v1/callback`
   - For local development, use: `http://127.0.0.1:54321/auth/v1/callback`

2. **"OAuth provider not configured" error:**
   - Check that environment variables are set correctly
   - Verify the provider is enabled in `supabase/config.toml`

3. **User profile not created:**
   - Check that the database trigger is properly installed
   - Run the migration: `supabase db push`

4. **Session not persisting:**
   - Ensure middleware is properly configured
   - Check that cookies are being set correctly

## Architecture Overview

The OAuth implementation follows this flow:

1. **User clicks social login button** → `SocialLoginSection` component
2. **Supabase redirects to OAuth provider** → Google/Microsoft/LinkedIn
3. **Provider redirects back with code** → `/auth/callback` route handler
4. **Exchange code for session** → `supabase.auth.exchangeCodeForSession()`
5. **Database trigger creates user profile** → `handle_new_user()` function
6. **User redirected to dashboard** → Authenticated state

## Files Modified/Created

- ✅ `lib/supabase/client.ts` - Browser Supabase client
- ✅ `lib/supabase/server.ts` - Server Supabase client
- ✅ `app/auth/callback/route.ts` - OAuth callback handler
- ✅ `middleware.ts` - Session management
- ✅ `components/ui/social-login-section.tsx` - Updated to use new client
- ✅ `supabase/migrations/20250101_oauth_user_profile_trigger.sql` - Database trigger
- ✅ Updated login and signup pages to use new Supabase clients

## OAuth App Setup Instructions

### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:54321/auth/v1/callback` (local)
   - `https://your-project.supabase.co/auth/v1/callback` (production)

### Microsoft Azure Setup
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to Azure Active Directory > App registrations
3. Create new registration
4. Add redirect URIs in Authentication section
5. Generate client secret in Certificates & secrets

### LinkedIn Setup
1. Go to [LinkedIn Developer Portal](https://developer.linkedin.com/)
2. Create new app
3. Add OAuth 2.0 redirect URLs
4. Request access to Sign In with LinkedIn

## Redirect URLs

For local development:
```
http://localhost:54321/auth/v1/callback
```

For production (replace with your Supabase project URL):
```
https://your-project.supabase.co/auth/v1/callback
```

## Testing

After setup, test each provider:
1. Start the web portal: `npm run dev`
2. Navigate to login or signup page
3. Click each social login button
4. Verify successful authentication flow

## Troubleshooting

- Ensure redirect URLs match exactly in provider settings
- Check that all environment variables are set correctly
- Verify Supabase project settings match provider configurations
- Check browser console for any OAuth-related errors

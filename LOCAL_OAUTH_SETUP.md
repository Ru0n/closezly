# Local OAuth Setup for Closezly

This guide provides step-by-step instructions for setting up OAuth authentication with local Supabase development.

## Prerequisites

- Node.js (v18+)
- Supabase CLI installed
- Docker running (for local Supabase)

## Step 1: Start Local Supabase

```bash
# Stop any existing Supabase instance
npx supabase stop

# Start fresh local Supabase instance
npx supabase start
```

**Expected Output:**
```
Started supabase local development setup.

         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
  S3 Storage URL: http://127.0.0.1:54321/storage/v1/s3
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 2: Set Up OAuth Providers

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select project
3. Enable Google+ API (APIs & Services > Library)
4. Create OAuth 2.0 credentials (APIs & Services > Credentials)
   - Type: Web application
   - Name: "Closezly Local Development"
   - **Authorized redirect URIs:** `http://127.0.0.1:54321/auth/v1/callback`
5. Copy Client ID and Client Secret

### Microsoft Azure OAuth Setup

1. Go to [Azure Portal](https://portal.azure.com/)
2. Azure Active Directory > App registrations > New registration
3. Configure:
   - Name: "Closezly Local Development"
   - Account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - **Redirect URI:** `http://127.0.0.1:54321/auth/v1/callback`
4. Create client secret (Certificates & secrets)
5. Copy Application (client) ID and Client Secret

### LinkedIn OAuth Setup

1. Go to [LinkedIn Developer Portal](https://developer.linkedin.com/)
2. Create app with your company details
3. In Auth tab:
   - **Authorized redirect URLs:** `http://127.0.0.1:54321/auth/v1/callback`
4. Request "Sign In with LinkedIn using OpenID Connect" access
5. Copy Client ID and Client Secret

## Step 3: Configure Environment Variables

Update the following files with your OAuth credentials:

### `.env` (root directory)
```env
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your-google-client-id
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your-google-client-secret
SUPABASE_AUTH_EXTERNAL_AZURE_CLIENT_ID=your-azure-client-id
SUPABASE_AUTH_EXTERNAL_AZURE_SECRET=your-azure-client-secret
SUPABASE_AUTH_EXTERNAL_LINKEDIN_CLIENT_ID=your-linkedin-client-id
SUPABASE_AUTH_EXTERNAL_LINKEDIN_SECRET=your-linkedin-client-secret
```

### `apps/web-portal/.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# Same OAuth credentials as above
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your-google-client-id
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your-google-client-secret
SUPABASE_AUTH_EXTERNAL_AZURE_CLIENT_ID=your-azure-client-id
SUPABASE_AUTH_EXTERNAL_AZURE_SECRET=your-azure-client-secret
SUPABASE_AUTH_EXTERNAL_LINKEDIN_CLIENT_ID=your-linkedin-client-id
SUPABASE_AUTH_EXTERNAL_LINKEDIN_SECRET=your-linkedin-client-secret
```

## Step 4: Restart Supabase with OAuth Configuration

```bash
# Stop Supabase
npx supabase stop

# Start with environment variables loaded
npx supabase start
```

## Step 5: Test OAuth Implementation

1. **Start the web portal:**
   ```bash
   cd apps/web-portal
   npm run dev
   ```

2. **Open browser and navigate to:**
   - Login page: `http://localhost:3000/login`
   - Signup page: `http://localhost:3000/signup`

3. **Test OAuth flow:**
   - Click on Google/Microsoft/LinkedIn login buttons
   - Should redirect to provider's login page
   - After authentication, should redirect back to `/dashboard`

## Step 6: Verify in Supabase Studio

1. **Open Supabase Studio:** `http://127.0.0.1:54323`
2. **Go to Authentication > Users**
3. **Test OAuth login and verify user creation**

## Troubleshooting

### Common Issues:

1. **"Invalid redirect URI" error:**
   - Ensure redirect URI is exactly: `http://127.0.0.1:54321/auth/v1/callback`
   - Check OAuth app configuration

2. **Environment variables not loaded:**
   - Restart Supabase after updating `.env` files
   - Verify variables are set correctly

3. **OAuth provider not configured:**
   - Check that provider is enabled in `supabase/config.toml`
   - Verify environment variables match config.toml references

4. **CORS errors:**
   - Ensure `site_url` in config.toml matches your development URL
   - Check `additional_redirect_urls` configuration

### Debug Commands:

```bash
# Check Supabase status
npx supabase status

# View Supabase logs
npx supabase logs

# Reset database if needed
npx supabase db reset
```

## Next Steps

After successful OAuth setup:
1. Test user profile creation
2. Verify database triggers are working
3. Test session management
4. Implement logout functionality
5. Add error handling for OAuth failures

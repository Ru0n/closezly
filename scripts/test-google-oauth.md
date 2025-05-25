# Google OAuth Testing Guide

## ✅ Setup Complete

Your local Supabase environment is now configured for Google OAuth testing:

- **Database:** Reset and migrations applied ✅
- **Google OAuth:** Enabled with your credentials ✅
- **Microsoft/LinkedIn:** Temporarily disabled ✅
- **Supabase:** Running at http://127.0.0.1:54321 ✅
- **Studio:** Available at http://127.0.0.1:54323 ✅

## 🧪 Testing Steps

### Step 1: Verify Login Page
1. **Open:** http://localhost:3000/login
2. **Expected:** You should see only the Google login button (Microsoft and LinkedIn are hidden)
3. **Check:** No refresh token errors in browser console

### Step 2: Test Google OAuth Flow
1. **Click:** "Sign in with Google" button
2. **Expected:** Redirect to Google's OAuth consent screen
3. **Action:** Sign in with your Google account
4. **Expected:** Redirect back to http://localhost:3000/dashboard

### Step 3: Verify User Creation in Database
1. **Open Supabase Studio:** http://127.0.0.1:54323
2. **Navigate:** Authentication > Users
3. **Check:** Your Google account should appear as a new user
4. **Verify:** User has Google provider information

### Step 4: Check User Profile Creation
1. **In Studio:** Go to Table Editor > users table
2. **Verify:** Your user profile was created with:
   - Email from Google
   - Username (auto-generated or from Google)
   - Profile picture URL (if available from Google)

### Step 5: Test Session Management
1. **Refresh:** the dashboard page
2. **Expected:** Should remain logged in (no redirect to login)
3. **Check:** No console errors about refresh tokens

## 🔍 Troubleshooting

### If Google OAuth button doesn't work:
1. Check browser console for errors
2. Verify Google OAuth app redirect URI: `http://127.0.0.1:54321/auth/v1/callback`
3. Ensure Google OAuth app is enabled and credentials are correct

### If redirect fails:
1. Check that Supabase is running: `npx supabase status`
2. Verify environment variables are loaded
3. Check Supabase logs: `npx supabase logs`

### If user profile isn't created:
1. Check database triggers in Studio
2. Verify migrations were applied correctly
3. Look for errors in Supabase logs

## 📊 Expected Database Tables

After successful OAuth, you should see these tables populated:

### `auth.users` (Supabase Auth)
- User authentication data
- Google provider information
- Email, metadata

### `public.users` (Your App)
- User profile data
- Username, profile picture
- Created via database trigger

## 🎯 Success Criteria

✅ Google OAuth login works without errors
✅ User is redirected to dashboard after login
✅ User appears in Supabase Studio > Authentication > Users
✅ User profile is created in public.users table
✅ No refresh token errors in console
✅ Session persists across page refreshes

## 🚀 Next Steps After Successful Test

1. Re-enable Microsoft and LinkedIn OAuth
2. Test all three providers
3. Implement logout functionality
4. Add error handling for OAuth failures
5. Test user profile management features

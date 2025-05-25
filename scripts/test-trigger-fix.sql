-- Test script to verify the OAuth trigger fix
-- Run this in Supabase Studio SQL Editor

-- 1. Verify trigger functions exist
SELECT 
    proname as function_name,
    CASE 
        WHEN proname = 'handle_new_user' THEN 'OAuth trigger function'
        WHEN proname = 'create_user_profile' THEN 'User profile creation function'
        ELSE 'Other function'
    END as description
FROM pg_proc 
WHERE proname IN ('handle_new_user', 'create_user_profile');

-- 2. Verify triggers exist
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgenabled as enabled,
    CASE 
        WHEN tgname = 'on_auth_user_created' THEN 'OAuth trigger on auth.users'
        WHEN tgname = 'create_user_profile_trigger' THEN 'Profile creation trigger on public.users'
        ELSE 'Other trigger'
    END as description
FROM pg_trigger 
WHERE tgname IN ('on_auth_user_created', 'create_user_profile_trigger');

-- 3. Check table counts (should be empty)
SELECT 
    'auth.users' as table_name, 
    COUNT(*) as count 
FROM auth.users
UNION ALL
SELECT 
    'public.users' as table_name, 
    COUNT(*) as count 
FROM public.users
UNION ALL
SELECT 
    'public.user_profiles' as table_name, 
    COUNT(*) as count 
FROM public.user_profiles;

-- 4. Test the trigger flow manually (optional - for debugging only)
-- This simulates what happens during OAuth authentication
/*
-- Insert a test auth user (this should trigger the OAuth flow)
INSERT INTO auth.users (
    id, 
    email, 
    raw_user_meta_data,
    created_at,
    updated_at,
    email_confirmed_at,
    confirmation_token
) VALUES (
    gen_random_uuid(),
    'test-oauth@example.com',
    '{"full_name": "Test OAuth User", "name": "Test OAuth User"}'::jsonb,
    NOW(),
    NOW(),
    NOW(),
    ''
);

-- Check if the triggers worked
SELECT 'After test insert:' as status;
SELECT COUNT(*) as auth_users FROM auth.users;
SELECT COUNT(*) as public_users FROM public.users;
SELECT COUNT(*) as user_profiles FROM public.user_profiles;

-- Clean up test data
DELETE FROM auth.users WHERE email = 'test-oauth@example.com';
*/

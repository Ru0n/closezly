-- Debug script to test OAuth trigger function
-- Run this in Supabase Studio SQL Editor to test the trigger

-- 1. Check if the trigger function exists
SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 2. Check if the trigger exists
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgenabled as enabled,
    tgtype as trigger_type
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 3. Check current table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- 4. Check RLS policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE tablename IN ('users', 'user_profiles');

-- 5. Test the trigger function manually
-- First, let's see what's in auth.users (should be empty)
SELECT COUNT(*) as auth_users_count FROM auth.users;

-- Check what's in public.users (should be empty)
SELECT COUNT(*) as public_users_count FROM public.users;

-- 6. Test inserting a fake auth user to see if trigger works
-- (This simulates what happens during OAuth)
-- Note: This is just for testing - don't run this in production
/*
INSERT INTO auth.users (
    id, 
    email, 
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'test@example.com',
    '{"full_name": "Test User", "name": "Test User"}'::jsonb,
    NOW(),
    NOW()
);
*/

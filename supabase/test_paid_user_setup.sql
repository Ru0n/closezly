-- Create test paid user account for desktop app authentication testing
-- This script creates a paid user with all premium features enabled

-- First, let's create the user in Supabase Auth (this needs to be done via the API)
-- The user will be created with email: paid-user-test@example.com
-- Password: TestPaid123!

-- Insert the user into our users table (this will be done after auth user creation)
-- We'll use a specific UUID for consistency
INSERT INTO public.users (
    id, 
    email, 
    full_name, 
    username,
    company, 
    subscription_status,
    profile_picture_url,
    created_at,
    updated_at
) VALUES (
    '11111111-1111-1111-1111-111111111111'::uuid,
    'paid-user-test@example.com',
    'Premium Test User',
    'premium_tester',
    'Test Premium Corp',
    'paid',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    username = EXCLUDED.username,
    company = EXCLUDED.company,
    subscription_status = EXCLUDED.subscription_status,
    profile_picture_url = EXCLUDED.profile_picture_url,
    updated_at = NOW();

-- Create user profile
INSERT INTO public.user_profiles (
    user_id,
    job_title,
    profile_picture_url,
    preferences,
    settings,
    created_at,
    updated_at
) VALUES (
    '11111111-1111-1111-1111-111111111111'::uuid,
    'Senior Sales Manager',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    '{"theme": "dark", "notifications": true, "ai_suggestions": true}'::jsonb,
    '{"autoTranscribe": true, "saveRecordings": true, "aiSummaries": true, "customKnowledge": true}'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (user_id) DO UPDATE SET
    job_title = EXCLUDED.job_title,
    profile_picture_url = EXCLUDED.profile_picture_url,
    preferences = EXCLUDED.preferences,
    settings = EXCLUDED.settings,
    updated_at = NOW();

-- Get the Pro plan ID
DO $$
DECLARE
    pro_plan_id UUID;
BEGIN
    SELECT plan_id INTO pro_plan_id FROM public.plans WHERE name = 'Pro' LIMIT 1;
    
    -- Create active Pro subscription
    INSERT INTO public.subscriptions (
        user_id,
        plan_id,
        stripe_subscription_id,
        status,
        current_period_start,
        current_period_end,
        created_at,
        updated_at
    ) VALUES (
        '11111111-1111-1111-1111-111111111111'::uuid,
        pro_plan_id,
        'sub_test_premium_user_123',
        'active',
        NOW() - INTERVAL '15 days',
        NOW() + INTERVAL '15 days',
        NOW(),
        NOW()
    ) ON CONFLICT (stripe_subscription_id) DO UPDATE SET
        status = EXCLUDED.status,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = NOW();
END $$;

-- Add some sample call transcripts for the paid user to show premium features
INSERT INTO public.call_transcripts (
    transcript_id,
    user_id,
    call_start_time,
    call_end_time,
    full_transcript,
    transcript_segments,
    created_at
) VALUES (
    '22222222-2222-2222-2222-222222222222'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days' + INTERVAL '45 minutes',
    'This is a sample premium call transcript with advanced AI features enabled.',
    '[{"speaker": "User", "text": "Hello, this is a premium call", "timestamp": 0}, {"speaker": "Client", "text": "Great to hear about your premium features", "timestamp": 5}]'::jsonb,
    NOW() - INTERVAL '2 days'
) ON CONFLICT (transcript_id) DO NOTHING;

-- Add AI-generated call summary (premium feature)
INSERT INTO public.call_summaries (
    summary_id,
    transcript_id,
    summary_text,
    key_points,
    action_items,
    sentiment_overview,
    created_at
) VALUES (
    '33333333-3333-3333-3333-333333333333'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    'This premium call demonstrated advanced AI summarization capabilities with detailed insights and action items.',
    '["Premium AI features discussed", "Advanced analytics available", "Custom knowledge integration working"]'::jsonb,
    '["Follow up on premium features", "Schedule demo of advanced capabilities", "Provide pricing for enterprise"]'::jsonb,
    '{"overall": "positive", "confidence": 0.85, "key_emotions": ["enthusiasm", "interest"]}'::jsonb,
    NOW() - INTERVAL '2 days'
) ON CONFLICT (summary_id) DO NOTHING;

-- Verify the setup
SELECT 
    u.email,
    u.full_name,
    u.username,
    u.subscription_status,
    u.profile_picture_url,
    p.name as plan_name,
    s.status as subscription_status,
    s.current_period_end
FROM public.users u
LEFT JOIN public.subscriptions s ON u.id = s.user_id
LEFT JOIN public.plans p ON s.plan_id = p.plan_id
WHERE u.email = 'paid-user-test@example.com';

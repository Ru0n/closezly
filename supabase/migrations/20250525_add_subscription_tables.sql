-- Add subscription and billing tables for Closezly application
-- Based on the technical architecture document

-- Create plans table
CREATE TABLE IF NOT EXISTS public.plans (
    plan_id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- e.g., 'Free', 'Pro', 'Team'
    price_monthly DECIMAL(10,2) DEFAULT 0,
    price_annually DECIMAL(10,2) DEFAULT 0,
    feature_limits JSONB DEFAULT '{}'::JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.plans(plan_id) ON DELETE RESTRICT,
    stripe_subscription_id TEXT UNIQUE, -- For Stripe integration
    status TEXT NOT NULL DEFAULT 'active', -- active, canceled, past_due, trialing
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add subscription_status column to users table for quick access
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free';

-- Add profile_picture_url to users table if not exists (for paid user features)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Insert default plans
INSERT INTO public.plans (name, price_monthly, price_annually, feature_limits) VALUES
('Free', 0.00, 0.00, '{"max_calls": 10, "max_transcripts": 5, "ai_summaries": false, "custom_knowledge": false}'::jsonb),
('Pro', 29.99, 299.99, '{"max_calls": -1, "max_transcripts": -1, "ai_summaries": true, "custom_knowledge": true, "priority_support": true}'::jsonb),
('Team', 99.99, 999.99, '{"max_calls": -1, "max_transcripts": -1, "ai_summaries": true, "custom_knowledge": true, "priority_support": true, "team_features": true, "admin_dashboard": true}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for plans (public read access)
CREATE POLICY "Plans are publicly readable" ON public.plans
    FOR SELECT USING (true);

-- Create RLS policies for subscriptions (users can only see their own)
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON public.subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON public.subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to get user subscription status
CREATE OR REPLACE FUNCTION public.get_user_subscription_status(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    sub_status TEXT;
    plan_name TEXT;
BEGIN
    SELECT s.status, p.name
    INTO sub_status, plan_name
    FROM public.subscriptions s
    JOIN public.plans p ON s.plan_id = p.plan_id
    WHERE s.user_id = user_uuid
    AND s.status IN ('active', 'trialing')
    ORDER BY s.created_at DESC
    LIMIT 1;
    
    IF sub_status IS NULL THEN
        RETURN 'free';
    ELSIF plan_name = 'Free' THEN
        RETURN 'free';
    ELSE
        RETURN 'paid';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update user subscription status
CREATE OR REPLACE FUNCTION public.update_user_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.users 
    SET subscription_status = public.get_user_subscription_status(NEW.user_id)
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update user subscription status
DROP TRIGGER IF EXISTS update_user_subscription_status_trigger ON public.subscriptions;
CREATE TRIGGER update_user_subscription_status_trigger
    AFTER INSERT OR UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_subscription_status();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS users_subscription_status_idx ON public.users(subscription_status);

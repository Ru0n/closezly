-- Update the user profile creation trigger to handle OAuth user data
-- This trigger will create a user profile when a new user is created via OAuth

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS create_user_profile_trigger ON public.users;
DROP FUNCTION IF EXISTS public.create_user_profile();

-- Create improved function to handle OAuth user data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert into users table with OAuth data
  -- The user_profiles will be created automatically by the create_user_profile trigger
  INSERT INTO public.users (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(
      EXCLUDED.full_name,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'display_name',
      users.full_name
    ),
    updated_at = NOW();

  -- Note: user_profiles will be created by the create_user_profile trigger
  -- No need to insert here to avoid conflicts

  RETURN NEW;
END;
$$;

-- Create trigger to call the function after a new user is created in auth.users
-- Only create if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.users TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;

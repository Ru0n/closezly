-- Add username column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Add profile_picture_url column to user_profiles table
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Create a trigger to ensure username is not null for new users
CREATE OR REPLACE FUNCTION public.set_default_username()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.username IS NULL THEN
    -- Generate a default username based on email if not provided
    NEW.username := split_part(NEW.email, '@', 1) || '_' || substr(md5(random()::text), 1, 6);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set default username before insert
DROP TRIGGER IF EXISTS set_default_username_trigger ON public.users;
CREATE TRIGGER set_default_username_trigger
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.set_default_username();

-- Update RLS policies for the new columns
CREATE POLICY "Users can update their own username" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Create function to automatically create a user profile when a user is created
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to create user profile after user creation
DROP TRIGGER IF EXISTS create_user_profile_trigger ON public.users;
CREATE TRIGGER create_user_profile_trigger
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.create_user_profile();

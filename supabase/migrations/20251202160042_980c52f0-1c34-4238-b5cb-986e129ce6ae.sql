-- Create enum for subscription tiers
CREATE TYPE public.subscription_tier AS ENUM ('free', 'pro', 'enterprise');

-- Create enum for generation types
CREATE TYPE public.generation_type AS ENUM ('thumbnail', 'title', 'faceswap', 'edit');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier subscription_tier NOT NULL DEFAULT 'free',
  monthly_usage INTEGER NOT NULL DEFAULT 0,
  usage_limit INTEGER NOT NULL DEFAULT 10,
  usage_reset_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create generations table
CREATE TABLE public.generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generation_type generation_type NOT NULL DEFAULT 'thumbnail',
  prompt TEXT,
  image_url TEXT,
  title_suggestions JSONB,
  platform TEXT DEFAULT 'youtube',
  style TEXT DEFAULT 'professional',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Generations policies
CREATE POLICY "Users can view their own generations"
ON public.generations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own generations"
ON public.generations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generations"
ON public.generations FOR DELETE
USING (auth.uid() = user_id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update usage
CREATE OR REPLACE FUNCTION public.increment_usage(user_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET monthly_usage = monthly_usage + 1,
      updated_at = now()
  WHERE id = user_uuid;
END;
$$;

-- Function to check usage limit
CREATE OR REPLACE FUNCTION public.check_usage_limit(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_usage INTEGER;
  user_limit INTEGER;
BEGIN
  SELECT monthly_usage, usage_limit INTO current_usage, user_limit
  FROM public.profiles
  WHERE id = user_uuid;
  
  RETURN current_usage < user_limit;
END;
$$;
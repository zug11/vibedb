
-- Add credit and subscription columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ai_credits INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'none',
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

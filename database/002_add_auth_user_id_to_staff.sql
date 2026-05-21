-- Add auth_user_id column to staff_profiles to link with Supabase Auth users
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/exbkjyumgylzhxpomfnx/sql

ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

-- Create index for fast lookup by auth_user_id
CREATE INDEX IF NOT EXISTS idx_staff_profiles_auth_user_id
  ON public.staff_profiles(auth_user_id);

-- Track whether staff has set their password (false until first set)
ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS password_set BOOLEAN DEFAULT FALSE;

-- Create index for fast lookup by email (used for staff login matching)
CREATE INDEX IF NOT EXISTS idx_staff_profiles_email
  ON public.staff_profiles(email);

-- Add GLTCH native tracking to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_gltch_native boolean DEFAULT false,
ADD COLUMN bluesky_access_jwt text,
ADD COLUMN bluesky_refresh_jwt text;
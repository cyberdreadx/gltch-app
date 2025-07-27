-- Fix user_communities table to use TEXT for user_id (Bluesky DIDs are strings, not UUIDs)
ALTER TABLE public.user_communities 
ALTER COLUMN user_id TYPE TEXT;
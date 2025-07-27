-- Fix user_communities table to use TEXT for user_id (Bluesky DIDs are strings, not UUIDs)
-- First drop the policies that depend on user_id
DROP POLICY "Users can view their own community memberships" ON public.user_communities;
DROP POLICY "Users can join communities" ON public.user_communities;
DROP POLICY "Users can leave communities" ON public.user_communities;

-- Change the column type from UUID to TEXT
ALTER TABLE public.user_communities 
ALTER COLUMN user_id TYPE TEXT;

-- Recreate the policies with the new TEXT type
CREATE POLICY "Users can view their own community memberships" 
ON public.user_communities 
FOR SELECT 
USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can join communities" 
ON public.user_communities 
FOR INSERT 
WITH CHECK (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can leave communities" 
ON public.user_communities 
FOR DELETE 
USING (auth.uid()::TEXT = user_id);
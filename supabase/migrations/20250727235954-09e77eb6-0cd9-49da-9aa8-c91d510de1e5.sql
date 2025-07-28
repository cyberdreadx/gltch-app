-- Update user_communities table to use UUID for user_id and fix RLS policies
ALTER TABLE public.user_communities ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can join communities" ON public.user_communities;
DROP POLICY IF EXISTS "Users can leave communities" ON public.user_communities;
DROP POLICY IF EXISTS "Users can view their own community memberships" ON public.user_communities;

-- Create new RLS policies with correct UUID handling
CREATE POLICY "Users can join communities" 
ON public.user_communities 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave communities" 
ON public.user_communities 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own community memberships" 
ON public.user_communities 
FOR SELECT 
USING (auth.uid() = user_id);
-- Drop policies that reference user_id column
DROP POLICY IF EXISTS "Users can join communities" ON public.user_communities;
DROP POLICY IF EXISTS "Users can leave communities" ON public.user_communities;  
DROP POLICY IF EXISTS "Users can view their own community memberships" ON public.user_communities;
DROP POLICY IF EXISTS "Community members can manage hashtags" ON public.community_hashtags;

-- Update user_communities table to use UUID for user_id
ALTER TABLE public.user_communities ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- Recreate RLS policies with correct UUID handling
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

-- Recreate community hashtags policy
CREATE POLICY "Community members can manage hashtags" 
ON public.community_hashtags 
FOR ALL 
USING (EXISTS (
  SELECT 1 
  FROM user_communities uc 
  WHERE uc.community_id = community_hashtags.community_id 
  AND uc.user_id = auth.uid()
));
-- Create user_communities table to track community memberships
CREATE TABLE public.user_communities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, community_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_communities ENABLE ROW LEVEL SECURITY;

-- Create policies for user_communities
CREATE POLICY "Users can view their own community memberships" 
ON public.user_communities 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can join communities" 
ON public.user_communities 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave communities" 
ON public.user_communities 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to auto-join users to g/feed community
CREATE OR REPLACE FUNCTION public.auto_join_feed_community()
RETURNS TRIGGER AS $$
DECLARE
  feed_community_id UUID;
BEGIN
  -- Find the feed community
  SELECT id INTO feed_community_id 
  FROM public.communities 
  WHERE name = 'feed' 
  LIMIT 1;
  
  -- If feed community exists, auto-join the user
  IF feed_community_id IS NOT NULL THEN
    INSERT INTO public.user_communities (user_id, community_id)
    VALUES (NEW.id, feed_community_id)
    ON CONFLICT (user_id, community_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-join new users to feed community
CREATE TRIGGER auto_join_feed_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_join_feed_community();

-- Update community member_count when users join/leave
CREATE OR REPLACE FUNCTION public.update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.communities 
    SET member_count = member_count + 1 
    WHERE id = NEW.community_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.communities 
    SET member_count = member_count - 1 
    WHERE id = OLD.community_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for member count updates
CREATE TRIGGER update_member_count_on_join
  AFTER INSERT ON public.user_communities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_community_member_count();

CREATE TRIGGER update_member_count_on_leave
  AFTER DELETE ON public.user_communities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_community_member_count();
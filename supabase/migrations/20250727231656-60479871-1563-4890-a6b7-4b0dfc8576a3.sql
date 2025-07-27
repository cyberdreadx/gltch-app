-- Create table to track which Bluesky users are part of our app community
CREATE TABLE public.app_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bluesky_did TEXT NOT NULL UNIQUE,
  bluesky_handle TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_verified BOOLEAN DEFAULT false,
  custom_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "App users are viewable by everyone" 
ON public.app_users 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.app_users 
FOR UPDATE 
USING (bluesky_did = auth.uid()::TEXT);

CREATE POLICY "Users can insert their own profile" 
ON public.app_users 
FOR INSERT 
WITH CHECK (bluesky_did = auth.uid()::TEXT);

-- Create custom feed configuration table
CREATE TABLE public.custom_feeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  algorithm_type TEXT NOT NULL DEFAULT 'community_priority',
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for custom feeds
ALTER TABLE public.custom_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Custom feeds are viewable by everyone" 
ON public.custom_feeds 
FOR SELECT 
USING (true);

CREATE POLICY "Feed creators can update their feeds" 
ON public.custom_feeds 
FOR UPDATE 
USING (created_by = auth.uid()::TEXT);

CREATE POLICY "Authenticated users can create feeds" 
ON public.custom_feeds 
FOR INSERT 
WITH CHECK (created_by = auth.uid()::TEXT);

-- Create table to track custom hashtags and community identifiers
CREATE TABLE public.community_hashtags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE,
  hashtag TEXT NOT NULL,
  boost_factor DECIMAL DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_hashtags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Community hashtags are viewable by everyone" 
ON public.community_hashtags 
FOR SELECT 
USING (true);

CREATE POLICY "Community members can manage hashtags" 
ON public.community_hashtags 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_communities uc 
    WHERE uc.community_id = community_hashtags.community_id 
    AND uc.user_id = auth.uid()::TEXT
  )
);

-- Create table to track post engagement and custom scoring
CREATE TABLE public.post_engagement (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_uri TEXT NOT NULL UNIQUE,
  bluesky_likes INTEGER DEFAULT 0,
  gltch_upvotes INTEGER DEFAULT 0,
  gltch_downvotes INTEGER DEFAULT 0,
  community_score DECIMAL DEFAULT 0,
  trending_score DECIMAL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.post_engagement ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post engagement is viewable by everyone" 
ON public.post_engagement 
FOR SELECT 
USING (true);

CREATE POLICY "System can update engagement data" 
ON public.post_engagement 
FOR ALL 
USING (true);

-- Add trigger for updating timestamps
CREATE TRIGGER update_app_users_updated_at
BEFORE UPDATE ON public.app_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_feeds_updated_at
BEFORE UPDATE ON public.custom_feeds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default custom feeds
INSERT INTO public.custom_feeds (name, display_name, description, algorithm_type, settings) VALUES
('gltch-community', 'GLTCH Community', 'Posts from verified GLTCH app users', 'community_priority', '{"boost_verified": true, "boost_factor": 2.0}'),
('trending-gltch', 'Trending on GLTCH', 'Trending posts with custom GLTCH scoring', 'engagement_based', '{"min_engagement_score": 5, "time_decay_hours": 24}'),
('hashtag-feeds', 'Community Hashtags', 'Posts from community-specific hashtags', 'hashtag_based', '{"boost_community_tags": true}');

-- Create indexes for performance
CREATE INDEX idx_app_users_bluesky_did ON public.app_users(bluesky_did);
CREATE INDEX idx_app_users_handle ON public.app_users(bluesky_handle);
CREATE INDEX idx_post_engagement_uri ON public.post_engagement(post_uri);
CREATE INDEX idx_post_engagement_trending_score ON public.post_engagement(trending_score DESC);
CREATE INDEX idx_community_hashtags_hashtag ON public.community_hashtags(hashtag);
CREATE INDEX idx_community_hashtags_community ON public.community_hashtags(community_id);
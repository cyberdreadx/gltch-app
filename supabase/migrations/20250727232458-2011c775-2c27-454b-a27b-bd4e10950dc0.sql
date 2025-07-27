-- Create post_votes table for tracking user votes on posts
CREATE TABLE public.post_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  post_uri TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  bluesky_like_record TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_uri)
);

-- Enable Row Level Security
ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view all votes" 
ON public.post_votes 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own votes" 
ON public.post_votes 
FOR INSERT 
WITH CHECK (user_id = (auth.uid())::text);

CREATE POLICY "Users can update their own votes" 
ON public.post_votes 
FOR UPDATE 
USING (user_id = (auth.uid())::text);

CREATE POLICY "Users can delete their own votes" 
ON public.post_votes 
FOR DELETE 
USING (user_id = (auth.uid())::text);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_post_votes_updated_at
BEFORE UPDATE ON public.post_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable real-time updates for post votes
ALTER TABLE post_votes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE post_votes;
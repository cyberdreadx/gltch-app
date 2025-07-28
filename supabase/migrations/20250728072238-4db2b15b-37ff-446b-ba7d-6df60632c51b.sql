-- Create storage buckets for community images
INSERT INTO storage.buckets (id, name, public) VALUES ('community-banners', 'community-banners', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('community-icons', 'community-icons', true);

-- Create storage policies for community banners
CREATE POLICY "Community banners are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'community-banners');

CREATE POLICY "Authenticated users can upload community banners" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'community-banners' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update community banners" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'community-banners' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete community banners" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'community-banners' AND auth.uid() IS NOT NULL);

-- Create storage policies for community icons
CREATE POLICY "Community icons are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'community-icons');

CREATE POLICY "Authenticated users can upload community icons" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'community-icons' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update community icons" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'community-icons' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete community icons" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'community-icons' AND auth.uid() IS NOT NULL);
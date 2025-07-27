import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, MessageSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PostCard } from '@/components/PostCard';
import { supabase } from '@/integrations/supabase/client';
import { fetchTimeline, TransformedPost } from '@/lib/bluesky';

interface Community {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  banner_url: string | null;
  icon_url: string | null;
  member_count: number;
  post_count: number;
  created_at: string;
}

export function CommunityPage() {
  const { communityName } = useParams<{ communityName: string }>();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<TransformedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!communityName) return;

    const loadCommunityData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch community info
        const { data: communityData, error: communityError } = await supabase
          .from('communities')
          .select('*')
          .eq('name', communityName)
          .single();

        if (communityError) {
          throw communityError;
        }

        setCommunity(communityData);

        // For now, if it's the 'feed' community, fetch Bluesky posts
        if (communityName === 'feed') {
          const timelineData = await fetchTimeline(20);
          setPosts(timelineData.posts);
        } else {
          // For other communities, we'll set empty posts for now
          setPosts([]);
        }
      } catch (err) {
        console.error('Failed to load community:', err);
        setError('Failed to load community');
      } finally {
        setLoading(false);
      }
    };

    loadCommunityData();
  }, [communityName]);

  if (!communityName) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Community not found</p>
      </div>
    );
  }

  if (loading) {
    return (
    <div className="max-w-4xl mx-auto px-2 md:px-6">
        {/* Header skeleton */}
        <div className="bg-muted/50 h-48 animate-pulse"></div>
        <div className="p-4">
          <div className="h-8 bg-muted rounded w-1/3 mb-2 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-2/3 mb-4 animate-pulse"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="max-w-4xl mx-auto p-4 text-center">
        <p className="text-muted-foreground mb-4">{error || 'Community not found'}</p>
        <Link to="/">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Community Header */}
      <div className="relative">
        {/* Banner */}
        <div 
          className="h-48 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 relative overflow-hidden"
          style={{
            backgroundImage: community.banner_url ? `url(${community.banner_url})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="absolute inset-0 bg-black/20"></div>
          
          {/* Back button */}
          <div className="absolute top-4 left-4 z-10">
            <Link to="/">
              <Button variant="secondary" size="sm" className="backdrop-blur-sm bg-background/80">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
        </div>

        {/* Community Info */}
        <div className="relative px-2 md:px-6 pb-6">
          <div className="flex items-start space-x-4 -mt-8">
            {/* Community Icon */}
            <div className="w-16 h-16 bg-background border-4 border-background rounded-xl overflow-hidden flex-shrink-0 shadow-lg">
              {community.icon_url ? (
                <img 
                  src={community.icon_url} 
                  alt={community.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">
                    {community.display_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Community Details */}
            <div className="flex-1 pt-2">
              <h1 className="text-2xl font-bold text-foreground mb-1">
                {community.display_name}
              </h1>
              
              {community.description && (
                <p className="text-muted-foreground mb-3 leading-relaxed">
                  {community.description}
                </p>
              )}

              {/* Stats */}
              <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-4">
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>{community.member_count.toLocaleString()} members</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>{community.post_count.toLocaleString()} posts</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Join Community
                </Button>
                <Button variant="outline" size="sm">
                  Create Post
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Community Posts */}
      <div className="px-2 md:px-6 pb-6">
        <div className="border-t border-border pt-6">
          <h2 className="text-lg font-semibold mb-4">Latest Posts</h2>
          
          {posts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No posts yet in this community</p>
              <Button variant="outline" className="mt-4">
                Be the first to post!
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} {...post} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
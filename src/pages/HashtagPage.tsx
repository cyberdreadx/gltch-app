import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PostCard } from '@/components/PostCard';
import { fetchPostsByHashtag } from '@/lib/bluesky';
import { TransformedPost } from '@/lib/bluesky';

export function HashtagPage() {
  const { hashtag } = useParams<{ hashtag: string }>();
  const [posts, setPosts] = useState<TransformedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hashtag) return;

    const loadHashtagPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        const hashtagPosts = await fetchPostsByHashtag(hashtag);
        setPosts(hashtagPosts);
      } catch (err) {
        console.error('Failed to load hashtag posts:', err);
        setError('Failed to load posts for this hashtag');
      } finally {
        setLoading(false);
      }
    };

    loadHashtagPosts();
  }, [hashtag]);

  if (!hashtag) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Hashtag not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border p-4">
        <div className="flex items-center space-x-3">
          <Link to="/">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">#{hashtag}</h1>
            <p className="text-sm text-muted-foreground">
              {posts.length} {posts.length === 1 ? 'post' : 'posts'}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center p-8">
            <p className="text-muted-foreground">{error}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try again
            </Button>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="text-center p-8">
            <p className="text-muted-foreground">No posts found for #{hashtag}</p>
          </div>
        )}

        {!loading && !error && posts.length > 0 && (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} {...post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
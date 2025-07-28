import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, UserPlus, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PostCard } from '@/components/PostCard';
import { fetchUserPosts, fetchProfile, type TransformedPost, type ProfileData } from '@/lib/bluesky';
import { useAuth } from '@/hooks/useAuth';

export function UserProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const { session, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<TransformedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    if (!handle) return;

    const loadUserData = async () => {
      setIsLoading(true);
      try {
        const [profileData, postsData] = await Promise.all([
          fetchProfile(handle),
          fetchUserPosts(handle, 20)
        ]);
        
        setProfile(profileData);
        setPosts(postsData.posts);
        
        // TODO: Check if current user is following this user
        setIsFollowing(false);
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [handle]);

  const handleFollow = async () => {
    if (!isAuthenticated || !handle) return;
    
    // TODO: Implement follow/unfollow functionality
    setIsFollowing(!isFollowing);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="p-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="text-center text-muted-foreground">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="p-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="text-center text-muted-foreground">User not found</div>
        </div>
      </div>
    );
  }

  const isOwnProfile = session?.handle === handle;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm" className="p-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">@{handle}</h1>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>

        {/* Profile Section */}
        <div className="space-y-6">
          {/* Banner */}
          {profile.banner && (
            <div className="h-32 w-full rounded-lg overflow-hidden">
              <img 
                src={profile.banner} 
                alt="Profile banner"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          {/* Profile Info */}
          <div className="flex items-start space-x-4">
            {profile.avatar && (
              <img 
                src={profile.avatar} 
                alt="Profile avatar"
                className="w-16 h-16 rounded-full flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold text-foreground truncate">
                    {profile.displayName || handle}
                  </h2>
                  <p className="text-muted-foreground">@{handle}</p>
                </div>
                
                {!isOwnProfile && isAuthenticated && (
                  <Button
                    onClick={handleFollow}
                    variant={isFollowing ? "outline" : "default"}
                    size="sm"
                    className="ml-2 flex-shrink-0"
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus className="h-4 w-4 mr-1" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-1" />
                        Follow
                      </>
                    )}
                  </Button>
                )}
              </div>
              
              {profile.description && (
                <div className="mt-3">
                  <p className="text-sm text-foreground break-words">
                    {showFullDescription ? profile.description : (() => {
                      if (profile.description.length <= 150) return profile.description;
                      const truncated = profile.description.slice(0, 150);
                      const lastSpaceIndex = truncated.lastIndexOf(' ');
                      return lastSpaceIndex > 0 ? truncated.slice(0, lastSpaceIndex) + '...' : truncated + '...';
                    })()}
                  </p>
                  {profile.description.length > 150 && (
                    <button
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="text-xs text-primary hover:underline mt-1 block"
                    >
                      {showFullDescription ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              )}
              
              <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                <span className="whitespace-nowrap">{profile.followersCount || 0} followers</span>
                <span className="whitespace-nowrap">{profile.followsCount || 0} following</span>
                <span className="whitespace-nowrap">{profile.postsCount || 0} posts</span>
              </div>
            </div>
          </div>
          
          {/* Posts Section */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Posts</h3>
            {posts.length > 0 ? (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard 
                    key={post.id} 
                    {...post} 
                    onPostDeleted={() => {
                      setPosts(prev => prev.filter(p => p.id !== post.id));
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No posts yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
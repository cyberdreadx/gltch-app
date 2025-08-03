import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, UserPlus, UserMinus, Edit, Settings, Share, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PostCard } from '@/components/PostCard';
import { fetchUserPosts, fetchUserReplies, fetchProfile, checkFollowStatus, followUser, unfollowUser, type TransformedPost, type ProfileData } from '@/lib/bluesky';
import { useAuth } from '@/hooks/useAuth';

export function UserProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const { session, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<TransformedPost[]>([]);
  const [replies, setReplies] = useState<TransformedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followUri, setFollowUri] = useState<string | undefined>();
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    if (!handle) return;

    const loadUserData = async () => {
      setIsLoading(true);
      try {
        const [profileData, postsData, repliesData] = await Promise.all([
          fetchProfile(handle),
          fetchUserPosts(handle, 20),
          fetchUserReplies(handle, 20)
        ]);
        
        setProfile(profileData);
        setPosts(postsData.posts);
        setReplies(repliesData.posts);
        
        // Check if current user is following this user
        if (isAuthenticated && profileData.did) {
          const followStatus = await checkFollowStatus(profileData.did);
          setIsFollowing(followStatus.isFollowing);
          setFollowUri(followStatus.followUri);
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [handle, isAuthenticated]);

  const handleFollow = async () => {
    if (!isAuthenticated || !profile?.did) return;
    
    try {
      if (isFollowing && followUri) {
        // Unfollow
        const result = await unfollowUser(followUri);
        if (result.success) {
          setIsFollowing(false);
          setFollowUri(undefined);
        }
      } else {
        // Follow
        const result = await followUser(profile.did);
        if (result.success) {
          setIsFollowing(true);
          setFollowUri(result.followUri);
        }
      }
    } catch (error) {
      console.error('Failed to follow/unfollow user:', error);
    }
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
              
              <div className="flex gap-4 mt-3 text-sm">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-foreground">{profile.followersCount || 0}</span>
                  <span className="text-muted-foreground">followers</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-foreground">{profile.followsCount || 0}</span>
                  <span className="text-muted-foreground">following</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-foreground">{profile.postsCount || 0}</span>
                  <span className="text-muted-foreground">posts</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Social Actions Section - Reddit Inspired */}
          {isOwnProfile && (
            <div className="bg-card border rounded-lg p-4">
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">Quick Actions</h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="text-xs">
                  <Edit className="h-3 w-3 mr-1" />
                  Edit Profile
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  <Settings className="h-3 w-3 mr-1" />
                  Settings
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  <Share className="h-3 w-3 mr-1" />
                  Share Profile
                </Button>
              </div>
            </div>
          )}

          {/* Communities Section - Reddit Inspired */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">
              {isOwnProfile ? "My Communities" : "Communities"}
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Showing communities</span>
                <span className="text-xs text-muted-foreground">View all</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-md cursor-pointer">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <Hash className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm font-medium">gltch</span>
                  <span className="text-xs text-muted-foreground ml-auto">Owner</span>
                </div>
              </div>
            </div>
          </div>

          {/* Posts and Replies Section */}
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted/30">
              <TabsTrigger value="posts" className="text-xs font-medium">
                Posts
              </TabsTrigger>
              <TabsTrigger value="replies" className="text-xs font-medium">
                Replies
              </TabsTrigger>
              <TabsTrigger value="communities" className="text-xs font-medium">
                Communities
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="posts" className="mt-4">
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
            </TabsContent>
            
            <TabsContent value="replies" className="mt-4">
              {replies.length > 0 ? (
                <div className="space-y-4">
                  {replies.map((reply) => (
                    <PostCard 
                      key={reply.id} 
                      {...reply} 
                      onPostDeleted={() => {
                        setReplies(prev => prev.filter(r => r.id !== reply.id));
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No replies yet
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="communities" className="mt-4">
              <div className="bg-card border rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Created Communities</h4>
                    <span className="text-xs text-muted-foreground">1</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                        <Hash className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-sm">gltch</h5>
                        <p className="text-xs text-muted-foreground">The main community for gltch users</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>1 member</span>
                          <span>•</span>
                          <span>Created recently</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs">
                        Manage
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
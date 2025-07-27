import { useState, useEffect } from "react";
import { PostCard } from "@/components/PostCard";
import { CommunityCard } from "@/components/CommunityCard";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { AppSidebar } from "@/components/AppSidebar";
import { AuthDialog } from "@/components/AuthDialog";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { fetchTimeline, fetchUserPosts, fetchProfile, type TransformedPost, type ProfileData } from "@/lib/bluesky";
import { mockPosts, mockCommunities } from "@/data/mockData";

const Index = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [posts, setPosts] = useState<TransformedPost[]>([]);
  const [userPosts, setUserPosts] = useState<TransformedPost[]>([]);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isLoadingUserPosts, setIsLoadingUserPosts] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const { session, isAuthenticated, logout, refreshSession } = useAuth();

  useEffect(() => {
    const loadPosts = async () => {
      if (!isAuthenticated) return;
      
      setIsLoadingPosts(true);
      try {
        const timelinePosts = await fetchTimeline();
        setPosts(timelinePosts);
      } catch (error) {
        console.error('Failed to load posts:', error);
      } finally {
        setIsLoadingPosts(false);
      }
    };

    loadPosts();
  }, [isAuthenticated]);

  useEffect(() => {
    const loadUserData = async () => {
      if (!isAuthenticated || !session?.handle) return;
      
      setIsLoadingUserPosts(true);
      setIsLoadingProfile(true);
      
      try {
        const [posts, profile] = await Promise.all([
          fetchUserPosts(session.handle),
          fetchProfile(session.handle)
        ]);
        setUserPosts(posts);
        setProfileData(profile);
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setIsLoadingUserPosts(false);
        setIsLoadingProfile(false);
      }
    };

    if (activeTab === 'profile') {
      loadUserData();
    }
  }, [isAuthenticated, session?.handle, activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        if (!isAuthenticated) {
          return (
            <div className="p-6 text-center">
              <h2 className="text-xl font-semibold text-foreground mb-2">Welcome to GLTCH</h2>
              <p className="text-muted-foreground mb-4">Sign in to see your Bluesky timeline</p>
              <Button onClick={() => setShowAuthDialog(true)}>
                Sign In with Bluesky
              </Button>
            </div>
          );
        }

        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Your Timeline</h2>
            {isLoadingPosts ? (
              <div className="text-center text-muted-foreground">Loading posts...</div>
            ) : posts.length > 0 ? (
              <div className="space-y-0">
                {posts.map((post) => (
                  <PostCard key={post.id} {...post} />
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                No posts in your timeline yet. Follow some accounts on Bluesky!
              </div>
            )}
          </div>
        );
      case 'discover':
        return (
          <div className="p-6 text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Discover Communities</h2>
            <p className="text-muted-foreground mb-4">No communities yet. Be the first to create one!</p>
            <div className="space-y-3">
              {mockCommunities.length > 0 ? (
                mockCommunities.map((community) => (
                  <CommunityCard key={community.name} {...community} />
                ))
              ) : null}
            </div>
          </div>
        );
      case 'post':
        return (
          <div className="p-6 text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Create Post</h2>
            <p className="text-muted-foreground">Post creation interface coming soon</p>
          </div>
        );
      case 'inbox':
        return (
          <div className="p-6 text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Inbox</h2>
            <p className="text-muted-foreground">No new messages</p>
          </div>
        );
      case 'profile':
        return (
          <div className="p-6">
            {isAuthenticated ? (
              <div className="space-y-6">
                {/* Profile Header */}
                <div className="relative">
                  {/* Banner Image */}
                  {profileData?.banner && (
                    <div className="h-32 w-full rounded-lg overflow-hidden mb-4">
                      <img 
                        src={profileData.banner} 
                        alt="Profile banner"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  {/* Profile Info */}
                  <div className="flex items-start space-x-4 pb-6 border-b">
                    {profileData?.avatar && (
                      <img 
                        src={profileData.avatar} 
                        alt="Profile avatar"
                        className="w-16 h-16 rounded-full"
                      />
                    )}
                    <div className="flex-1">
                      {isLoadingProfile ? (
                        <div className="text-muted-foreground">Loading profile...</div>
                      ) : (
                        <>
                          <h2 className="text-xl font-semibold text-foreground">
                            {profileData?.displayName || session?.handle}
                          </h2>
                          <p className="text-muted-foreground">@{session?.handle}</p>
                          {profileData?.description && (
                            <p className="text-sm text-foreground mt-2">{profileData.description}</p>
                          )}
                          <div className="flex space-x-4 mt-2 text-sm text-muted-foreground">
                            <span>{profileData?.followersCount || 0} followers</span>
                            <span>{profileData?.followsCount || 0} following</span>
                            <span>{profileData?.postsCount || 0} posts</span>
                          </div>
                        </>
                      )}
                    </div>
                    <Button onClick={logout} variant="outline">
                      Sign Out
                    </Button>
                  </div>
                </div>
                
                {/* Posts Section */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Your Posts</h3>
                  {isLoadingUserPosts ? (
                    <div className="text-center text-muted-foreground">Loading your posts...</div>
                  ) : userPosts.length > 0 ? (
                    <div className="space-y-0">
                      {userPosts.map((post) => (
                        <PostCard key={post.id} {...post} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      You haven't posted anything yet. Create your first post on Bluesky!
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <h2 className="text-xl font-semibold text-foreground mb-2">Profile</h2>
                <p className="text-muted-foreground mb-4">Please sign in to view your profile</p>
                <Button onClick={() => setShowAuthDialog(true)}>
                  Sign In with Bluesky
                </Button>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'home': return 'GLTCH';
      case 'discover': return 'Discover';
      case 'post': return 'Create Post';
      case 'inbox': return 'Inbox';
      case 'profile': return 'Profile';
      default: return 'GLTCH';
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full">
        <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger className="ml-2" />
            <h1 className="ml-4 font-semibold text-foreground">{getTitle()}</h1>
          </header>
          
          <main className="flex-1 pb-20 md:pb-0">
            {renderContent()}
          </main>
          
          {/* Show bottom nav only on mobile */}
          <div className="md:hidden">
            <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
        </div>
      </div>
      
      <AuthDialog 
        open={showAuthDialog} 
        onOpenChange={setShowAuthDialog}
        onSuccess={refreshSession}
      />
    </SidebarProvider>
  );
};

export default Index;

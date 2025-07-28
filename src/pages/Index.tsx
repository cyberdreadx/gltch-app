import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { PostCard } from "@/components/PostCard";
import { CommunityCard } from "@/components/CommunityCard";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { AppSidebar } from "@/components/AppSidebar";
import { AuthDialog } from "@/components/AuthDialog";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { fetchTimeline, fetchUserPosts, fetchProfile, fetchPublicFeed, type TransformedPost, type ProfileData } from "@/lib/bluesky";
import { fetchCustomFeed, registerAppUser } from "@/lib/customFeeds";
import { FeedSelector } from "@/components/FeedSelector";
import { ProfileSettings } from "@/components/ProfileSettings";
import { NotificationList } from "@/components/NotificationList";
import { CreatePost } from "@/components/CreatePost";
import { supabase } from "@/integrations/supabase/client";
import { mockPosts, mockCommunities } from "@/data/mockData";
import { ExternalLink, Settings } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [currentFeed, setCurrentFeed] = useState('g/feed');
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [posts, setPosts] = useState<TransformedPost[]>([]);
  const [userPosts, setUserPosts] = useState<TransformedPost[]>([]);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [communities, setCommunities] = useState<any[]>([]);
  const [userCommunities, setUserCommunities] = useState<any[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<TransformedPost[]>([]);
  const [isLoadingCommunities, setIsLoadingCommunities] = useState(false);
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isLoadingUserPosts, setIsLoadingUserPosts] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [timelineCursor, setTimelineCursor] = useState<string | null>(null);
  const [hasMoreUserPosts, setHasMoreUserPosts] = useState(true);
  const [isLoadingMoreUserPosts, setIsLoadingMoreUserPosts] = useState(false);
  const [userPostsCursor, setUserPostsCursor] = useState<string | undefined>();
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const userPostsObserverRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const userPostsLoadingRef = useRef<HTMLDivElement>(null);
  const { session, isAuthenticated, logout, refreshSession } = useAuth();
  const { user: supabaseUser, profile: supabaseProfile, isAuthenticated: isSupabaseAuthenticated } = useSupabaseAuth();

  const loadMorePosts = useCallback(async () => {
    if (isLoadingMore || !hasMorePosts) return;
    
    setIsLoadingMore(true);
    try {
      // Use public feed for discover-style content
      const result = await fetchPublicFeed(5);
      if (result.length === 0) {
        setHasMorePosts(false);
      } else {
        setPosts(prev => [...prev, ...result]);
        // fetchPublicFeed doesn't use cursor, disable infinite scroll for now
        setHasMorePosts(false);
      }
    } catch (error) {
      console.error('Failed to load more posts:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isAuthenticated, isLoadingMore, hasMorePosts, timelineCursor]);

  const loadMoreUserPosts = useCallback(async () => {
    if (!isAuthenticated || !session?.handle || !userPostsCursor || isLoadingMoreUserPosts || !hasMoreUserPosts) return;
    
    setIsLoadingMoreUserPosts(true);
    try {
      const data = await fetchUserPosts(session.handle, 10, userPostsCursor);
      setUserPosts(prevPosts => [...prevPosts, ...data.posts]);
      setUserPostsCursor(data.cursor);
      setHasMoreUserPosts(!!data.cursor);
    } catch (error) {
      console.error('Failed to load more user posts:', error);
    } finally {
      setIsLoadingMoreUserPosts(false);
    }
  }, [isAuthenticated, session?.handle, userPostsCursor, isLoadingMoreUserPosts, hasMoreUserPosts]);

  const loadPostsForFeed = useCallback(async (feedId: string) => {
    setIsLoadingPosts(true);
    setPosts([]);
    setHasMorePosts(true);
    setTimelineCursor(null);
    
    try {
      let result: TransformedPost[] = [];
      let cursor: string | undefined;
      
      // Check if it's a custom GLTCH feed
      if (['gltch-community', 'trending-gltch', 'hashtag-feeds'].includes(feedId)) {
        const customFeedResult = await fetchCustomFeed(feedId, 20);
        result = customFeedResult.posts;
        cursor = customFeedResult.cursor;
      } else if (feedId === 'g/feed') {
        // Public discover feed
        result = await fetchPublicFeed(20);
      } else if (feedId === 'following') {
        // User's timeline (people they follow)
        if (isAuthenticated) {
          const timelineResult = await fetchTimeline(20);
          result = timelineResult.posts;
          setTimelineCursor(timelineResult.cursor || null);
          setHasMorePosts(!!timelineResult.cursor);
        }
      } else if (feedId.startsWith('g/')) {
        // Community-specific feed
        const communityName = feedId.replace('g/', '');
        
        // Find community ID
        const { data: community } = await supabase
          .from('communities')
          .select('id')
          .eq('name', communityName)
          .single();
        
        if (community) {
          const customFeedResult = await fetchCustomFeed('community-specific', 20, undefined, {
            communityId: community.id
          });
          result = customFeedResult.posts;
          cursor = customFeedResult.cursor;
        } else {
          // Fallback to public feed
          result = await fetchPublicFeed(20);
        }
      }
      
      setPosts(result);
      setTimelineCursor(cursor || null);
      setHasMorePosts(!!cursor);
      
      if (feedId === 'g/feed' && !cursor) {
        setHasMorePosts(false); // Public feed doesn't support pagination yet
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadPostsForFeed(currentFeed);
  }, [currentFeed, loadPostsForFeed]);

  const handleFeedChange = (feedId: string) => {
    setCurrentFeed(feedId);
  };

  // Handle scroll direction for header visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 10) {
        // Always show header when near top
        setIsHeaderVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down and past threshold - hide header
        setIsHeaderVisible(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show header
        setIsHeaderVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'home') return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMorePosts && !isLoadingMore) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    if (loadingRef.current) {
      observerRef.current.observe(loadingRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isAuthenticated, activeTab, hasMorePosts, isLoadingMore, loadMorePosts]);

  useEffect(() => {
    const loadUserData = async () => {
      if (!isAuthenticated || !session?.handle) {
        console.log('Not authenticated or no handle:', { isAuthenticated, handle: session?.handle });
        return;
      }
      
      console.log('Loading user data for:', session.handle);
      setIsLoadingUserPosts(true);
      setIsLoadingProfile(true);
      setUserPosts([]);
      setHasMoreUserPosts(true);
      setUserPostsCursor(undefined);
      
      try {
        console.log('Fetching user posts and profile...');
        const [postsData, profile] = await Promise.all([
          fetchUserPosts(session.handle, 20),
          fetchProfile(session.handle)
        ]);
        console.log('User posts loaded:', postsData.posts.length, 'posts');
        console.log('Profile loaded:', profile);
        setUserPosts(postsData.posts);
        setUserPostsCursor(postsData.cursor);
        setHasMoreUserPosts(!!postsData.cursor);
        setProfileData(profile);
        
        // Register user as app user for custom feeds
        if (session.did && session.handle) {
          await registerAppUser(
            session.did, 
            session.handle, 
            profile.displayName, 
            profile.avatar
          );
        }
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
  }, [isAuthenticated, session?.handle, session?.did, activeTab]);

  // Set up intersection observer for profile posts infinite scroll
  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'profile') return;

    if (userPostsObserverRef.current) {
      userPostsObserverRef.current.disconnect();
    }

    userPostsObserverRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMoreUserPosts && !isLoadingMoreUserPosts) {
          loadMoreUserPosts();
        }
      },
      { threshold: 0.1 }
    );

    if (userPostsLoadingRef.current) {
      userPostsObserverRef.current.observe(userPostsLoadingRef.current);
    }

    return () => {
      if (userPostsObserverRef.current) {
        userPostsObserverRef.current.disconnect();
      }
    };
  }, [isAuthenticated, activeTab, hasMoreUserPosts, isLoadingMoreUserPosts, loadMoreUserPosts]);

  // Load discover page data (communities and trending content)
  useEffect(() => {
    const loadDiscoverData = async () => {
      if (activeTab !== 'discover') return;
      
      setIsLoadingCommunities(true);
      setIsLoadingTrending(true);
      
      try {
        // Fetch communities from database
        const { data: communitiesData, error: communitiesError } = await supabase
          .from('communities')
          .select('*')
          .order('member_count', { ascending: false })
          .limit(5);
        
        if (communitiesError) {
          console.error('Failed to load communities:', communitiesError);
        } else {
          setCommunities(communitiesData || []);
        }

        // Fetch trending posts (using public feed for discovery)
        try {
          const publicFeedData = await fetchPublicFeed(15);
          setTrendingPosts(publicFeedData);
        } catch (error) {
          console.log('No trending posts available');
          setTrendingPosts([]);
        }
      } catch (error) {
        console.error('Failed to load discover data:', error);
      } finally {
        setIsLoadingCommunities(false);
        setIsLoadingTrending(false);
      }
    };

    loadDiscoverData();
  }, [activeTab]);

  // Load user communities when user is authenticated
  useEffect(() => {
    const loadUserCommunities = async () => {
      if (!isAuthenticated || !session?.did) return;
      
      try {
        const { data: memberships, error } = await supabase
          .from('user_communities')
          .select(`
            communities (
              name,
              display_name
            )
          `)
          .eq('user_id', session.did);
        
        if (error) {
          console.error('Failed to load user communities:', error);
        } else {
          const communities = memberships?.map(m => m.communities).filter(Boolean) || [];
          setUserCommunities(communities);
        }
      } catch (error) {
        console.error('Failed to load user communities:', error);
      }
    };

    loadUserCommunities();
  }, [isAuthenticated, session?.did]);

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        if (!isAuthenticated && !isSupabaseAuthenticated) {
          return (
            <div className="p-6 text-center space-y-4">
              <h2 className="text-xl font-semibold text-foreground mb-2">Welcome to GLTCH</h2>
              <p className="text-muted-foreground mb-4">
                Join GLTCH to discover communities and connect with the Bluesky network
              </p>
              <Button onClick={() => setShowAuthDialog(true)}>
                Sign Up / Sign In
              </Button>
            </div>
          );
        }

        if (isSupabaseAuthenticated && !isAuthenticated) {
          return (
            <div className="p-6 space-y-6">
              <div className="text-center space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Welcome to GLTCH!</h2>
                <p className="text-muted-foreground">
                  You're signed up for GLTCH! {supabaseProfile?.bluesky_handle ? 
                    'Connect your Bluesky account to see your timeline.' : 
                    'Add your Bluesky handle to get the full experience.'}
                </p>
                
                {!supabaseProfile?.bluesky_handle && (
                  <div className="bg-card border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-primary">
                      <ExternalLink className="h-4 w-4" />
                      <span className="text-sm font-medium">Don't have a Bluesky account?</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Create a free Bluesky account to access your timeline and interact with posts.
                    </p>
                    <Button asChild variant="outline" size="sm">
                      <a 
                        href="https://bsky.app" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2"
                      >
                        Create Bluesky Account
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                )}
              </div>
              
              <ProfileSettings />
            </div>
          );
        }

        return (
          <div className="p-2 md:p-4 lg:p-6 max-w-full overflow-x-hidden">
            <div className="flex items-center justify-between mb-4">
              <FeedSelector 
                currentFeed={currentFeed}
                onFeedChange={handleFeedChange}
                userCommunities={userCommunities}
              />
              <CreatePost onPostCreated={() => loadPostsForFeed(currentFeed)} variant="floating" />
            </div>
            {isLoadingPosts ? (
              <div className="text-center text-muted-foreground">Loading posts...</div>
            ) : posts.length > 0 ? (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={post.id} {...post} />
                ))}
                
                {/* Loading indicator for infinite scroll */}
                <div ref={loadingRef} className="py-4 text-center">
                  {isLoadingMore && (
                    <div className="text-muted-foreground">Loading more posts...</div>
                  )}
                  {!hasMorePosts && posts.length > 0 && (
                    <div className="text-muted-foreground text-sm">You've reached the end</div>
                  )}
                </div>
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
          <div className="p-2 md:p-4 lg:p-6 max-w-full overflow-x-hidden">
            <div className="space-y-8">
              {/* Header with Create Community Button */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Discover</h2>
                {isAuthenticated && (
                  <Link to="/create-community">
                    <Button size="sm" className="bg-primary hover:bg-primary/90">
                      Create Community
                    </Button>
                  </Link>
                )}
              </div>
              
              {/* Communities Section */}
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Popular Communities</h2>
                {isLoadingCommunities ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="bg-card rounded-lg p-4 animate-pulse">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : communities.length > 0 ? (
                  <div className="space-y-3">
                    {communities.map((community) => (
                      <CommunityCard 
                        key={community.id} 
                        name={community.name}
                        description={community.description || 'A community on GLTCH'}
                        members={community.member_count}
                        iconUrl={community.icon_url}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No communities yet. Be the first to create one!</p>
                  </div>
                )}
              </div>

              {/* Trending Posts Section */}
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Trending Posts</h2>
                {isLoadingTrending ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="bg-card rounded-lg p-4 animate-pulse">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-2/3"></div>
                      </div>
                    ))}
                  </div>
                ) : trendingPosts.length > 0 ? (
                  <div className="space-y-4">
                    {trendingPosts.slice(0, 10).map((post) => (
                      <PostCard key={post.id} {...post} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">Sign in to see trending posts from the network!</p>
                    <Button onClick={() => setShowAuthDialog(true)} variant="outline">
                      Sign In with Bluesky
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'inbox':
        return (
          <div className="p-2 md:p-4 lg:p-6 max-w-full overflow-x-hidden">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-foreground">Notifications</h2>
            </div>
            <NotificationList />
          </div>
        );
      case 'profile':
        return (
          <div className="p-2 md:p-4 lg:p-6 max-w-full overflow-x-hidden">
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
                   <div className="flex items-start space-x-3 pb-6 border-b max-w-full overflow-x-hidden">
                     {profileData?.avatar && (
                       <img 
                         src={profileData.avatar} 
                         alt="Profile avatar"
                         className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex-shrink-0"
                       />
                     )}
                     <div className="flex-1 min-w-0 max-w-full overflow-x-hidden">
                       {isLoadingProfile ? (
                         <div className="text-muted-foreground">Loading profile...</div>
                       ) : (
                         <>
                           <h2 className="text-lg sm:text-xl font-semibold text-foreground truncate max-w-full">
                             {profileData?.displayName || session?.handle}
                           </h2>
                           <p className="text-muted-foreground truncate text-sm max-w-full">@{session?.handle}</p>
                           {profileData?.description && (
                             <div className="mt-2 max-w-full">
                               <p className="text-sm text-foreground break-words max-w-full">
                                 {showFullDescription ? profileData.description : (() => {
                                   if (profileData.description.length <= 100) return profileData.description;
                                   const truncated = profileData.description.slice(0, 100);
                                   const lastSpaceIndex = truncated.lastIndexOf(' ');
                                   return lastSpaceIndex > 0 ? truncated.slice(0, lastSpaceIndex) + '...' : truncated + '...';
                                 })()}
                               </p>
                               {profileData.description.length > 100 && (
                                 <button
                                   onClick={() => setShowFullDescription(!showFullDescription)}
                                   className="text-xs text-primary hover:underline mt-1 block"
                                 >
                                   {showFullDescription ? 'Show less' : 'Show more'}
                                 </button>
                               )}
                             </div>
                           )}
                           <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground max-w-full">
                             <span className="whitespace-nowrap">{profileData?.followersCount || 0} followers</span>
                             <span className="whitespace-nowrap">{profileData?.followsCount || 0} following</span>
                             <span className="whitespace-nowrap">{profileData?.postsCount || 0} posts</span>
                           </div>
                         </>
                       )}
                     </div>
                     <Button onClick={logout} variant="outline" className="flex-shrink-0 text-xs px-2 py-1 h-8">
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
                     <div className="space-y-4">
                       {userPosts.map((post) => (
                         <PostCard key={post.id} {...post} />
                       ))}
                       
                       {/* Loading indicator for infinite scroll */}
                       <div ref={userPostsLoadingRef} className="py-4 text-center">
                         {isLoadingMoreUserPosts && (
                           <div className="text-muted-foreground">Loading more posts...</div>
                         )}
                         {!hasMoreUserPosts && userPosts.length > 0 && (
                           <div className="text-muted-foreground text-sm">You've reached the end</div>
                         )}
                       </div>
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
      <div className="min-h-screen bg-background flex w-full max-w-full overflow-x-hidden">
        <AppSidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          userCommunities={userCommunities}
          isAuthenticated={isAuthenticated}
        />
        
        <div className="flex-1 flex flex-col min-w-0 max-w-full">
          <header className={`fixed top-0 left-0 right-0 h-12 flex items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0 z-50 transition-all duration-300 ${
            isHeaderVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
          }`}>
            <div className="flex items-center">
              <SidebarTrigger className="ml-2" />
              <h1 className="ml-4 font-semibold text-foreground truncate">{getTitle()}</h1>
            </div>
            
            {!isAuthenticated && !isSupabaseAuthenticated && (
              <div className="mr-4">
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => setShowAuthDialog(true)}
                  className="h-8 px-3"
                >
                  Sign Up
                </Button>
              </div>
            )}
          </header>
          
          <main className="flex-1 pb-20 md:pb-0 overflow-x-hidden max-w-full pt-12">
            {renderContent()}
          </main>
          
          {/* Show bottom nav only on mobile */}
          <div className="md:hidden">
            <BottomNav activeTab={activeTab} onTabChange={setActiveTab} onPostCreated={() => loadPostsForFeed(currentFeed)} />
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

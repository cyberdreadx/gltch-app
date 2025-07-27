import { useState } from "react";
import { PostCard } from "@/components/PostCard";
import { CommunityCard } from "@/components/CommunityCard";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { AppSidebar } from "@/components/AppSidebar";
import { AuthDialog } from "@/components/AuthDialog";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { mockPosts, mockCommunities } from "@/data/mockData";

const Index = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const { session, isAuthenticated, logout, refreshSession } = useAuth();

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="p-6 text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Welcome to GLTCH</h2>
            <p className="text-muted-foreground mb-4">No posts yet. Start by creating your first post!</p>
            <div className="space-y-0">
              {mockPosts.length > 0 ? (
                mockPosts.map((post) => (
                  <PostCard key={post.id} {...post} />
                ))
              ) : null}
            </div>
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
          <div className="p-6 text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Profile</h2>
            {isAuthenticated ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">Welcome back, @{session?.handle}!</p>
                <Button onClick={logout} variant="outline">
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
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

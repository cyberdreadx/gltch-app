import { useState } from "react";
import { PostCard } from "@/components/PostCard";
import { CommunityCard } from "@/components/CommunityCard";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { mockPosts, mockCommunities } from "@/data/mockData";

const Index = () => {
  const [activeTab, setActiveTab] = useState('home');

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-0">
            {mockPosts.map((post) => (
              <PostCard key={post.id} {...post} />
            ))}
          </div>
        );
      case 'discover':
        return (
          <div className="space-y-3 p-3">
            <h2 className="font-semibold text-lg text-foreground mb-3">Popular Communities</h2>
            {mockCommunities.map((community) => (
              <CommunityCard key={community.name} {...community} />
            ))}
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
            <p className="text-muted-foreground">User profile coming soon</p>
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
    </SidebarProvider>
  );
};

export default Index;

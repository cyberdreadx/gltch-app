import { useState, useEffect } from "react";
import { ChevronDown, Hash, Globe, Users, UserPlus, Star, TrendingUp, Sparkles, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { fetchAvailableFeeds, type CustomFeedConfig } from "@/lib/customFeeds";

interface FeedOption {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  description?: string;
  isCustom?: boolean;
}

interface FeedSelectorProps {
  currentFeed: string;
  onFeedChange: (feedId: string) => void;
  userCommunities?: Array<{ name: string; display_name: string }>;
}

export function FeedSelector({ currentFeed, onFeedChange, userCommunities = [] }: FeedSelectorProps) {
  const [customFeeds, setCustomFeeds] = useState<CustomFeedConfig[]>([]);

  useEffect(() => {
    const loadCustomFeeds = async () => {
      const feeds = await fetchAvailableFeeds();
      setCustomFeeds(feeds);
    };
    loadCustomFeeds();
  }, []);

  const defaultFeeds: FeedOption[] = [
    {
      id: "g/feed",
      label: "Global",
      icon: Globe,
      description: "Discover trending posts"
    },
    {
      id: "following",
      label: "Following",
      icon: UserPlus,
      description: "Posts from people you follow"
    }
  ];

  // Custom GLTCH feeds
  const gltchFeeds: FeedOption[] = customFeeds.map(feed => ({
    id: feed.name,
    label: feed.display_name,
    icon: feed.name === 'gltch-community' ? Star : 
          feed.name === 'trending-gltch' ? TrendingUp :
          Sparkles,
    description: feed.description,
    isCustom: true
  }));

  // Only show communities the user is actually a member of
  const communityFeeds: FeedOption[] = userCommunities.map(community => ({
    id: `g/${community.name}`,
    label: `g/${community.name}`,
    icon: Hash,
    description: community.display_name
  }));

  const allFeeds = [...defaultFeeds, ...gltchFeeds, ...communityFeeds];
  const currentFeedData = allFeeds.find(feed => feed.id === currentFeed) || defaultFeeds[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="justify-between h-10 px-3 bg-card border border-border hover:bg-muted/50 min-w-[140px]"
        >
          <div className="flex items-center space-x-2">
            <currentFeedData.icon className="h-4 w-4" />
            <span className="font-medium">{currentFeedData.label}</span>
          </div>
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="start" 
        className="w-56 bg-popover border border-border shadow-lg z-50"
      >
        {/* Default Feeds */}
        <DropdownMenuLabel>Feeds</DropdownMenuLabel>
        {defaultFeeds.map((feed) => (
          <DropdownMenuItem
            key={feed.id}
            onClick={() => onFeedChange(feed.id)}
            className={`cursor-pointer ${currentFeed === feed.id ? 'bg-muted' : ''}`}
          >
            <div className="flex items-center space-x-3 w-full">
              <feed.icon className="h-4 w-4" />
              <div className="flex flex-col">
                <span className="font-medium">{feed.label}</span>
                {feed.description && (
                  <span className="text-xs text-muted-foreground">{feed.description}</span>
                )}
              </div>
            </div>
          </DropdownMenuItem>
        ))}

        {/* Custom GLTCH Feeds */}
        {gltchFeeds.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>GLTCH Feeds</DropdownMenuLabel>
            {gltchFeeds.map((feed) => (
              <DropdownMenuItem
                key={feed.id}
                onClick={() => onFeedChange(feed.id)}
                className={`cursor-pointer ${currentFeed === feed.id ? 'bg-muted' : ''}`}
              >
                <div className="flex items-center space-x-3 w-full">
                  <feed.icon className="h-4 w-4 text-primary" />
                  <div className="flex flex-col">
                    <span className="font-medium">{feed.label}</span>
                    {feed.description && (
                      <span className="text-xs text-muted-foreground">{feed.description}</span>
                    )}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
        
        {/* Communities Section */}
        {communityFeeds.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Your Communities</DropdownMenuLabel>
            {communityFeeds.map((feed) => (
              <DropdownMenuItem
                key={feed.id}
                onClick={() => onFeedChange(feed.id)}
                className={`cursor-pointer ${currentFeed === feed.id ? 'bg-muted' : ''}`}
              >
                <div className="flex items-center space-x-3 w-full">
                  <feed.icon className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">{feed.label}</span>
                    {feed.description && (
                      <span className="text-xs text-muted-foreground">{feed.description}</span>
                    )}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer text-muted-foreground">
          <Settings className="h-4 w-4 mr-2" />
          <span>Manage communities</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
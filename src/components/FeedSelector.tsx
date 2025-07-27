import { useState } from "react";
import { ChevronDown, Hash, Globe, Users, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FeedOption {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  description?: string;
}

interface FeedSelectorProps {
  currentFeed: string;
  onFeedChange: (feedId: string) => void;
  userCommunities?: Array<{ name: string; display_name: string }>;
}

export function FeedSelector({ currentFeed, onFeedChange, userCommunities = [] }: FeedSelectorProps) {
  const defaultFeeds: FeedOption[] = [
    {
      id: "g/feed",
      label: "g/feed",
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

  // Only show communities the user is actually a member of
  const communityFeeds: FeedOption[] = userCommunities.map(community => ({
    id: `g/${community.name}`,
    label: `g/${community.name}`,
    icon: Hash,
    description: community.display_name
  }));

  const allFeeds = [...defaultFeeds, ...communityFeeds];
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
        
        {/* Communities Section */}
        {communityFeeds.length > 0 && (
          <>
            <DropdownMenuSeparator />
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
          <Users className="h-4 w-4 mr-2" />
          <span>Manage communities</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
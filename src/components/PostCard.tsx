import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, MessageCircle, Share, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostCardProps {
  id: string;
  title: string;
  content?: string;
  author: string;
  community: string;
  timestamp: string;
  upvotes: number;
  comments: number;
  imageUrl?: string;
  authorDisplayName?: string;
  authorAvatar?: string;
}

export function PostCard({
  title,
  content,
  author,
  community,
  timestamp,
  upvotes: initialUpvotes,
  comments,
  imageUrl,
  authorDisplayName,
  authorAvatar,
}: PostCardProps) {
  const [voteState, setVoteState] = useState<'up' | 'down' | null>(null);
  const [upvotes, setUpvotes] = useState(initialUpvotes);

  const handleVote = (type: 'up' | 'down') => {
    if (voteState === type) {
      setVoteState(null);
      setUpvotes(type === 'up' ? upvotes - 1 : upvotes + 1);
    } else {
      const previousState = voteState;
      setVoteState(type);
      
      if (previousState === null) {
        setUpvotes(type === 'up' ? upvotes + 1 : upvotes - 1);
      } else {
        setUpvotes(type === 'up' ? upvotes + 2 : upvotes - 2);
      }
    }
  };

  return (
    <Card className="mb-2 bg-card border-border overflow-hidden">
      {/* Post Header */}
      <div className="p-3 pb-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <div className="flex items-center space-x-2">
            {authorAvatar && (
              <img 
                src={authorAvatar} 
                alt={authorDisplayName || author}
                className="w-4 h-4 rounded-full"
              />
            )}
            <span className="font-medium text-primary">
              {authorDisplayName || author}
            </span>
            <span>@{author}</span>
            <span>•</span>
            <span>{timestamp}</span>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </div>

        {/* Post Title */}
        <h2 className="font-semibold text-foreground text-sm leading-tight mb-2">
          {title}
        </h2>

        {/* Post Content */}
        {content && (
          <p className="text-sm text-foreground mb-3 line-clamp-3">
            {content}
          </p>
        )}

        {/* Post Image */}
        {imageUrl && (
          <div className="mb-3 rounded-lg overflow-hidden">
            <img 
              src={imageUrl} 
              alt="Post content" 
              className="w-full h-48 object-cover"
            />
          </div>
        )}
      </div>

      {/* Vote and Action Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-2 flex items-center space-x-1",
              voteState === 'up' && "text-upvote"
            )}
            onClick={() => handleVote('up')}
          >
            <ArrowUp className="h-4 w-4" />
            <span className="text-xs font-medium">{upvotes}</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-2",
              voteState === 'down' && "text-downvote"
            )}
            onClick={() => handleVote('down')}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="sm" className="h-8 px-2 flex items-center space-x-1">
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">{comments}</span>
          </Button>

          <Button variant="ghost" size="sm" className="h-8 px-2">
            <Share className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
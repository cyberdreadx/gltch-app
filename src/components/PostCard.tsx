import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, MessageCircle, Share, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageModal } from "./ImageModal";

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
  videoUrl?: string;
  mediaAlt?: string;
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
  videoUrl,
  mediaAlt,
  authorDisplayName,
  authorAvatar,
}: PostCardProps) {
  const [voteState, setVoteState] = useState<'up' | 'down' | null>(null);
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);

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

  // Intersection observer for video autoplay
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Video is in view - autoplay
            video.play().catch(() => {
              // Autoplay failed, probably due to browser policy
              console.log('Autoplay prevented');
            });
          } else {
            // Video is out of view - pause
            video.pause();
          }
        });
      },
      {
        threshold: 0.5, // Play when 50% of video is visible
      }
    );

    observer.observe(video);

    return () => observer.disconnect();
  }, [videoUrl]);

  // Handle video metadata loaded to get aspect ratio
  const handleVideoLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      setVideoAspectRatio(video.videoWidth / video.videoHeight);
    }
  };

  return (
    <Card className="mb-4 bg-card border-border overflow-hidden max-w-full">
      {/* Post Header */}
      <div className="p-3 pb-2 max-w-full overflow-x-hidden">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <div className="flex items-center space-x-2">
            {authorAvatar && (
              <img 
                src={authorAvatar} 
                alt={authorDisplayName || author}
                className="w-4 h-4 rounded-full"
              />
            )}
            <span className="font-medium text-primary truncate max-w-[150px]">
              {authorDisplayName ? authorDisplayName : `@${author}`}
            </span>
            <span>•</span>
            <span>{timestamp}</span>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </div>

        {/* Post Title */}
        <div className="mb-2">
          <h2 className="font-semibold text-foreground text-sm leading-tight break-words max-w-full">
            {isExpanded ? title : `${title.slice(0, 150)}${title.length > 150 ? '...' : ''}`}
          </h2>
          {title.length > 150 && (
            <button
              onClick={() => {
                console.log('Toggle clicked, current state:', isExpanded);
                setIsExpanded(!isExpanded);
              }}
              className="text-xs text-primary hover:underline mt-1 block"
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>

        {/* Post Content */}
        {content && (
          <div className="mb-3">
            <p className="text-sm text-foreground break-words max-w-full">
              {showFullContent ? content : `${content.slice(0, 200)}${content.length > 200 ? '...' : ''}`}
            </p>
            {content.length > 200 && (
              <button
                onClick={() => setShowFullContent(!showFullContent)}
                className="text-xs text-primary hover:underline mt-1 block"
              >
                {showFullContent ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

        {/* Post Media */}
        {imageUrl && (
          <div className="mb-3 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity bg-muted/20 max-w-full">
            <img 
              src={imageUrl} 
              alt={mediaAlt || "Post image"} 
              className="w-full h-auto object-contain max-h-[600px] max-w-full"
              onClick={() => setShowImageModal(true)}
            />
          </div>
        )}
        
        {videoUrl && (
          <div 
            className="mb-3 rounded-lg overflow-hidden bg-black relative group max-w-full"
            style={{
              aspectRatio: videoAspectRatio || '16/9',
              maxHeight: '500px'
            }}
          >
            <video 
              ref={videoRef}
              src={videoUrl} 
              controls
              muted
              loop
              playsInline
              className="w-full h-full object-contain hover-scale transition-transform duration-300 max-w-full"
              preload="metadata"
              onLoadedMetadata={handleVideoLoadedMetadata}
            >
              Your browser does not support video playback.
            </video>
            
            {/* Subtle play indicator overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div className="bg-black/20 rounded-full p-3 backdrop-blur-sm">
                <div className="w-0 h-0 border-l-[12px] border-l-white border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent ml-1"></div>
              </div>
            </div>
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
      
      {/* Image Modal */}
      {imageUrl && (
        <ImageModal
          src={imageUrl}
          alt={mediaAlt || "Post image"}
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
        />
      )}
    </Card>
  );
}
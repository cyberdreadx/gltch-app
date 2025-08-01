import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, MessageCircle, Share, MoreHorizontal, Repeat2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageModal } from "./ImageModal";
import { renderTextWithHashtags } from "@/utils/hashtag";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getStoredSession } from "@/lib/atproto";
import { createRepost, deleteRepost, checkRepostStatus, deletePost } from "@/lib/bluesky";
import { CommentThread } from "./CommentThread";

interface PostCardProps {
  id: string;
  title: string;
  content?: string;
  author: string;
  community: string;
  timestamp: string;
  upvotes: number;
  comments: number;
  reposts?: number;
  imageUrl?: string;
  videoUrl?: string;
  mediaAlt?: string;
  authorDisplayName?: string;
  authorAvatar?: string;
  postUri?: string; // Bluesky post URI for voting
  postCid?: string; // Bluesky post CID for reposts
  onPostDeleted?: () => void; // Callback when post is deleted
  parentPost?: {
    id?: string;
    title: string;
    author: string;
    authorDisplayName?: string;
    authorAvatar?: string;
    imageUrl?: string;
    videoUrl?: string;
  };
}

export function PostCard({
  title,
  content,
  author,
  community,
  timestamp,
  upvotes: initialUpvotes,
  comments,
  reposts: initialReposts = 0,
  imageUrl,
  videoUrl,
  mediaAlt,
  authorDisplayName,
  authorAvatar,
  postUri,
  postCid,
  onPostDeleted,
  parentPost,
}: PostCardProps) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [repostLoading, setRepostLoading] = useState(false);
  const [voteState, setVoteState] = useState<'up' | 'down' | null>(null);
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [reposts, setReposts] = useState(initialReposts);
  const [isReposted, setIsReposted] = useState(false);
  const [repostUri, setRepostUri] = useState<string | undefined>();
  const [showImageModal, setShowImageModal] = useState(false);
  const [showCommentThread, setShowCommentThread] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);

  // Check initial vote and repost state when component loads
  useEffect(() => {
    const checkInitialStates = async () => {
      if (!postUri || !session) return;
      
      const storedSession = getStoredSession();
      if (!storedSession) return;

      try {
        // Check vote state with better error handling
        const response = await supabase.functions.invoke('bluesky-votes', {
          body: {
            action: 'checkLikes',
            postUris: [postUri],
            session: storedSession,
            userId: session.did
          }
        });

        if (response.data?.votes?.[postUri]) {
          const vote = response.data.votes[postUri];
          console.log('Vote data for post:', postUri, vote);
          
          // Check if user has a vote in our database first (more reliable)
          if (vote.gltchVote === 'up') {
            setVoteState('up');
          } else if (vote.gltchVote === 'down') {
            setVoteState('down');
          } else if (vote.hasBlueskyLike) {
            setVoteState('up');
          }
        }

        // Check repost state
        const repostStatus = await checkRepostStatus(postUri, session.did);
        setIsReposted(repostStatus.isReposted);
        setRepostUri(repostStatus.repostUri);
      } catch (error) {
        console.error('Error checking initial states:', error);
      }
    };

    checkInitialStates();
  }, [postUri, session]);

  const handleVote = async (type: 'up' | 'down') => {
    if (!postUri || !session || loading) return;
    
    const storedSession = getStoredSession();
    if (!storedSession) return;

    setLoading(true);
    
    try {
      // Optimistic update
      const previousState = voteState;
      if (voteState === type) {
        setVoteState(null);
        setUpvotes(type === 'up' ? upvotes - 1 : upvotes + 1);
      } else {
        setVoteState(type);
        if (previousState === null) {
          setUpvotes(type === 'up' ? upvotes + 1 : upvotes - 1);
        } else {
          setUpvotes(type === 'up' ? upvotes + 2 : upvotes - 2);
        }
      }

      const { data } = await supabase.functions.invoke('bluesky-votes', {
        body: {
          action: 'vote',
          postUri,
          voteType: type,
          session: storedSession,
          userId: session.did
        }
      });

      if (!data?.success) {
        // Revert optimistic update on failure
        setVoteState(previousState);
        if (previousState === type) {
          setUpvotes(type === 'up' ? upvotes + 1 : upvotes - 1);
        } else {
          if (previousState === null) {
            setUpvotes(type === 'up' ? upvotes - 1 : upvotes + 1);
          } else {
            setUpvotes(type === 'up' ? upvotes - 2 : upvotes + 2);
          }
        }
      } else {
        // Vote succeeded - create notification for upvotes (not self-votes)
        // Note: For notifications we'd need the author's DID, which isn't available in current props
        // This would need to be added to the PostCard props from the parent component
        console.log('Vote successful, notification feature needs author DID to be implemented');
      }
    } catch (error) {
      console.error('Error voting:', error);
      // Revert optimistic update on error
      setVoteState(voteState);
    } finally {
      setLoading(false);
    }
  };

  const handleRepost = async () => {
    if (!postUri || !postCid || !session || repostLoading) {
      console.log('Missing required data for repost:', { postUri, postCid, session: !!session, repostLoading });
      return;
    }
    
    console.log('Attempting repost:', { postUri, postCid, sessionDid: session.did, isReposted });
    setRepostLoading(true);
    
    try {
      if (isReposted && repostUri) {
        // Un-repost
        console.log('Deleting repost:', repostUri);
        const result = await deleteRepost(repostUri);
        console.log('Delete repost result:', result);
        if (result.success) {
          setIsReposted(false);
          setRepostUri(undefined);
          setReposts(reposts - 1);
        }
      } else {
        // Repost
        console.log('Creating repost for:', { postUri, postCid });
        const result = await createRepost(postUri, postCid);
        console.log('Create repost result:', result);
        if (result.success) {
          setIsReposted(true);
          setRepostUri(result.repostUri);
          setReposts(reposts + 1);
        }
      }
    } catch (error) {
      console.error('Error handling repost:', error);
    } finally {
      setRepostLoading(false);
    }
  };

  const handleDeletePost = async () => {
    if (!postUri || !session || deleteLoading) return;
    
    const storedSession = getStoredSession();
    if (!storedSession) return;

    if (!window.confirm('Are you sure you want to delete this post?')) return;

    setDeleteLoading(true);
    
    try {
      const result = await deletePost(postUri);
      if (result.success) {
        onPostDeleted?.();
      } else {
        alert('Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Check if current user is the author of this post
  const isOwnPost = session?.handle === author || session?.did === author;

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
      {/* Show parent post context for replies */}
      {parentPost && (
        <div className="px-3 pt-3 pb-2">
          <div className="bg-muted/30 rounded-lg p-3 border-l-2 border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              {parentPost.authorAvatar && (
                <img 
                  src={parentPost.authorAvatar} 
                  alt={`${parentPost.authorDisplayName || parentPost.author}'s avatar`}
                  className="w-4 h-4 rounded-full"
                />
              )}
              <span className="text-xs text-muted-foreground">
                Replying to{' '}
                <Link 
                  to={`/user/${parentPost.author}`}
                  className="font-medium text-primary hover:underline"
                >
                  {parentPost.authorDisplayName || `@${parentPost.author}`}
                </Link>
              </span>
            </div>
            {parentPost.id ? (
              <Link 
                to={`/user/${parentPost.author}/post/${parentPost.id.split('/').pop()}`}
                className="flex gap-3 hover:bg-muted/50 rounded p-2 -m-2 transition-colors"
              >
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground line-clamp-2">{parentPost.title}</p>
                </div>
                {parentPost.imageUrl && (
                  <div className="flex-shrink-0">
                    <img 
                      src={parentPost.imageUrl} 
                      alt="Parent post image"
                      className="w-16 h-16 rounded object-cover"
                    />
                  </div>
                )}
                {parentPost.videoUrl && (
                  <div className="flex-shrink-0">
                    <video 
                      src={parentPost.videoUrl}
                      className="w-16 h-16 rounded object-cover"
                      muted
                    />
                  </div>
                )}
              </Link>
            ) : (
              <div className="flex gap-3">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground line-clamp-2">{parentPost.title}</p>
                </div>
                {parentPost.imageUrl && (
                  <div className="flex-shrink-0">
                    <img 
                      src={parentPost.imageUrl} 
                      alt="Parent post image"
                      className="w-16 h-16 rounded object-cover"
                    />
                  </div>
                )}
                {parentPost.videoUrl && (
                  <div className="flex-shrink-0">
                    <video 
                      src={parentPost.videoUrl}
                      className="w-16 h-16 rounded object-cover"
                      muted
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Post Header */}
      <div className="p-3 pb-2 max-w-full overflow-x-hidden">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <div className="flex items-center space-x-2">
            <Link 
              to={`/g/${community.replace('g/', '')}`}
              className="font-medium text-primary hover:text-primary/80 transition-colors duration-200"
            >
              {community}
            </Link>
            <span>•</span>
            {authorAvatar && (
              <img 
                src={authorAvatar} 
                alt={authorDisplayName || author}
                className="w-4 h-4 rounded-full"
              />
            )}
            <Link 
              to={`/user/${author}`}
              className="font-medium truncate max-w-[150px] hover:text-primary transition-colors"
            >
              {authorDisplayName ? authorDisplayName : `@${author}`}
            </Link>
            <span>•</span>
            <span>{timestamp}</span>
          </div>
          {isOwnPost && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 text-destructive hover:text-destructive/80"
              onClick={handleDeletePost}
              disabled={deleteLoading}
              title="Delete post"
            >
              {deleteLoading ? (
                <div className="h-3 w-3 border border-destructive border-t-transparent rounded-full animate-spin" />
              ) : (
                <MoreHorizontal className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>

        {/* Post Caption */}
        <div className="mb-4 relative group">
          <div className="absolute -left-1 top-0 w-1 h-full bg-gradient-to-b from-primary/20 via-primary/50 to-primary/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="pl-3 group-hover:pl-4 transition-all duration-300">
            <div className="font-bold text-sm leading-snug break-words max-w-full text-foreground mb-1">
              {renderTextWithHashtags(title)}
            </div>
            {content && (
              <div className="text-xs text-foreground/90 leading-relaxed break-words max-w-full font-light tracking-wide">
                {renderTextWithHashtags(content)}
              </div>
            )}
          </div>
          <div className="absolute bottom-0 left-3 right-0 h-px bg-gradient-to-r from-muted-foreground/10 via-muted-foreground/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>

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
            className="mb-3 rounded-lg overflow-hidden bg-black relative group max-w-full mx-auto"
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
              voteState === 'up' && "text-upvote",
              loading && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => handleVote('up')}
            disabled={loading}
          >
            <ArrowUp className="h-4 w-4" />
            <span className="text-xs font-medium">{upvotes}</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-2",
              voteState === 'down' && "text-downvote",
              loading && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => handleVote('down')}
            disabled={loading}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2 flex items-center space-x-1"
            onClick={() => setShowCommentThread(true)}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">{comments}</span>
          </Button>

          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "h-8 px-2 flex items-center space-x-1",
              isReposted && "text-primary",
              repostLoading && "opacity-50 cursor-not-allowed"
            )}
            onClick={handleRepost}
            disabled={repostLoading || !session}
          >
            <Repeat2 className="h-4 w-4" />
            <span className="text-xs">{reposts}</span>
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
      
      {/* Comment Thread Modal */}
      {postUri && postCid && (
        <CommentThread
          postUri={postUri}
          postCid={postCid}
          isOpen={showCommentThread}
          onClose={() => setShowCommentThread(false)}
        />
      )}
    </Card>
  );
}
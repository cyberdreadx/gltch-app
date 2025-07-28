import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, ArrowUp, Send, Loader2, Heart, Reply } from "lucide-react";
import { fetchPostThread, createReply, ThreadPost, likePost, unlikePost, checkLikeStatus, createReplyToComment } from "@/lib/bluesky";
import { formatTimeAgo } from "@/lib/customFeeds";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface CommentThreadProps {
  postUri: string;
  postCid: string;
  isOpen: boolean;
  onClose: () => void;
}

interface CommentProps {
  comment: ThreadPost;
  depth: number;
  rootPostUri: string;
  rootPostCid: string;
  onThreadUpdate: () => void;
}

const Comment = ({ comment, depth, rootPostUri, rootPostCid, onThreadUpdate }: CommentProps) => {
  const { session } = useAuth();
  const maxDepth = 3; // Limit nesting depth
  const indentClass = depth > 0 ? `ml-${Math.min(depth * 4, maxDepth * 4)}` : '';
  
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.post.likeCount || 0);
  const [likeUri, setLikeUri] = useState<string | undefined>();
  const [likeLoading, setLikeLoading] = useState(false);
  
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

  // Check initial like status
  useEffect(() => {
    const checkInitialLikeStatus = async () => {
      if (!session || !comment.post.uri) return;
      
      try {
        const result = await checkLikeStatus(comment.post.uri, session.did);
        setIsLiked(result.isLiked);
        setLikeUri(result.likeUri);
      } catch (error) {
        console.error('Error checking like status:', error);
      }
    };

    checkInitialLikeStatus();
  }, [comment.post.uri, session]);

  const handleLike = async () => {
    if (!session || !comment.post.uri || !comment.post.cid || likeLoading) return;
    
    setLikeLoading(true);
    try {
      if (isLiked && likeUri) {
        // Unlike
        const result = await unlikePost(likeUri);
        if (result.success) {
          setIsLiked(false);
          setLikeUri(undefined);
          setLikeCount(likeCount - 1);
        }
      } else {
        // Like
        const result = await likePost(comment.post.uri, comment.post.cid);
        if (result.success) {
          setIsLiked(true);
          setLikeUri(result.likeUri);
          setLikeCount(likeCount + 1);
        }
      }
    } catch (error) {
      console.error('Error handling like:', error);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleReplySubmit = async () => {
    if (!replyText.trim() || !session || !comment.post.uri || !comment.post.cid) return;
    
    setReplySubmitting(true);
    try {
      const result = await createReplyToComment(
        rootPostUri,
        rootPostCid,
        comment.post.uri,
        comment.post.cid,
        replyText.trim()
      );
      
      if (result.success) {
        setReplyText("");
        setShowReplyForm(false);
        // Trigger thread reload
        onThreadUpdate();
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
    } finally {
      setReplySubmitting(false);
    }
  };

  return (
    <div className={cn("border-l-2 border-border pl-3 py-2", indentClass)}>
      <div className="flex space-x-3">
        <Avatar className="h-6 w-6">
          <AvatarImage src={comment.post.author.avatar} />
          <AvatarFallback>
            {comment.post.author.displayName?.[0] || comment.post.author.handle[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-1">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {comment.post.author.displayName || `@${comment.post.author.handle}`}
            </span>
            <span>•</span>
            <span>{formatTimeAgo(comment.post.record?.createdAt || comment.post.indexedAt)}</span>
          </div>
          
          <p className="text-sm text-foreground">{comment.post.record?.text}</p>
          
          <div className="flex items-center space-x-4 text-xs">
            <button
              onClick={handleLike}
              disabled={!session || likeLoading}
              className={cn(
                "flex items-center space-x-1 hover:text-red-500 transition-colors",
                isLiked ? "text-red-500" : "text-muted-foreground",
                (!session || likeLoading) && "opacity-50 cursor-not-allowed"
              )}
            >
              <Heart className={cn("h-3 w-3", isLiked && "fill-current")} />
              <span>{likeCount}</span>
            </button>
            
            {session && depth < maxDepth && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Reply className="h-3 w-3" />
                <span>Reply</span>
              </button>
            )}
            
            {comment.post.replyCount && comment.post.replyCount > 0 && (
              <div className="flex items-center space-x-1 text-muted-foreground">
                <MessageCircle className="h-3 w-3" />
                <span>{comment.post.replyCount}</span>
              </div>
            )}
          </div>
          
          {/* Inline reply form */}
          {showReplyForm && session && (
            <div className="mt-2 space-y-2">
              <Textarea
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="min-h-[60px] text-sm"
              />
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyText("");
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleReplySubmit}
                  disabled={!replyText.trim() || replySubmitting}
                >
                  {replySubmitting ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Send className="h-3 w-3 mr-1" />
                  )}
                  Reply
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Render nested replies */}
      {comment.replies && comment.replies.length > 0 && depth < maxDepth && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((reply, index) => (
            <Comment 
              key={reply.post.uri || index} 
              comment={reply} 
              depth={depth + 1}
              rootPostUri={rootPostUri}
              rootPostCid={rootPostCid}
              onThreadUpdate={onThreadUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const CommentThread = ({ postUri, postCid, isOpen, onClose }: CommentThreadProps) => {
  const [thread, setThread] = useState<ThreadPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { session } = useAuth();

  useEffect(() => {
    if (isOpen && postUri) {
      loadThread();
    }
  }, [isOpen, postUri]);

  const loadThread = async () => {
    setLoading(true);
    try {
      const result = await fetchPostThread(postUri);
      setThread(result.thread);
    } catch (error) {
      console.error('Error loading thread:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim() || !session || !postUri || !postCid) return;
    
    setSubmitting(true);
    try {
      const result = await createReply(postUri, postCid, replyText.trim());
      if (result.success) {
        setReplyText("");
        // Reload the thread to show the new reply
        await loadThread();
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold">Comments</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : thread?.replies && thread.replies.length > 0 ? (
            <div className="space-y-4">
              {thread.replies.map((reply, index) => (
                <Comment 
                  key={reply.post.uri || index} 
                  comment={reply} 
                  depth={0}
                  rootPostUri={postUri}
                  rootPostCid={postCid}
                  onThreadUpdate={loadThread}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No comments yet. Be the first to comment!
            </div>
          )}
        </div>
        
        {session && (
          <div className="p-4 border-t border-border">
            <div className="flex space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {session.handle[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-2">
                <Textarea
                  placeholder="Write a comment..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="min-h-[60px] resize-none"
                />
                
                <div className="flex justify-end">
                  <Button 
                    size="sm" 
                    onClick={handleSubmitReply}
                    disabled={!replyText.trim() || submitting}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Reply
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
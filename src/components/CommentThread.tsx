import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, ArrowUp, Send, Loader2 } from "lucide-react";
import { fetchPostThread, createReply, ThreadPost } from "@/lib/bluesky";
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
}

const Comment = ({ comment, depth }: CommentProps) => {
  const maxDepth = 3; // Limit nesting depth
  const indentClass = depth > 0 ? `ml-${Math.min(depth * 4, maxDepth * 4)}` : '';

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
          
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <ArrowUp className="h-3 w-3" />
              <span>{comment.post.likeCount || 0}</span>
            </div>
            {comment.post.replyCount && comment.post.replyCount > 0 && (
              <div className="flex items-center space-x-1">
                <MessageCircle className="h-3 w-3" />
                <span>{comment.post.replyCount}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Render nested replies */}
      {comment.replies && comment.replies.length > 0 && depth < maxDepth && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((reply, index) => (
            <Comment key={reply.post.uri || index} comment={reply} depth={depth + 1} />
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
                <Comment key={reply.post.uri || index} comment={reply} depth={0} />
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
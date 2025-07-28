import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { PostCard } from "@/components/PostCard";
import { TopBar } from "@/components/TopBar";
import { CommentThread } from "@/components/CommentThread";
import { fetchPost, TransformedPost } from "@/lib/bluesky";

export const PostPage = () => {
  const { handle, postId } = useParams<{ handle: string; postId: string }>();
  const { session } = useAuth();
  const [post, setPost] = useState<TransformedPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPost = async () => {
      if (!handle || !postId) return;
      
      try {
        setLoading(true);
        const postData = await fetchPost(handle, postId);
        setPost(postData);
      } catch (error) {
        console.error('Error fetching post:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [handle, postId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title="Post" />
        <div className="container max-w-2xl mx-auto p-4">
          <div className="text-center py-8">Loading post...</div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title="Post Not Found" />
        <div className="container max-w-2xl mx-auto p-4">
          <div className="text-center py-8">Post not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Post" />
      <div className="container max-w-2xl mx-auto p-4">
        <PostCard {...post} />
        <CommentThread 
          postUri={post.postUri!} 
          postCid={post.postCid!} 
          isOpen={true} 
          onClose={() => window.history.back()} 
        />
      </div>
    </div>
  );
};
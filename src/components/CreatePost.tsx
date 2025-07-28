import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { PlusCircle, Send } from 'lucide-react';
import { createPost } from '@/lib/bluesky';
import { toast } from 'sonner';

interface CreatePostProps {
  onPostCreated?: () => void;
}

export const CreatePost = ({ onPostCreated }: CreatePostProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!text.trim()) {
      toast.error('Please enter some text for your post');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await createPost(text.trim());
      
      if (result.success) {
        toast.success('Post created successfully!');
        setText('');
        setIsOpen(false);
        onPostCreated?.();
      } else {
        toast.error('Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Create Post
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Post</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Textarea
              placeholder="What's on your mind?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[120px] resize-none"
              disabled={isSubmitting}
            />
            <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
              <span>{text.length} characters</span>
              <span className="text-xs">Will be posted to Bluesky</span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !text.trim()}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Post
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
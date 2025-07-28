import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { PlusCircle, Send, ImageIcon, X } from 'lucide-react';
import { createPost } from '@/lib/bluesky';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CreatePostProps {
  onPostCreated?: () => void;
  variant?: 'floating' | 'normal';
}

export const CreatePost = ({ onPostCreated, variant = 'normal' }: CreatePostProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!text.trim()) {
      toast.error('Please enter some text for your post');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await createPost(text.trim(), selectedImages.length > 0 ? selectedImages : undefined);
      
      if (result.success) {
        toast.success('Post created successfully!');
        setText('');
        setSelectedImages([]);
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length + selectedImages.length > 4) {
      toast.error('Maximum 4 images allowed');
      return;
    }
    
    setSelectedImages(prev => [...prev, ...imageFiles]);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const triggerButton = variant === 'floating' ? (
    <Button 
      size="lg" 
      className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-primary via-primary-glow to-primary hover:shadow-xl hover:scale-105 transition-all duration-300 border-0"
    >
      <PlusCircle className="h-6 w-6 text-white" />
    </Button>
  ) : (
    <Button className="gap-2 bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300">
      <PlusCircle className="h-4 w-4" />
      Create Post
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
            
            {/* Image Upload */}
            <div className="mt-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || selectedImages.length >= 4}
                className="gap-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
              >
                <ImageIcon className="h-4 w-4" />
                Add Images {selectedImages.length > 0 && `(${selectedImages.length}/4)`}
              </Button>
            </div>

            {/* Image Preview */}
            {selectedImages.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                {selectedImages.map((file, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded-md border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
              <span>{text.length} characters</span>
              <span className="text-xs">
                {selectedImages.length > 0 && 'Images will be uploaded • '}
                Posted to Bluesky
              </span>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setText('');
                setSelectedImages([]);
              }}
              disabled={isSubmitting}
              className="hover:bg-muted/50 transition-colors duration-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !text.trim()}
              className="gap-2 bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90 text-white shadow-md hover:shadow-lg transition-all duration-300 border-0"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
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
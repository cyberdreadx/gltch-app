import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CommunityHashtag {
  id: string;
  hashtag: string;
  boost_factor: number;
  created_at: string;
}

interface CommunityHashtagsProps {
  communityId: string;
}

export function CommunityHashtags({ communityId }: CommunityHashtagsProps) {
  const [hashtags, setHashtags] = useState<CommunityHashtag[]>([]);
  const [newHashtag, setNewHashtag] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchHashtags();
  }, [communityId]);

  const fetchHashtags = async () => {
    try {
      const { data, error } = await supabase
        .from('community_hashtags')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHashtags(data || []);
    } catch (error) {
      console.error('Error fetching hashtags:', error);
      toast.error("Failed to load hashtags");
    } finally {
      setLoading(false);
    }
  };

  const addHashtag = async () => {
    if (!newHashtag.trim()) return;
    
    const hashtag = newHashtag.trim().replace('#', '').toLowerCase();
    
    setAdding(true);
    try {
      const { data, error } = await supabase
        .from('community_hashtags')
        .insert({
          community_id: communityId,
          hashtag,
          boost_factor: 1.0
        })
        .select()
        .single();

      if (error) throw error;

      setHashtags(prev => [data, ...prev]);
      setNewHashtag("");
      toast.success(`Added hashtag #${hashtag}`);
    } catch (error) {
      console.error('Error adding hashtag:', error);
      toast.error("Failed to add hashtag");
    } finally {
      setAdding(false);
    }
  };

  const removeHashtag = async (hashtagId: string, hashtag: string) => {
    try {
      const { error } = await supabase
        .from('community_hashtags')
        .delete()
        .eq('id', hashtagId);

      if (error) throw error;

      setHashtags(prev => prev.filter(h => h.id !== hashtagId));
      toast.success(`Removed hashtag #${hashtag}`);
    } catch (error) {
      console.error('Error removing hashtag:', error);
      toast.error("Failed to remove hashtag");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-4">Loading hashtags...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Community Hashtags</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Posts with these hashtags will be boosted in your community feed
        </p>
      </div>

      <div className="flex space-x-2">
        <Input
          placeholder="Enter hashtag (without #)"
          value={newHashtag}
          onChange={(e) => setNewHashtag(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addHashtag()}
          className="flex-1"
        />
        <Button 
          onClick={addHashtag} 
          disabled={adding || !newHashtag.trim()}
          size="sm"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {hashtags.map((hashtag) => (
          <div key={hashtag.id} className="flex items-center justify-between p-2 rounded-lg border bg-card">
            <Badge variant="secondary" className="text-sm">
              #{hashtag.hashtag}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => removeHashtag(hashtag.id, hashtag.hashtag)}
              className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
        
        {hashtags.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            No hashtags added yet
          </p>
        )}
      </div>
    </div>
  );
}
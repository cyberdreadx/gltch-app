import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserMinus, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CommunityMember {
  id: string;
  user_id: string;
  joined_at: string;
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
    bluesky_handle: string | null;
  } | null;
}

interface CommunityMemberListProps {
  communityId: string;
}

export function CommunityMemberList({ communityId }: CommunityMemberListProps) {
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, [communityId]);

  const fetchMembers = async () => {
    try {
      // First get the user_communities data
      const { data: memberships, error: membershipError } = await supabase
        .from('user_communities')
        .select('id, user_id, joined_at')
        .eq('community_id', communityId)
        .order('joined_at', { ascending: false });

      if (membershipError) throw membershipError;

      // Then get profile data for each user
      const memberData: CommunityMember[] = [];
      for (const membership of memberships || []) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url, bluesky_handle')
          .eq('user_id', membership.user_id)
          .single();

        memberData.push({
          ...membership,
          profiles: profile
        });
      }

      setMembers(memberData);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (membershipId: string, memberName: string) => {
    try {
      const { error } = await supabase
        .from('user_communities')
        .delete()
        .eq('id', membershipId);

      if (error) throw error;

      setMembers(prev => prev.filter(m => m.id !== membershipId));
      toast.success(`Removed ${memberName} from community`);
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error("Failed to remove member");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-4">Loading members...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Members ({members.length})</h3>
      </div>
      
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {members.map((member) => {
          const displayName = member.profiles?.display_name || member.profiles?.bluesky_handle || 'Unknown User';
          const handle = member.profiles?.bluesky_handle;
          
          return (
            <div key={member.id} className="flex items-center justify-between p-2 rounded-lg border bg-card">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.profiles?.avatar_url || ''} />
                  <AvatarFallback>
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{displayName}</p>
                  {handle && (
                    <p className="text-xs text-muted-foreground">@{handle}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-xs">
                  Member
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => removeMember(member.id, displayName)}
                  className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                >
                  <UserMinus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
        
        {members.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            No members yet
          </p>
        )}
      </div>
    </div>
  );
}
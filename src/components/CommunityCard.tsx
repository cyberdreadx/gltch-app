import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

interface CommunityCardProps {
  name: string;
  description: string;
  members: number;
  iconUrl?: string;
  createdBy?: string;
  isMember?: boolean;
}

export function CommunityCard({ name, description, members, iconUrl, createdBy, isMember }: CommunityCardProps) {
  const { user, isAuthenticated } = useSupabaseAuth();
  const isCreator = isAuthenticated && user?.id && createdBy === user.id;
  return (
    <Link to={`/g/${name}`} className="block">
      <Card className="p-4 bg-card border-border hover:bg-muted/30 transition-colors duration-200 cursor-pointer">
      <div className="flex items-start space-x-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          {iconUrl ? (
            <img src={iconUrl} alt={name} className="w-8 h-8 rounded-full" />
          ) : (
            <span className="text-primary font-bold text-sm">g/</span>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm">g/{name}</h3>
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {description}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{members.toLocaleString()} members</span>
            </div>
            {isAuthenticated ? (
              isCreator ? (
                <Button size="sm" variant="outline" className="h-7 px-3 text-xs bg-primary/10 border-primary/20 text-primary">
                  Owner
                </Button>
              ) : isMember ? (
                <Button size="sm" variant="outline" className="h-7 px-3 text-xs">
                  Joined
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="h-7 px-3 text-xs">
                  Join
                </Button>
              )
            ) : (
              <Button size="sm" variant="outline" className="h-7 px-3 text-xs">
                Join
              </Button>
            )}
          </div>
        </div>
      </div>
      </Card>
    </Link>
  );
}
import { formatTimeAgo } from "@/lib/customFeeds";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { Heart, MessageCircle, Repeat2, UserPlus, AtSign } from "lucide-react";

interface NotificationItemProps {
  notification: Notification;
}

export const NotificationItem = ({ notification }: NotificationItemProps) => {
  const { markAsRead } = useNotifications();

  const handleClick = () => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    // Navigate to post if applicable
    if (notification.post_uri) {
      // TODO: Navigate to post detail page
      console.log('Navigate to post:', notification.post_uri);
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'repost':
        return <Repeat2 className="h-4 w-4 text-green-500" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-purple-500" />;
      case 'mention':
        return <AtSign className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent/50",
        !notification.is_read && "bg-accent/20"
      )}
      onClick={handleClick}
    >
      <div className="flex-shrink-0 relative">
        <Avatar className="h-10 w-10">
          <AvatarImage 
            src={notification.from_user_avatar} 
            alt={notification.from_user_handle || "User"} 
          />
          <AvatarFallback>
            {(notification.from_user_handle || "U").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border">
          {getIcon()}
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium truncate">
            {notification.title}
          </p>
          {!notification.is_read && (
            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 ml-2" />
          )}
        </div>
        
        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
          {notification.message}
        </p>
        
        <p className="text-xs text-muted-foreground">
          {formatTimeAgo(notification.created_at)}
        </p>
      </div>
    </div>
  );
};
import { Button } from "@/components/ui/button";
import { Menu, Bell, Search } from "lucide-react";

interface TopBarProps {
  title: string;
  onMenuClick?: () => void;
}

export function TopBar({ title, onMenuClick }: TopBarProps) {
  return (
    <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={onMenuClick} className="h-8 w-8 p-0">
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-lg text-foreground">{title}</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative">
            <Bell className="h-5 w-5" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></div>
          </Button>
        </div>
      </div>
    </div>
  );
}
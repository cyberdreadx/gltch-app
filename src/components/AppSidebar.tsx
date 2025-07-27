import { Home, Search, Plus, Mail, User, Moon, Sun, Settings, Hash, Users } from "lucide-react";
import { useTheme } from "next-themes";
import { Link } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navigationItems = [
  { title: "Home", icon: Home, tab: "home" },
  { title: "Discover", icon: Search, tab: "discover" },
  { title: "Create Post", icon: Plus, tab: "post" },
  { title: "Inbox", icon: Mail, tab: "inbox" },
  { title: "Profile", icon: User, tab: "profile" },
];

interface Community {
  name: string;
  display_name: string;
}

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userCommunities: Community[];
  isAuthenticated: boolean;
}

export function AppSidebar({ activeTab, onTabChange, userCommunities, isAuthenticated }: AppSidebarProps) {
  const { state } = useSidebar();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Sidebar className={state === "collapsed" ? "w-14" : "w-60"}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary font-bold text-lg flex items-center justify-center">
            <img 
              src="/lovable-uploads/8e080ef2-fbf6-46cf-94ad-be4a433febf3.png" 
              alt="GLTCH" 
              className={state !== "collapsed" ? "h-10" : "h-8"} 
            />
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => onTabChange(item.tab)}
                    className={`${
                      activeTab === item.tab 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {state !== "collapsed" && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Communities Section */}
        {isAuthenticated && userCommunities.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {state !== "collapsed" && "Communities"}
            </SidebarGroupLabel>
            
            <SidebarGroupContent>
              <SidebarMenu>
                {userCommunities.map((community) => (
                  <SidebarMenuItem key={community.name}>
                    <SidebarMenuButton asChild>
                      <Link to={`/g/${community.name}`} className="hover:bg-muted/50">
                        <Hash className="h-4 w-4" />
                        {state !== "collapsed" && (
                          <span className="truncate">
                            g/{community.name}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>
            {state !== "collapsed" && "Settings"}
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={toggleTheme}>
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {state !== "collapsed" && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, Users, Hash } from "lucide-react";
import { CommunityMemberList } from "./CommunityMemberList";
import { CommunityHashtags } from "./CommunityHashtags";

const communityFormSchema = z.object({
  display_name: z.string().min(1, "Community name is required"),
  description: z.string().max(500, "Description must be 500 characters or less"),
  banner_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  icon_url: z.string().url("Must be a valid URL").optional().or(z.literal(""))
});

type CommunityFormValues = z.infer<typeof communityFormSchema>;

interface Community {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  banner_url: string | null;
  icon_url: string | null;
  member_count: number;
  post_count: number;
  created_at: string;
  created_by: string | null;
}

interface ManageCommunityProps {
  community: Community;
  onUpdate: (updatedCommunity: Community) => void;
  children: React.ReactNode;
}

export function ManageCommunity({ community, onUpdate, children }: ManageCommunityProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CommunityFormValues>({
    resolver: zodResolver(communityFormSchema),
    defaultValues: {
      display_name: community.display_name,
      description: community.description || "",
      banner_url: community.banner_url || "",
      icon_url: community.icon_url || ""
    },
  });

  const onSubmit = async (values: CommunityFormValues) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('communities')
        .update({
          display_name: values.display_name,
          description: values.description || null,
          banner_url: values.banner_url || null,
          icon_url: values.icon_url || null
        })
        .eq('id', community.id)
        .select()
        .single();

      if (error) throw error;

      onUpdate(data);
      toast.success("Community updated successfully!");
      setIsOpen(false);
    } catch (error) {
      console.error('Error updating community:', error);
      toast.error("Failed to update community. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Manage Community</span>
          </DialogTitle>
          <DialogDescription>
            Manage your community settings, members, and moderation.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="settings" className="h-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Members</span>
            </TabsTrigger>
            <TabsTrigger value="hashtags" className="flex items-center space-x-2">
              <Hash className="h-4 w-4" />
              <span>Hashtags</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="settings" className="mt-6 overflow-y-auto max-h-96">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="display_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Community Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter community name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your community..." 
                          className="resize-none" 
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="icon_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon URL (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/icon.png" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="banner_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banner URL (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/banner.png" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsOpen(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="members" className="mt-6 overflow-y-auto max-h-96">
            <CommunityMemberList communityId={community.id} />
          </TabsContent>
          
          <TabsContent value="hashtags" className="mt-6 overflow-y-auto max-h-96">
            <CommunityHashtags communityId={community.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
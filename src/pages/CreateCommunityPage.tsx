import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Users, FileText, Image, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

export function CreateCommunityPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated: isBlueskyAuthenticated } = useAuth();
  const { user, session } = useSupabaseAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    bannerUrl: '',
    iconUrl: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate name (used in URL)
    if (!formData.name.trim()) {
      newErrors.name = 'Community name is required';
    } else if (!/^[a-z0-9-_]+$/.test(formData.name)) {
      newErrors.name = 'Name can only contain lowercase letters, numbers, hyphens, and underscores';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters long';
    } else if (formData.name.length > 30) {
      newErrors.name = 'Name must be less than 30 characters';
    }

    // Validate display name
    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    } else if (formData.displayName.length < 3) {
      newErrors.displayName = 'Display name must be at least 3 characters long';
    } else if (formData.displayName.length > 50) {
      newErrors.displayName = 'Display name must be less than 50 characters';
    }

    // Validate description
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    
    if (!isBlueskyAuthenticated || !user?.id) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create a community",
        variant: "destructive"
      });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Check if community name already exists
      const { data: existingCommunity } = await supabase
        .from('communities')
        .select('id')
        .eq('name', formData.name.toLowerCase())
        .maybeSingle();

      if (existingCommunity) {
        setErrors({ name: 'A community with this name already exists' });
        setIsLoading(false);
        return;
      }

      // Create the community
      const { data, error } = await supabase
        .from('communities')
        .insert({
          name: formData.name.toLowerCase(),
          display_name: formData.displayName || `g/${formData.name}`,
          description: formData.description || null,
          banner_url: formData.bannerUrl || null,
          icon_url: formData.iconUrl || null,
          created_by: user.id, // Using Supabase user ID
          member_count: 1, // Creator is the first member
          post_count: 0
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating community:', error);
        toast({
          title: "Error creating community",
          description: error.message || "Something went wrong. Please try again.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Community created!",
        description: `Welcome to g/${formData.name}! You are now the moderator.`,
      });

      // Navigate to the new community
      navigate(`/g/${formData.name}`);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error creating community",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isBlueskyAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Sign In Required</h2>
          <p className="text-muted-foreground mb-4">You need to sign in to create a community</p>
          <div className="space-y-2">
            <Link to="/">
              <Button variant="outline" className="w-full">
                Go Back
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <Link to="/discover">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Discover
            </Button>
          </Link>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Create a Community</h1>
            <p className="text-muted-foreground mt-1">
              Start your own community on GLTCH and bring people together around shared interests.
            </p>
          </div>

          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Community Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Community Name</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                    g/
                  </span>
                  <Input
                    id="name"
                    type="text"
                    placeholder="awesome-community"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`pl-8 ${errors.name ? 'border-destructive' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  This will be your community's URL: /g/{formData.name || 'your-community'}
                </p>
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Awesome Community"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  className={errors.displayName ? 'border-destructive' : ''}
                  disabled={isLoading}
                />
                {errors.displayName && (
                  <p className="text-sm text-destructive">{errors.displayName}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  This is how your community name will appear to users
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Description</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Tell people what your community is about..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className={`min-h-[100px] ${errors.description ? 'border-destructive' : ''}`}
                  disabled={isLoading}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {formData.description.length}/500 characters
                </p>
              </div>

              {/* Optional: Banner and Icon URLs */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bannerUrl" className="flex items-center space-x-2">
                    <Image className="h-4 w-4" />
                    <span>Banner URL (Optional)</span>
                  </Label>
                  <Input
                    id="bannerUrl"
                    type="url"
                    placeholder="https://example.com/banner.jpg"
                    value={formData.bannerUrl}
                    onChange={(e) => handleInputChange('bannerUrl', e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iconUrl" className="flex items-center space-x-2">
                    <Upload className="h-4 w-4" />
                    <span>Icon URL (Optional)</span>
                  </Label>
                  <Input
                    id="iconUrl"
                    type="url"
                    placeholder="https://example.com/icon.jpg"
                    value={formData.iconUrl}
                    onChange={(e) => handleInputChange('iconUrl', e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex space-x-3 pt-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? "Creating..." : "Create Community"}
                </Button>
                <Link to="/discover">
                  <Button variant="outline" disabled={isLoading}>
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
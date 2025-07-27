import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { login } from "@/lib/atproto";
import { supabase } from "@/integrations/supabase/client";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AuthDialog = ({ open, onOpenChange, onSuccess }: AuthDialogProps) => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("signin");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;

    setIsLoading(true);
    try {
      await login(identifier, password);
      toast({
        title: "Success",
        description: "Signed in successfully!",
      });
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName) {
      toast({
        title: "Error",
        description: "Please fill in email, password, and display name",
        variant: "destructive",
      });
      return;
    }

    if (!identifier) {
      toast({
        title: "Error", 
        description: "Please provide a Bluesky handle for your new account",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // First, create Bluesky account
      const { data: blueskyData, error: blueskyError } = await supabase.functions.invoke('create-bluesky-account', {
        body: {
          handle: identifier,
          email: email,
          password: password,
        }
      });

      if (blueskyError || !blueskyData.success) {
        throw new Error(blueskyData?.error || 'Failed to create Bluesky account');
      }

      // Then sign up with Supabase
      const redirectUrl = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            display_name: displayName,
            bluesky_handle: blueskyData.handle,
            bluesky_did: blueskyData.did,
            is_gltch_native: true,
            bluesky_access_jwt: blueskyData.accessJwt,
            bluesky_refresh_jwt: blueskyData.refreshJwt,
          }
        }
      });

      if (error) {
        throw error;
      }

      if (data.user && !data.session) {
        // Show confirmation message in the dialog
        setConfirmationEmail(email);
        setShowConfirmation(true);
      } else if (data.session) {
        toast({
          title: "Success",
          description: "GLTCH and Bluesky accounts created successfully!",
        });
        onSuccess();
        onOpenChange(false);
        resetForm();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create accounts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setIdentifier("");
    setPassword("");
    setEmail("");
    setDisplayName("");
    setShowConfirmation(false);
    setConfirmationEmail("");
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {showConfirmation ? "Check Your Email" : "Welcome to GLTCH"}
          </DialogTitle>
        </DialogHeader>
        
        {showConfirmation ? (
          <div className="space-y-4 text-center">
            <div className="text-6xl">📧</div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">We sent you a confirmation link</h3>
              <p className="text-muted-foreground">
                Check your email at <span className="font-medium">{confirmationEmail}</span> and click the link to complete your registration.
              </p>
            </div>
            <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
              <p>Didn't receive the email? Check your spam folder or try signing up again.</p>
            </div>
            <Button 
              onClick={() => handleDialogChange(false)} 
              variant="outline" 
              className="w-full"
            >
              Close
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-identifier">Bluesky Handle or Email</Label>
                  <Input
                    id="signin-identifier"
                    type="text"
                    placeholder="username or user@email.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter your Bluesky handle (without .bsky.social) or email address
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-handle">Choose Your Bluesky Handle</Label>
                  <Input
                    id="signup-handle"
                    type="text"
                    placeholder="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll create a new Bluesky account for you with this handle (username.bsky.social)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-displayname">Display Name</Label>
                  <Input
                    id="signup-displayname"
                    type="text"
                    placeholder="Your Display Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
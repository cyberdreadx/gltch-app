import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { HashtagPage } from "./pages/HashtagPage";
import { CommunityPage } from "./pages/CommunityPage";
import { CreateCommunityPage } from "./pages/CreateCommunityPage";
import { UserProfilePage } from "./pages/UserProfilePage";
import { PostPage } from "./pages/PostPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/hashtag/:hashtag" element={<HashtagPage />} />
          <Route path="/g/:communityName" element={<CommunityPage />} />
          <Route path="/create-community" element={<CreateCommunityPage />} />
          <Route path="/user/:handle" element={<UserProfilePage />} />
          <Route path="/user/:handle/post/:postId" element={<PostPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

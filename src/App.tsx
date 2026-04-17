import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import Profile from "./pages/Profile.tsx";
import OfferDetail from "./pages/OfferDetail.tsx";
import Messages from "./pages/Messages.tsx";
import ReviewSubmit from "./pages/ReviewSubmit.tsx";
import MeRedirect from "./pages/MeRedirect.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/r/:username" element={<ReviewSubmit />} />

            <Route path="/me" element={<MeRedirect />} />
            <Route path="/messages" element={<AppLayout><Messages /></AppLayout>} />

            <Route path="/@:username" element={<AppLayout><Profile /></AppLayout>} />
            <Route path="/@:username/:slug" element={<AppLayout><OfferDetail /></AppLayout>} />
            <Route path="/:username" element={<AppLayout><Profile /></AppLayout>} />
            <Route path="/:username/:slug" element={<AppLayout><OfferDetail /></AppLayout>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

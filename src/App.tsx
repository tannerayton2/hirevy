import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index.tsx";
import Landing from "./pages/Landing.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import SignUp from "./pages/SignUp.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";

import Profile from "./pages/Profile.tsx";
import OfferDetail from "./pages/OfferDetail.tsx";
import Messages from "./pages/Messages.tsx";
import ReviewSubmit from "./pages/ReviewSubmit.tsx";
import ProofReviewSubmit from "./pages/ProofReviewSubmit.tsx";
import MeRedirect from "./pages/MeRedirect.tsx";
import ProfileEdit from "./pages/ProfileEdit.tsx";
import OfferEditor from "./pages/OfferEditor.tsx";
import Admin from "./pages/Admin.tsx";
import OutboundRedirect from "./pages/OutboundRedirect.tsx";
import ProfileOffers from "./pages/ProfileOffers.tsx";
import Marketplace from "./pages/Marketplace.tsx";
import SubmitReview from "./pages/SubmitReview.tsx";
import Following from "./pages/Following.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/explore" element={<Index />} />
            <Route path="/marketplace" element={<AppLayout><Marketplace /></AppLayout>} />
            <Route path="/submit-review" element={<AppLayout><SubmitReview /></AppLayout>} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/r/:username" element={<ReviewSubmit />} />
            <Route path="/r/:username/proof" element={<ProofReviewSubmit />} />


            <Route path="/me" element={<MeRedirect />} />
            <Route path="/out/:offerId" element={<OutboundRedirect />} />
            <Route path="/messages" element={<AppLayout><Messages /></AppLayout>} />

            {/* Settings — must be above the catch-all username routes */}
            <Route path="/settings/profile" element={<AppLayout><ProfileEdit /></AppLayout>} />
            <Route path="/settings/following" element={<AppLayout><Following /></AppLayout>} />
            <Route path="/settings/offers/new" element={<AppLayout><OfferEditor /></AppLayout>} />
            <Route path="/settings/offers/:offerId" element={<AppLayout><OfferEditor /></AppLayout>} />

            <Route path="/admin" element={<AppLayout><Admin /></AppLayout>} />

            <Route path="/coach/:username" element={<AppLayout><Profile /></AppLayout>} />

            <Route path="/@:username" element={<AppLayout><Profile /></AppLayout>} />
            <Route path="/@:username/offers" element={<AppLayout><ProfileOffers /></AppLayout>} />
            <Route path="/@:username/:slug" element={<AppLayout><OfferDetail /></AppLayout>} />
            <Route path="/:username" element={<AppLayout><Profile /></AppLayout>} />
            <Route path="/:username/offers" element={<AppLayout><ProfileOffers /></AppLayout>} />
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

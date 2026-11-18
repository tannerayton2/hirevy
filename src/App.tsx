import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { isNativeApp } from "@/lib/platform";
import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index.tsx";
import Landing from "./pages/Landing.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import SignUp from "./pages/SignUp.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import VerifyReview from "./pages/VerifyReview.tsx";

import Profile from "./pages/Profile.tsx";
import OfferDetail from "./pages/OfferDetail.tsx";
import Messages from "./pages/Messages.tsx";
import ReviewSubmit from "./pages/ReviewSubmit.tsx";
import ProofReviewSubmit from "./pages/ProofReviewSubmit.tsx";
import MeRedirect from "./pages/MeRedirect.tsx";
import ProfileEdit from "./pages/ProfileEdit.tsx";
import AccountSettings from "./pages/AccountSettings.tsx";
import NotificationSettings from "./pages/NotificationSettings.tsx";
import Notifications from "./pages/Notifications.tsx";
import OfferEditor from "./pages/OfferEditor.tsx";
import Admin from "./pages/Admin.tsx";
import OutboundRedirect from "./pages/OutboundRedirect.tsx";
import ProfileOffers from "./pages/ProfileOffers.tsx";

import SubmitReview from "./pages/SubmitReview.tsx";
import Following from "./pages/Following.tsx";
import Terms from "./pages/Terms.tsx";
import Privacy from "./pages/Privacy.tsx";
import Support from "./pages/Support.tsx";
import HowVerificationWorks from "./pages/HowVerificationWorks.tsx";
import OAuthConsent from "./pages/OAuthConsent.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import ProofPage from "./pages/ProofPage.tsx";
import ProofSettings from "./pages/ProofSettings.tsx";
import ProofCardPage from "./pages/ProofCardPage.tsx";
import ProofLanding from "./pages/ProofLanding.tsx";
import MyCard from "./pages/MyCard.tsx";
import { NetworkGate } from "./components/NetworkGate";
import { NETWORK_PUBLIC } from "./lib/network";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={isNativeApp ? <Navigate to="/auth" replace /> : NETWORK_PUBLIC ? <Landing /> : <Navigate to="/proofcard" replace />} />
            <Route path="/proofcard" element={<ProofLanding />} />
            <Route path="/card" element={<MyCard />} />
            <Route path="/explore" element={<NetworkGate><Index /></NetworkGate>} />
            <Route path="/marketplace" element={<NetworkGate><Navigate to="/explore?tab=offers" replace /></NetworkGate>} />
            <Route path="/submit-review" element={<NetworkGate><AppLayout><SubmitReview /></AppLayout></NetworkGate>} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-review" element={<VerifyReview />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/support" element={<Support />} />
            <Route path="/how-verification-works" element={<HowVerificationWorks />} />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            
            <Route path="/r/:username" element={<ReviewSubmit />} />
            <Route path="/r/:username/proof" element={<ProofReviewSubmit />} />
            <Route path="/p/:id" element={<AppLayout><ProofPage /></AppLayout>} />
            <Route path="/v/:slug" element={<ProofCardPage />} />


            <Route path="/me" element={<MeRedirect />} />
            <Route path="/out/:offerId" element={<OutboundRedirect />} />
            <Route path="/messages" element={<NetworkGate><AppLayout><Messages /></AppLayout></NetworkGate>} />
            <Route path="/notifications" element={<AppLayout><Notifications /></AppLayout>} />

            {/* Settings — must be above the catch-all username routes */}
            <Route path="/settings/profile" element={<AppLayout><ProfileEdit /></AppLayout>} />
            <Route path="/settings/account" element={<AppLayout><AccountSettings /></AppLayout>} />
            <Route path="/settings/proof" element={<Navigate to="/card" replace />} />
            <Route path="/settings/notifications" element={<AppLayout><NotificationSettings /></AppLayout>} />
            <Route path="/settings/following" element={<NetworkGate><AppLayout><Following /></AppLayout></NetworkGate>} />
            <Route path="/settings/offers/new" element={<NetworkGate><AppLayout><OfferEditor /></AppLayout></NetworkGate>} />
            <Route path="/settings/offers/:offerId" element={<NetworkGate><AppLayout><OfferEditor /></AppLayout></NetworkGate>} />

            <Route path="/admin" element={<AppLayout><Admin /></AppLayout>} />

            

            <Route path="/@:username" element={<NetworkGate><AppLayout><Profile /></AppLayout></NetworkGate>} />
            <Route path="/@:username/offers" element={<NetworkGate><AppLayout><ProfileOffers /></AppLayout></NetworkGate>} />
            <Route path="/@:username/:slug" element={<NetworkGate><AppLayout><OfferDetail /></AppLayout></NetworkGate>} />
            <Route path="/:username" element={<NetworkGate><AppLayout><Profile /></AppLayout></NetworkGate>} />
            <Route path="/:username/offers" element={<NetworkGate><AppLayout><ProfileOffers /></AppLayout></NetworkGate>} />
            <Route path="/:username/:slug" element={<NetworkGate><AppLayout><OfferDetail /></AppLayout></NetworkGate>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

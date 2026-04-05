import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { useEffect } from "react";
import { initErrorTracker, stopErrorTracker } from "@/lib/errorTracker";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";
import AdminLayout from "./components/admin/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminEngagement from "./pages/admin/AdminEngagement";
import AdminRewards from "./pages/admin/AdminRewards";
import AdminSystem from "./pages/admin/AdminSystem";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import AdminBeta from "./pages/admin/AdminBeta";
import AdminNotificationCenter from "./pages/admin/AdminNotificationCenter";
import AcceptInvite from "./pages/AcceptInvite";
import BetaRequest from "./pages/BetaRequest";
import BetaAccept from "./pages/BetaAccept";

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse font-display text-xl">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function GlobalErrorTracker() {
  const { session } = useAuth();

  useEffect(() => {
    if (session) {
      initErrorTracker();
      return () => stopErrorTracker();
    }
  }, [session]);

  return null;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <I18nProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <OfflineIndicator />
            <GlobalErrorTracker />
            <FeedbackWidget />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/accept-invite" element={<AcceptInvite />} />
                <Route path="/beta" element={<BetaRequest />} />
                <Route path="/beta/accept" element={<BetaAccept />} />
                <Route path="/admin" element={<AuthGuard><AdminLayout /></AuthGuard>}>
                  <Route index element={<AdminOverview />} />
                  <Route path="students" element={<AdminStudents />} />
                  <Route path="engagement" element={<AdminEngagement />} />
                  <Route path="rewards" element={<AdminRewards />} />
                  <Route path="system" element={<AdminSystem />} />
                  <Route path="messages" element={<AdminMessages />} />
                  <Route path="notifications" element={<AdminNotificationCenter />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="audit" element={<AdminAuditLogs />} />
                  <Route path="beta" element={<AdminBeta />} />
                </Route>
                <Route path="/" element={<AuthGuard><Index /></AuthGuard>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </I18nProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

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
import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { initErrorTracker, stopErrorTracker } from "@/lib/errorTracker";

const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const DeploymentHealth = lazy(() => import("./pages/DeploymentHealth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminStudents = lazy(() => import("./pages/admin/AdminStudents"));
const AdminEngagement = lazy(() => import("./pages/admin/AdminEngagement"));
const AdminRewards = lazy(() => import("./pages/admin/AdminRewards"));
const AdminSystem = lazy(() => import("./pages/admin/AdminSystem"));
const AdminMessages = lazy(() => import("./pages/admin/AdminMessages"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminAuditLogs = lazy(() => import("./pages/admin/AdminAuditLogs"));
const AdminBeta = lazy(() => import("./pages/admin/AdminBeta"));
const AdminNotificationCenter = lazy(() => import("./pages/admin/AdminNotificationCenter"));
const AdminDnsStatus = lazy(() => import("./pages/admin/AdminDnsStatus"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const BetaRequest = lazy(() => import("./pages/BetaRequest"));
const BetaAccept = lazy(() => import("./pages/BetaAccept"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const AcceptEducatorInvite = lazy(() => import("./pages/AcceptEducatorInvite"));
const AcceptEducatorParentInvite = lazy(() => import("./pages/AcceptEducatorParentInvite"));

const queryClient = new QueryClient();

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse font-display text-xl">Loading...</div>
    </div>
  );
}

function AuthGuard({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return <RouteFallback />;
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
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/health" element={<DeploymentHealth />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/accept-invite" element={<AcceptInvite />} />
                  <Route path="/beta" element={<BetaRequest />} />
                  <Route path="/beta/accept" element={<BetaAccept />} />
                  <Route path="/unsubscribe" element={<Unsubscribe />} />
                  <Route path="/accept-educator-invite" element={<AcceptEducatorInvite />} />
                  <Route
                    path="/accept-educator-parent-invite"
                    element={<AcceptEducatorParentInvite />}
                  />
                  <Route
                    path="/admin"
                    element={
                      <AuthGuard>
                        <AdminLayout />
                      </AuthGuard>
                    }
                  >
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
                    <Route path="dns" element={<AdminDnsStatus />} />
                  </Route>
                  <Route
                    path="/"
                    element={
                      <AuthGuard>
                        <Index />
                      </AuthGuard>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </I18nProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

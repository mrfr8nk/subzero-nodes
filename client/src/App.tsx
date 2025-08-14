import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import VerifyEmail from "@/pages/verify-email";
import EmailVerificationPending from "@/pages/email-verification-pending";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import ResendVerification from "@/pages/resend-verification";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Wallet from "@/pages/wallet";
import Referrals from "@/pages/referrals";
import Deployments from "@/pages/deployments";
import DeploymentDetails from "@/pages/deployment-details";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminGitHub from "@/pages/admin-github";
import AdminApiTest from "@/pages/admin-api-test";
import AccountSettings from "@/pages/account-settings";
import UserSettings from "@/pages/user-settings";
import Maintenance from "@/pages/maintenance";
import Chat from "@/pages/chat";
import Navbar from "@/components/navbar";
import Premium from "@/pages/premium";

function Router() {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const [location] = useLocation();
  
  // Check maintenance mode status
  const { data: maintenanceStatus } = useQuery<{maintenanceMode: boolean; canBypass: boolean}>({
    queryKey: ['/api/maintenance/status'],
    staleTime: 30000, // Check every 30 seconds
    retry: true,
  });

  // Show maintenance page if maintenance mode is enabled and user cannot bypass
  // BUT allow access to admin login page during maintenance
  if (maintenanceStatus?.maintenanceMode && !maintenanceStatus?.canBypass && location !== '/admin/login') {
    return <Maintenance />;
  }

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show unauthenticated routes if not logged in
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/email-verification-pending" component={EmailVerificationPending} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/resend-verification" component={ResendVerification} />
        <Route path="/admin/login" component={AdminLogin} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <>
      <Navbar />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/wallet" component={Wallet} />
        <Route path="/referrals" component={Referrals} />
        <Route path="/premium" component={Premium} />
        <Route path="/deployments" component={Deployments} />
        <Route path="/deployments/:id" component={DeploymentDetails} />
        <Route path="/user-settings" component={UserSettings} />
        <Route path="/account-settings" component={AccountSettings} />
        <Route path="/chat" component={Chat} />
        {isAdmin && <Route path="/admin/dashboard" component={AdminDashboard} />}
        {isAdmin && <Route path="/admin/github" component={AdminGitHub} />}
        {isAdmin && <Route path="/admin/api-test" component={AdminApiTest} />}
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="subzero-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

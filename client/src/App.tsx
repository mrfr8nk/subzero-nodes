import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
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
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Wallet from "@/pages/wallet";
import Referrals from "@/pages/referrals";
import Deployments from "@/pages/deployments";
import Navbar from "@/components/navbar";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/email-verification-pending" component={EmailVerificationPending} />
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
        <Route path="/deployments" component={Deployments} />
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

import { useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { SiWhatsapp, SiGoogle } from "react-icons/si";
import { ArrowRight, CheckCircle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export default function Login() {
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  // Check for auth error in URL
  const urlParams = new URLSearchParams(window.location.search);
  const authError = urlParams.get('error');

  useEffect(() => {
    if (authError === 'auth_failed') {
      toast({
        title: "Authentication Failed",
        description: "There was an error signing you in with Google. Please try again.",
        variant: "destructive",
      });
    }
  }, [authError, toast]);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2 sm:space-x-3 group">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <SiWhatsapp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-wide">SUBZERO-MD</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Bot Platform</span>
              </div>
            </Link>
            
            <div className="flex items-center space-x-2 sm:space-x-3">
              <ThemeToggle />
              <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors text-sm sm:text-base">
                <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Back to Home</span>
                <span className="sm:hidden">Back</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <div className="w-full max-w-lg">

        {/* Login Card */}
        <Card className="shadow-2xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
          <CardHeader className="text-center pb-8 pt-12">
            <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              Welcome Back
            </CardTitle>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Sign in to access your bot deployment dashboard
            </p>
          </CardHeader>
          <CardContent className="space-y-6 px-4 sm:px-8 pb-8">
            <Button
              onClick={handleGoogleLogin}
              size="lg"
              className="w-full bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-300 dark:hover:border-gray-500 h-12 sm:h-14 rounded-xl font-semibold text-base sm:text-lg shadow-lg group"
              data-testid="button-google-signin"
            >
              <SiGoogle className="w-5 h-5 sm:w-6 sm:h-6 mr-3 sm:mr-4 text-red-500 group-hover:scale-110 transition-transform" />
              Continue with Google
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-auto group-hover:translate-x-1 transition-transform" />
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400">
                  Secure authentication powered by Google
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-4 sm:space-x-6 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  <span>100 free coins</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  <span>Instant setup</span>
                </div>
              </div>
              
              <div className="text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                By signing in, you agree to our{" "}
                <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  Privacy Policy
                </a>
              </div>
            </div>

            <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                New to SUBZERO-MD?
              </p>
              <Link href="/signup">
                <Button variant="outline" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/30">
                  Create Account
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
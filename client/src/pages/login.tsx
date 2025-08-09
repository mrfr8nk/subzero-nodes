import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { SiGoogle } from "react-icons/si";
import { ArrowRight, CheckCircle, ArrowLeft, Mail, Eye, EyeOff, Lock, Bot } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string>("");

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
    } else if (authError === 'multiple_accounts') {
      toast({
        title: "Multiple Accounts Detected",
        description: "Only one account is allowed per IP address. If you believe this is an error, please contact support.",
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

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/local/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Login Successful",
          description: "Welcome back! Redirecting to your dashboard.",
        });
        // Reload to trigger auth state update
        window.location.href = "/dashboard";
      } else {
        // Check if it's an email verification error
        if (result.message === "Please verify your email before signing in") {
          setUnverifiedEmail(data.email);
          setShowResendVerification(true);
        }
        
        toast({
          title: "Login Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login Error",
        description: "Failed to sign in. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: unverifiedEmail }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Verification Email Sent",
          description: result.message,
        });
        setShowResendVerification(false);
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Resend verification error:", error);
      toast({
        title: "Error",
        description: "Failed to resend verification email. Please try again.",
        variant: "destructive",
      });
    }
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
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform p-1">
                <img 
                  src="/icon.svg" 
                  alt="SUBZERO-MD Bot" 
                  className="w-full h-full rounded object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const botIcon = e.currentTarget.nextElementSibling as HTMLElement;
                    if (botIcon) botIcon.style.display = 'block';
                  }}
                />
                <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white hidden" />
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
        <Card className="shadow-2xl border-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
          <CardHeader className="text-center pb-8 pt-12">
            <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              Welcome Back
            </CardTitle>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Sign in to access your bot deployment dashboard
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6 px-4 sm:px-8 pb-8">
            {/* Email Verification Alert */}
            {showResendVerification && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Email Verification Required
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Your account needs to be verified before you can sign in. Check your email for a verification link or request a new one.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleResendVerification}
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    data-testid="button-resend-verification"
                  >
                    Resend Verification Email
                  </Button>
                  <Button
                    onClick={() => setShowResendVerification(false)}
                    size="sm"
                    variant="outline"
                    className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
                    data-testid="button-dismiss-verification-alert"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

            {/* Email/Password Login Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300">Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <Input
                            {...field}
                            type="email"
                            placeholder="Enter your email"
                            className="pl-10 h-12 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
                            disabled={isSubmitting}
                            data-testid="input-email"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className="pl-10 pr-10 h-12 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
                            disabled={isSubmitting}
                            data-testid="input-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Link href="/forgot-password">
                    <Button 
                      type="button" 
                      variant="link" 
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-0 h-auto font-medium"
                      data-testid="link-forgot-password"
                    >
                      Forgot password?
                    </Button>
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={isSubmitting}
                  data-testid="button-sign-in"
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Lock className="w-5 h-5" />
                      <span>Sign In</span>
                      <ArrowRight className="w-5 h-5 ml-auto" />
                    </div>
                  )}
                </Button>
              </form>
            </Form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google Sign In */}
            <Button
              onClick={handleGoogleLogin}
              size="lg"
              className="w-full bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-300 dark:hover:border-gray-500 h-12 rounded-xl font-semibold shadow-lg group"
              data-testid="button-google-signin"
            >
              <SiGoogle className="w-5 h-5 mr-3 text-red-500 group-hover:scale-110 transition-transform" />
              Continue with Google
            </Button>

            {/* Benefits */}
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-4 sm:space-x-6 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  <span>10 free coins</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  <span>Instant setup</span>
                </div>
              </div>
              
              <div className="text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                By signing in, you agree to our{" "}
                <a href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  Privacy Policy
                </a>
              </div>
            </div>

            <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  New to SUBZERO-NODES?
                </p>
                <Link href="/signup">
                  <Button variant="outline" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/30" data-testid="link-create-account">
                    Create Account
                  </Button>
                </Link>
              </div>
              
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Can't sign in? Need to verify your email?
                </p>
                <Link href="/resend-verification">
                  <Button variant="link" className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 p-0 h-auto text-xs font-medium" data-testid="link-resend-verification">
                    Resend Verification Email
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { SiGoogle, SiGithub } from "react-icons/si";
import { Mail, Eye, EyeOff, UserPlus, ArrowLeft, Bot } from "lucide-react";
import { getDeviceFingerprint } from "@/lib/deviceFingerprint";

const signupSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be less than 20 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function Signup() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available?: boolean;
    message?: string;
  }>({ checking: false });
  const [deviceLimitError, setDeviceLimitError] = useState<string>("");

  // Get referral code from URL
  const urlParams = new URLSearchParams(window.location.search);
  const referralCode = urlParams.get('ref');

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleGoogleLogin = () => {
    // Include referral code in Google OAuth state if available
    if (referralCode) {
      window.location.href = `/api/auth/google?ref=${referralCode}`;
    } else {
      window.location.href = "/api/auth/google";
    }
  };

  const handleGitHubLogin = () => {
    // Include referral code in GitHub OAuth state if available
    if (referralCode) {
      window.location.href = `/api/auth/github?ref=${referralCode}`;
    } else {
      window.location.href = "/api/auth/github";
    }
  };

  // Check username availability with debouncing
  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameStatus({ checking: false });
      return;
    }

    setUsernameStatus({ checking: true });
    
    try {
      const response = await fetch('/api/auth/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setUsernameStatus({
          checking: false,
          available: result.available,
          message: result.available ? 'Username is available' : 'Username is already taken'
        });
      } else {
        setUsernameStatus({
          checking: false,
          available: false,
          message: result.message || 'Error checking username'
        });
      }
    } catch (error) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: 'Error checking username availability'
      });
    }
  };

  // Check device limit before signup
  const checkDeviceLimit = async () => {
    try {
      const deviceFingerprint = await getDeviceFingerprint();
      const response = await fetch('/api/auth/check-device-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceFingerprint })
      });
      
      const result = await response.json();
      
      if (!result.allowed) {
        setDeviceLimitError(`Only ${result.maxAllowed} account(s) allowed per device. You already have ${result.currentCount} account(s).`);
        return false;
      }
      
      setDeviceLimitError("");
      return true;
    } catch (error) {
      console.error('Error checking device limit:', error);
      return true; // Allow signup if check fails
    }
  };

  // Debounced username checking
  useEffect(() => {
    const username = form.watch('username');
    if (!username) return;

    const timeoutId = setTimeout(() => {
      checkUsernameAvailability(username);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [form.watch('username')]);

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    
    // Check device limit first
    const deviceAllowed = await checkDeviceLimit();
    if (!deviceAllowed) {
      setIsLoading(false);
      return;
    }

    // Check if username is available
    if (!usernameStatus.available) {
      toast({
        title: "Username Error",
        description: "Please choose an available username",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    try {
      // Get device fingerprint before signup
      const deviceFingerprint = await getDeviceFingerprint();
      
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        email: data.email,
        password: data.password,
        referralCode: referralCode || undefined,
        deviceFingerprint,
      };

      const response = await fetch("/api/auth/local/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Account Created",
          description: "Please check your email to verify your account before signing in.",
        });
        // Redirect to email verification pending page
        setTimeout(() => {
          setLocation(`/email-verification-pending?email=${encodeURIComponent(data.email)}`);
        }, 1000);
      } else {
        const error = await response.json();
        toast({
          title: "Signup Failed",
          description: error.message || "Something went wrong",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
                  alt="SUBZERO NODES" 
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
                <span className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white tracking-wide">SUBZERO NODES</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">WhatsApp Bot Platform</span>
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

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <div className="w-full max-w-lg">
          {/* Signup Card */}
          <Card className="shadow-2xl border-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-4 sm:pb-6 px-4 sm:px-6">
              <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">Join SUBZERO NODES</CardTitle>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">Deploy SUBZERO-MD WhatsApp bots in minutes</p>
              {referralCode && (
                <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                    🎉 Referral bonus: <span className="font-bold">{referralCode}</span>
                  </p>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6">
              {/* Google Sign Up Button */}
              <Button
                onClick={handleGoogleLogin}
                className="w-full bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 h-12 text-base font-medium shadow-sm"
                variant="outline"
                data-testid="button-google-signup"
              >
                <SiGoogle className="w-5 h-5 mr-3 text-red-500" />
                Continue with Google
              </Button>

              {/* GitHub Sign Up Button */}
              <Button
                onClick={handleGitHubLogin}
                className="w-full bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 h-12 text-base font-medium shadow-sm"
                variant="outline"
                data-testid="button-github-signup"
              >
                <SiGithub className="w-5 h-5 mr-3 text-gray-900 dark:text-white" />
                Continue with GitHub
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300 dark:border-slate-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white dark:bg-slate-900 px-4 text-gray-500 dark:text-gray-400 font-medium">Or sign up with email</span>
                </div>
              </div>

              {/* Device Limit Error */}
              {deviceLimitError && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                        Account Limit Reached
                      </h4>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        {deviceLimitError}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Email/Password Form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Darrell"
                              disabled={isLoading}
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Mucheri"
                              disabled={isLoading}
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Username field with availability checking */}
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              placeholder="john_doe"
                              disabled={isLoading}
                              className="h-11 pr-10"
                              data-testid="input-username"
                            />
                            {usernameStatus.checking && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              </div>
                            )}
                            {!usernameStatus.checking && usernameStatus.available !== undefined && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                {usernameStatus.available ? (
                                  <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                                    <span className="text-white text-xs">✓</span>
                                  </div>
                                ) : (
                                  <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                                    <span className="text-white text-xs">✗</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </FormControl>
                        {usernameStatus.message && (
                          <p className={`text-xs ${usernameStatus.available ? 'text-green-600' : 'text-red-600'}`}>
                            {usernameStatus.message}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="subzero@example.com"
                            disabled={isLoading}
                            className="h-11"
                          />
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
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              disabled={isLoading}
                              className="h-11 pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="w-4 h-4 text-gray-500" />
                              ) : (
                                <Eye className="w-4 h-4 text-gray-500" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm your password"
                              disabled={isLoading}
                              className="h-11 pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="w-4 h-4 text-gray-500" />
                              ) : (
                                <Eye className="w-4 h-4 text-gray-500" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium" disabled={isLoading}>
                    <UserPlus className="w-5 h-5 mr-2" />
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </Form>

              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <Link href="/login" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

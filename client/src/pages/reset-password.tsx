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
import { SiWhatsapp } from "react-icons/si";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Get token from URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!token) {
      setTokenError("No reset token provided. Please use the link from your email.");
    }
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      toast({
        title: "Error",
        description: "No reset token found. Please use the link from your email.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          newPassword: data.newPassword,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setResetSuccess(true);
        toast({
          title: "Password Reset Successfully",
          description: result.message,
        });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Reset password error:", error);
      toast({
        title: "Error",
        description: "Failed to reset password. Please try again.",
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
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <SiWhatsapp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">SUBZERO</h1>
                <span className="hidden sm:inline text-gray-500 dark:text-gray-400">•</span>
                <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">Bot Platform</span>
              </div>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl border-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
            <CardHeader className="space-y-4 pb-8">
              <div className="flex items-center justify-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
                  tokenError 
                    ? "bg-gradient-to-r from-red-500 to-red-600"
                    : resetSuccess 
                      ? "bg-gradient-to-r from-green-500 to-green-600"
                      : "bg-gradient-to-r from-blue-500 to-purple-500"
                }`}>
                  {tokenError ? (
                    <AlertCircle className="w-8 h-8 text-white" />
                  ) : resetSuccess ? (
                    <CheckCircle className="w-8 h-8 text-white" />
                  ) : (
                    <Lock className="w-8 h-8 text-white" />
                  )}
                </div>
              </div>
              
              <div className="text-center space-y-2">
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  {tokenError ? "Invalid Reset Link" : resetSuccess ? "Password Reset Successfully" : "Reset Your Password"}
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                  {tokenError 
                    ? "This password reset link is invalid or has expired. Please request a new one."
                    : resetSuccess 
                      ? "Your password has been successfully reset. You can now sign in with your new password."
                      : "Enter your new password to complete the reset process."
                  }
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {tokenError ? (
                <div className="text-center space-y-4">
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {tokenError}
                    </p>
                  </div>
                  
                  <div className="flex flex-col space-y-3">
                    <Link href="/forgot-password">
                      <Button className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700" data-testid="link-request-new-reset">
                        Request New Reset Link
                      </Button>
                    </Link>
                    
                    <Link href="/login">
                      <Button variant="ghost" className="w-full" data-testid="link-back-to-sign-in">
                        Back to Sign In
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : resetSuccess ? (
                <div className="text-center space-y-4">
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Your password has been successfully updated. You can now sign in with your new password.
                    </p>
                  </div>
                  
                  <Link href="/login">
                    <Button className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700" data-testid="link-sign-in">
                      Sign In Now
                    </Button>
                  </Link>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-300">New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                              <Input
                                {...field}
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your new password"
                                className="pl-10 pr-10 h-12 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
                                disabled={isLoading}
                                data-testid="input-new-password"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                data-testid="button-toggle-password-visibility"
                              >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
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
                          <FormLabel className="text-gray-700 dark:text-gray-300">Confirm New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                              <Input
                                {...field}
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm your new password"
                                className="pl-10 pr-10 h-12 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
                                disabled={isLoading}
                                data-testid="input-confirm-password"
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                data-testid="button-toggle-confirm-password-visibility"
                              >
                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                      disabled={isLoading}
                      data-testid="button-reset-password"
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Resetting...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Lock className="w-5 h-5" />
                          <span>Reset Password</span>
                        </div>
                      )}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
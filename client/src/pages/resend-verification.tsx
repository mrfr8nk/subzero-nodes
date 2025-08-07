import { useState } from "react";
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
import { SiWhatsapp } from "react-icons/si";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

const resendVerificationSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ResendVerificationFormData = z.infer<typeof resendVerificationSchema>;

export default function ResendVerification() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<ResendVerificationFormData>({
    resolver: zodResolver(resendVerificationSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ResendVerificationFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setEmailSent(true);
        toast({
          title: "Verification Email Sent",
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
      console.error("Resend verification error:", error);
      toast({
        title: "Error",
        description: "Failed to send verification email. Please try again.",
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
                <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <Mail className="w-8 h-8 text-white" />
                </div>
              </div>
              
              <div className="text-center space-y-2">
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  Resend Verification Email
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                  Enter your email address and we'll send you a new verification link to activate your account.
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {emailSent ? (
                <div className="text-center space-y-6">
                  <div className="flex items-center justify-center">
                    <CheckCircle className="w-16 h-16 text-green-500" />
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Verification Email Sent
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      We've sent a new verification email to your address. 
                      Please check your inbox and click the verification link to activate your account.
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        <strong>Note:</strong> The verification link will expire in 24 hours. 
                        If you don't see the email, check your spam folder.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-3">
                    <Button
                      onClick={() => {
                        setEmailSent(false);
                        form.reset();
                      }}
                      variant="outline"
                      className="w-full"
                      data-testid="button-send-another-email"
                    >
                      Send Another Email
                    </Button>
                    
                    <Link href="/login">
                      <Button className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700" data-testid="link-go-to-login">
                        Go to Sign In
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                                  placeholder="Enter your email address"
                                  className="pl-10 h-12 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 focus:border-amber-500 dark:focus:border-amber-400"
                                  disabled={isLoading}
                                  data-testid="input-email"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <Mail className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                              About Email Verification
                            </h4>
                            <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                              <li>• Your account must be verified before you can sign in</li>
                              <li>• Check your spam/junk folder if you don't see the email</li>
                              <li>• The verification link expires after 24 hours</li>
                              <li>• You can request a new verification email anytime</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                        disabled={isLoading}
                        data-testid="button-resend-verification"
                      >
                        {isLoading ? (
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Sending...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <Mail className="w-5 h-5" />
                            <span>Resend Verification Email</span>
                          </div>
                        )}
                      </Button>
                    </form>
                  </Form>

                  <div className="text-center">
                    <Link href="/login">
                      <Button variant="ghost" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300" data-testid="link-back-to-sign-in">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Sign In
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
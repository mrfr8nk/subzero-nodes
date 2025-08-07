import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { SiWhatsapp } from "react-icons/si";
import { Mail, RefreshCw, AlertTriangle, CheckCircle, ArrowLeft } from "lucide-react";

export default function EmailVerificationPending() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isResending, setIsResending] = useState(false);
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    // Get email from URL params or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const emailFromUrl = urlParams.get('email');
    const storedEmail = localStorage.getItem('pendingVerificationEmail');
    
    if (emailFromUrl) {
      setEmail(emailFromUrl);
      localStorage.setItem('pendingVerificationEmail', emailFromUrl);
    } else if (storedEmail) {
      setEmail(storedEmail);
    }
  }, []);

  const handleResendVerification = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Email address not found. Please try signing up again.",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        toast({
          title: "Verification Email Sent",
          description: "Please check your email for a new verification link. Don't forget to check your spam folder!",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Failed to Resend",
          description: error.message || "Could not resend verification email.",
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
      setIsResending(false);
    }
  };

  const handleBackToSignup = () => {
    localStorage.removeItem('pendingVerificationEmail');
    setLocation('/signup');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-3 text-3xl font-bold text-gray-900 dark:text-white group">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <SiWhatsapp className="w-7 h-7 text-white" />
            </div>
            <div className="text-left">
              <span>SUBZERO-MD</span>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-normal">Bot Deployment Platform</div>
            </div>
          </Link>
        </div>

        {/* Verification Pending Card */}
        <Card className="shadow-2xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
          <CardHeader className="text-center pb-4">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-950/50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Check Your Email
            </CardTitle>
            <div className="text-gray-600 dark:text-gray-400 space-y-2">
              <p className="text-sm">
                We've sent a verification link to:
              </p>
              <p className="font-semibold text-blue-600 dark:text-blue-400 break-all">
                {email || 'your email address'}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 space-y-3">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Click the verification link in your email
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    This will activate your account and redirect you to login
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
                    Check your spam folder
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Sometimes verification emails end up in spam or junk folders
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <Button
                onClick={handleResendVerification}
                disabled={isResending || !email}
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 h-11"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Resend Verification Email
                  </>
                )}
              </Button>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleBackToSignup}
                  className="flex-1 dark:border-gray-600 dark:hover:bg-gray-800"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Signup
                </Button>
                <Link href="/login" className="flex-1">
                  <Button variant="outline" className="w-full dark:border-gray-600 dark:hover:bg-gray-800">
                    Already verified? Sign In
                  </Button>
                </Link>
              </div>
            </div>

            {/* Help Text */}
            <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Having trouble? Contact our{' '}
                <a href="mailto:support@subzero-md.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                  support team
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
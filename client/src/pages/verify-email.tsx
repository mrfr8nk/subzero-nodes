import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, RefreshCw, Mail, Bot } from "lucide-react";

export default function VerifyEmail() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [isResending, setIsResending] = useState(false);
  
  // Get token from URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const email = urlParams.get('email'); // For resend functionality

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    // Verify the token
    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`);
        
        if (response.ok) {
          setStatus('success');
          toast({
            title: "Email Verified!",
            description: "Your account has been activated. You can now sign in.",
          });
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            setLocation('/login');
          }, 3000);
        } else {
          const error = await response.json();
          if (error.message?.includes('expired')) {
            setStatus('expired');
          } else {
            setStatus('error');
          }
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
      }
    };

    verifyToken();
  }, [token, toast, setLocation]);

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
          description: "Please check your email for a new verification link.",
        });
        setStatus('loading');
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

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <>
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">Verifying Email...</CardTitle>
            <p className="text-gray-600 text-center">Please wait while we verify your email address.</p>
          </>
        );
      
      case 'success':
        return (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-center text-green-800">Email Verified!</CardTitle>
            <p className="text-gray-600 text-center">
              Your account has been successfully verified. You will be redirected to the login page shortly.
            </p>
            <div className="mt-6 text-center">
              <Button 
                onClick={() => setLocation('/login')}
                className="bg-green-600 hover:bg-green-700"
              >
                Continue to Login
              </Button>
            </div>
          </>
        );
      
      case 'expired':
        return (
          <>
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-orange-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-center text-orange-800">Link Expired</CardTitle>
            <p className="text-gray-600 text-center mb-6">
              This verification link has expired. Please request a new one.
            </p>
            <div className="space-y-4">
              {email && (
                <Button
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className="w-full"
                >
                  {isResending ? "Sending..." : "Send New Verification Email"}
                </Button>
              )}
              <Link href="/signup" className="block">
                <Button variant="outline" className="w-full">
                  Back to Sign Up
                </Button>
              </Link>
            </div>
          </>
        );
      
      case 'error':
      default:
        return (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-center text-red-800">Verification Failed</CardTitle>
            <p className="text-gray-600 text-center mb-6">
              The verification link is invalid or has expired. Please try signing up again.
            </p>
            <div className="space-y-4">
              <Link href="/signup" className="block">
                <Button className="w-full">
                  Back to Sign Up
                </Button>
              </Link>
              <Link href="/login" className="block">
                <Button variant="outline" className="w-full">
                  Already Verified? Sign In
                </Button>
              </Link>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-950 dark:to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center p-1">
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
              <Bot className="w-6 h-6 sm:w-7 sm:h-7 text-white hidden" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">SUBZERO-MD</h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">WhatsApp Bot Platform</p>
            </div>
          </div>
        </div>

        {/* Verification Card */}
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
          <CardHeader className="text-center p-6 sm:p-8">
            {renderContent()}
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
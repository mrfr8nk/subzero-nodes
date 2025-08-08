import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/theme-toggle";
import { SiWhatsapp } from "react-icons/si";
import { Settings, Clock } from "lucide-react";

interface MaintenanceInfo {
  message?: string;
  estimatedTime?: string;
  endTime?: string;
}

// Maintenance countdown component
function MaintenanceCountdown({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const distance = end - now;

      if (distance > 0) {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        let countdown = '';
        if (days > 0) countdown += `${days}d `;
        if (hours > 0) countdown += `${hours}h `;
        if (minutes > 0) countdown += `${minutes}m `;
        countdown += `${seconds}s`;

        setTimeLeft(countdown);
      } else {
        setTimeLeft('Maintenance completed');
        // Auto-refresh when countdown reaches zero
        setTimeout(() => window.location.reload(), 2000);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="text-center">
        <p className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
          ⏱️ Estimated time remaining
        </p>
        <p className="text-2xl font-mono font-bold text-blue-900 dark:text-blue-100">
          {timeLeft}
        </p>
        <p className="text-sm text-blue-600 dark:text-blue-300 mt-2">
          Auto-refresh at completion time
        </p>
      </div>
    </div>
  );
}

export default function Maintenance() {
  // Fetch maintenance message from app settings
  const { data: maintenanceInfo } = useQuery<MaintenanceInfo>({
    queryKey: ['/api/maintenance/info'],
    refetchInterval: 30000, // Check every 30 seconds
    retry: true,
  });

  const defaultMessage = "We're currently performing maintenance to improve your experience. We'll be back online shortly.";
  const displayMessage = maintenanceInfo?.message || defaultMessage;

  const refreshPage = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-lg space-y-4">
        {/* Header with Logo and Theme Toggle */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <SiWhatsapp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">SUBZERO-MD</span>
          </div>
          <ThemeToggle />
        </div>

        <Card data-testid="maintenance-card">
          <CardHeader className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                <Settings className="h-8 w-8 text-yellow-600 dark:text-yellow-400 animate-spin" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold" data-testid="title-maintenance">
              Under Maintenance
            </CardTitle>
            <CardDescription className="text-lg">
              We're working to make your experience even better
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Alert data-testid="alert-message">
              <Clock className="h-4 w-4" />
              <AlertDescription className="text-base" data-testid="text-message">
                {displayMessage}
              </AlertDescription>
            </Alert>

            {maintenanceInfo?.endTime && (
              <MaintenanceCountdown endTime={maintenanceInfo.endTime} />
            )}
            
            {maintenanceInfo?.estimatedTime && !maintenanceInfo?.endTime && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Estimated completion: {maintenanceInfo.estimatedTime}
                </AlertDescription>
              </Alert>
            )}

            <div className="text-center space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>We appreciate your patience while we improve our services.</p>
                <p className="mt-2">Expected to be back online soon!</p>
              </div>
              
              <Button 
                onClick={refreshPage}
                variant="outline"
                className="w-full"
                data-testid="button-refresh"
              >
                <Clock className="w-4 h-4 mr-2" />
                Check Again
              </Button>
            </div>

            <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-muted-foreground">
                Follow us for updates on our social media channels
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            © 2025 SUBZERO-NODES. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

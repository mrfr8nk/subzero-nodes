
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, GitFork, Github, RefreshCw, ExternalLink, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface GitHubSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function GitHubSetupModal({ isOpen, onClose, onComplete }: GitHubSetupModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);

  const { data: githubStatus, isLoading, refetch } = useQuery<{
    connected: boolean;
    username: string | null;
    hasValidToken: boolean;
    hasFork: boolean;
    forkUrl: string | null;
  }>({
    queryKey: ["/api/github/connection-status"],
    enabled: isOpen,
  });

  // Auto-close modal if user has already completed setup
  useEffect(() => {
    if (isOpen && !isLoading && user?.hasCompletedGitHubSetup) {
      onClose();
    }
  }, [isOpen, isLoading, user?.hasCompletedGitHubSetup, onClose]);

  const forkRepoMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/github/fork-repository", "POST", {});
    },
    onSuccess: () => {
      toast({
        title: "Repository Forked!",
        description: "Successfully forked the SUBZERO-MD repository to your account.",
      });
      refetch();
      setCurrentStep(2);
    },
    onError: (error: any) => {
      toast({
        title: "Fork Failed",
        description: error.message || "Failed to fork repository. Please try again.",
        variant: "destructive",
      });
    },
  });

  const markSetupCompleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/user/complete-github-setup", "POST", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Setup Complete!",
        description: "You're ready to deploy your first bot.",
      });
      onComplete();
      onClose();
    },
  });

  const handleFork = () => {
    if (githubStatus?.hasFork) {
      setCurrentStep(2);
    } else {
      forkRepoMutation.mutate();
    }
  };

  const handleCompleteSetup = () => {
    markSetupCompleteMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            GitHub Setup Required
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="text-sm font-medium">Fork Repo</span>
            </div>
            <div className="h-px w-12 bg-gray-300"></div>
            <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="text-sm font-medium">Enable Actions</span>
            </div>
          </div>

          {/* Step 1: Fork Repository */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <GitFork className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  <strong>Step 1: Fork the Repository</strong>
                  <p className="mt-2">We need to fork the SUBZERO-MD repository to your GitHub account before you can deploy bots.</p>
                </AlertDescription>
              </Alert>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2">Checking GitHub status...</span>
                </div>
              ) : githubStatus?.hasFork ? (
                <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    <strong>Repository already forked!</strong>
                    <p className="mt-2">Found your fork at: {githubStatus.forkUrl}</p>
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-4">
                    Click the button below to automatically fork the repository to your account.
                  </p>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  onClick={handleFork}
                  disabled={forkRepoMutation.isPending || isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {forkRepoMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Forking...
                    </>
                  ) : githubStatus?.hasFork ? (
                    <>
                      Next Step
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </>
                  ) : (
                    <>
                      <GitFork className="w-4 h-4 mr-2" />
                      Fork Repository
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Enable GitHub Actions */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <Alert className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  <strong>Step 2: Enable GitHub Actions</strong>
                  <p className="mt-2">You must enable GitHub Actions on your forked repository for deployments to work.</p>
                </AlertDescription>
              </Alert>

              <div className="bg-muted p-4 rounded-lg space-y-3">
                <p className="font-medium">Follow these steps:</p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Click the button below to visit your forked repository</li>
                  <li>Click on the "Actions" tab at the top</li>
                  <li>Click the green button "I understand my workflows, go ahead and enable them"</li>
                  <li>Return here and click "Complete Setup"</li>
                </ol>
              </div>

              {githubStatus?.forkUrl && (
                <Alert>
                  <Github className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Your forked repository:</span>
                      <a
                        href={`${githubStatus.forkUrl}/actions`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Open Actions Page
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                >
                  Back
                </Button>
                <Button
                  onClick={handleCompleteSetup}
                  disabled={markSetupCompleteMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {markSetupCompleteMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Complete Setup
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

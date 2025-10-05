import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Rocket, RefreshCw, CheckCircle, AlertTriangle, Bot, Settings, Coins, ExternalLink, Github, XCircle, GitFork } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GitHubStatus {
  connected: boolean;
  username: string | null;
  hasValidToken: boolean;
  hasFork: boolean;
  forkUrl: string | null;
  error: string | null;
}

export default function DeployModal({ isOpen, onClose }: DeployModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [githubForm, setGithubForm] = useState({
    branchName: '',
    sessionId: '',
    ownerNumber: '',
    prefix: '.'
  });
  const [branchCheckResult, setBranchCheckResult] = useState<{
    available: boolean;
    message: string;
    suggested?: string;
    sanitized?: string;
  } | null>(null);
  const [isCheckingBranch, setIsCheckingBranch] = useState(false);

  // Fetch GitHub connection status
  const { data: githubStatus, isLoading: isLoadingGitHubStatus, refetch: refetchGitHubStatus } = useQuery<GitHubStatus>({
    queryKey: ["/api/github/connection-status"],
    enabled: isOpen,
    retry: false,
  });

  // Fetch deployment costs from database
  const { data: deploymentFeeConfig } = useQuery<{deploymentFee: number}>({
    queryKey: ["/api/admin/coins/deployment-fee"],
    enabled: isOpen,
  });

  const { data: dailyChargeConfig } = useQuery<{dailyCharge: number}>({
    queryKey: ["/api/admin/coins/daily-charge"], 
    enabled: isOpen,
  });

  // Use database values with fallback to 10 coins
  const deploymentFee = deploymentFeeConfig?.deploymentFee || 10;
  const dailyCharge = dailyChargeConfig?.dailyCharge || 10;


  const githubDeployMutation = useMutation({
    mutationFn: async (data: { branchName: string; sessionId: string; ownerNumber: string; prefix: string }) => {
      await apiRequest("/api/deployments/github", "POST", data);
    },
    onSuccess: (data) => {
      toast({
        title: "Deployment Started!",
        description: `Bot ${githubForm.branchName} is being deployed successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/deployments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
      onClose();
      setGithubForm({ branchName: '', sessionId: '', ownerNumber: '', prefix: '.' });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      if (error.message.includes("Insufficient coins")) {
        const errorData = (error as any)?.response?.data;
        const shortfall = errorData?.shortfall || 0;
        const required = errorData?.required || 0;
        const current = errorData?.current || 0;
        
        const detailMessage = shortfall > 0 
          ? `You need ${required} coins but only have ${current} coins. You're short ${shortfall} coins.`
          : "You don't have enough coins to deploy this bot. Please add more coins to your wallet.";
        
        toast({
          title: "Insufficient Coins",
          description: detailMessage,
          variant: "destructive",
        });
      } else if (error.message.includes("GitHub account not connected")) {
        toast({
          title: "GitHub Connection Required",
          description: "Please log in with your GitHub account to deploy. Redirecting...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/auth/github";
        }, 2000);
      } else if (error.message.includes("GitHub settings not configured")) {
        toast({
          title: "Deployment Unavailable",
          description: "Deployment service is not configured. Please contact administrator.",
          variant: "destructive",
        });
      } else if (error.message.includes("GitHub repository not found")) {
        toast({
          title: "Repository Error",
          description: "The deployment repository is not accessible. Please contact administrator.",
          variant: "destructive",
        });
      } else if (error.message.includes("GitHub access denied")) {
        toast({
          title: "Access Error", 
          description: "GitHub access permissions are invalid. Please contact administrator.",
          variant: "destructive",
        });
      } else if (error.message.includes("GitHub repository access failed")) {
        toast({
          title: "Repository Access Failed",
          description: "Cannot access the deployment repository. Please contact administrator.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Deployment Failed",
          description: error.message || "Failed to start deployment. Please try again.",
          variant: "destructive",
        });
      }
    },
  });


  const handleGithubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!githubForm.branchName.trim() || !githubForm.sessionId.trim() || !githubForm.ownerNumber.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const userBalance = user?.coinBalance || 0;
    if (userBalance < deploymentFee) {
      toast({
        title: "Insufficient Coins",
        description: `You need ${deploymentFee} coins to deploy this bot. You currently have ${userBalance} coins.`,
        variant: "destructive",
      });
      return;
    }

    githubDeployMutation.mutate(githubForm);
  };

  const checkBranchAvailability = async (branchName: string) => {
    if (!branchName.trim()) {
      setBranchCheckResult(null);
      return;
    }

    setIsCheckingBranch(true);
    try {
      const response = await fetch(`/api/deployments/check-branch?branchName=${encodeURIComponent(branchName)}`);
      if (!response.ok) {
        throw new Error('Failed to check branch availability');
      }
      const result = await response.json();
      setBranchCheckResult(result);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check branch availability",
        variant: "destructive",
      });
    } finally {
      setIsCheckingBranch(false);
    }
  };

  const handleClose = () => {
    if (!githubDeployMutation.isPending) {
      onClose();
      setGithubForm({ branchName: '', sessionId: '', ownerNumber: '', prefix: '.' });
      setBranchCheckResult(null);
    }
  };

  const isDeploymentDisabled = () => {
    if (!githubStatus) return true;
    if (!githubStatus.connected) return true;
    if (!githubStatus.hasValidToken) return true;
    if (githubDeployMutation.isPending) return true;
    if (!githubForm.branchName.trim() || !githubForm.sessionId.trim() || !githubForm.ownerNumber.trim()) return true;
    if (branchCheckResult !== null && !branchCheckResult.available) return true;
    if ((user?.coinBalance || 0) < deploymentFee) return true;
    return false;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Rocket className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <DialogTitle className="text-2xl font-bold">Deploy New Bot</DialogTitle>
          <p className="text-gray-600 dark:text-gray-400">Deploy a new SUBZERO-MD WhatsApp bot</p>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* GitHub Connection Status Card */}
          <Card className="border-2" data-testid="card-github-status">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Github className="w-6 h-6 mr-3 text-gray-700 dark:text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">GitHub Connection Status</h3>
                </div>
                <Button
                  onClick={() => refetchGitHubStatus()}
                  variant="outline"
                  size="sm"
                  disabled={isLoadingGitHubStatus}
                  data-testid="button-refresh-github-status"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingGitHubStatus ? 'animate-spin' : ''}`} />
                  Check Status
                </Button>
              </div>

              {isLoadingGitHubStatus ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600 dark:text-gray-400">Checking GitHub status...</span>
                </div>
              ) : githubStatus ? (
                <div className="space-y-3">
                  {/* Connection Status */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg" data-testid="status-github-connection">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-3 ${githubStatus.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">GitHub Account</span>
                    </div>
                    <div className="flex items-center">
                      {githubStatus.connected ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
                          <span className="text-green-700 dark:text-green-300">Connected as {githubStatus.username}</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => window.location.href = "/api/auth/github"}
                            className="text-blue-600 dark:text-blue-400"
                            data-testid="button-connect-github"
                          >
                            Connect GitHub
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Token Status */}
                  {githubStatus.connected && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg" data-testid="status-github-token">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-3 ${githubStatus.hasValidToken ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">API Token</span>
                      </div>
                      <div className="flex items-center">
                        {githubStatus.hasValidToken ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
                            <span className="text-green-700 dark:text-green-300">Valid & Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => window.location.href = "/api/auth/github"}
                              className="text-blue-600 dark:text-blue-400"
                              data-testid="button-reconnect-github"
                            >
                              Reconnect
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Fork Status */}
                  {githubStatus.connected && githubStatus.hasValidToken && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg" data-testid="status-github-fork">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-3 ${githubStatus.hasFork ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">Repository Fork</span>
                      </div>
                      <div className="flex items-center">
                        {githubStatus.hasFork ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
                            <a 
                              href={githubStatus.forkUrl || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                              data-testid="link-view-fork"
                            >
                              View Fork <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          </>
                        ) : (
                          <>
                            <GitFork className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" />
                            <span className="text-yellow-700 dark:text-yellow-300">Will be created on first deploy</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {githubStatus.error && (
                    <Alert variant="destructive" data-testid="alert-github-error">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{githubStatus.error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Success Message */}
                  {githubStatus.connected && githubStatus.hasValidToken && (
                    <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" data-testid="alert-github-ready">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <AlertDescription className="text-green-700 dark:text-green-300">
                        GitHub is connected and ready for deployment!
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <form onSubmit={handleGithubSubmit} className="space-y-6">
          {/* Template Selection */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">SUBZERO-MD Bot Template</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Advanced WhatsApp bot with premium features</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center text-green-700 dark:text-green-400">
                <CheckCircle className="w-4 h-4 mr-2" />
                Multi-device support
              </div>
              <div className="flex items-center text-green-700 dark:text-green-400">
                <CheckCircle className="w-4 h-4 mr-2" />
                Auto-reply system
              </div>
              <div className="flex items-center text-green-700 dark:text-green-400">
                <CheckCircle className="w-4 h-4 mr-2" />
                Media downloads
              </div>
              <div className="flex items-center text-green-700 dark:text-green-400">
                <CheckCircle className="w-4 h-4 mr-2" />
                Group management
              </div>
            </div>
          </div>

          {/* Bot Configuration */}
          <div className="space-y-6">
            <div className="flex items-center mb-4">
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Bot Configuration</h3>
            </div>

            <div className="grid gap-6">
              <div>
                <Label htmlFor="bot-name" className="text-base font-medium">Bot Name</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Choose a unique identifier for your bot</p>
                <div className="flex space-x-2 mt-2">
              <Input
                id="bot-name"
                type="text"
                placeholder="Enter unique bot name (e.g., my-bot-2024)"
                value={githubForm.branchName}
                onChange={(e) => {
                  setGithubForm(prev => ({ ...prev, branchName: e.target.value }));
                  // Auto-check availability after typing stops
                  setTimeout(() => checkBranchAvailability(e.target.value), 500);
                }}
                disabled={githubDeployMutation.isPending}
                data-testid="input-bot-name"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => checkBranchAvailability(githubForm.branchName)}
                disabled={isCheckingBranch || !githubForm.branchName.trim() || githubDeployMutation.isPending}
                className="px-3"
                data-testid="button-check-availability"
              >
                {isCheckingBranch ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Check"}
              </Button>
            </div>
            {branchCheckResult && (
              <Alert variant={branchCheckResult.available ? "default" : "destructive"} className="mt-2" data-testid="alert-branch-check">
                <div className="flex items-center">
                  {branchCheckResult.available ? (
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                  )}
                  <AlertDescription className="flex-1">
                    {branchCheckResult.message}
                    {branchCheckResult.suggested && (
                      <div className="mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setGithubForm(prev => ({ ...prev, branchName: branchCheckResult.suggested || '' }));
                            setBranchCheckResult({ ...branchCheckResult, available: true, message: 'Name available!' });
                          }}
                          data-testid="button-use-suggested"
                        >
                          Use "{branchCheckResult.suggested}"
                        </Button>
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </Alert>
            )}
              </div>

              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="session-id" className="text-base font-medium text-gray-900 dark:text-gray-100">WhatsApp Session ID</Label>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">Required for bot authentication with WhatsApp</p>
                    <Input
                      id="session-id"
                      type="text"
                      placeholder="Paste your session ID here"
                      value={githubForm.sessionId}
                      onChange={(e) => setGithubForm(prev => ({ ...prev, sessionId: e.target.value }))}
                      className="mb-2"
                      disabled={githubDeployMutation.isPending}
                      data-testid="input-session-id"
                    />
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                        <strong>Need a session ID?</strong>
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                        Get your WhatsApp session ID from our secure pairing service:
                      </p>
                      <a 
                        href="https://subzero-auth.koyeb.app" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline text-sm font-medium"
                        data-testid="link-session-pairing"
                      >
                        subzero-auth.koyeb.app
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="owner-number" className="text-base font-medium">Owner Number</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Your WhatsApp number (with country code)</p>
                  <Input
                    id="owner-number"
                    type="text"
                    placeholder="+1234567890"
                    value={githubForm.ownerNumber}
                    onChange={(e) => setGithubForm(prev => ({ ...prev, ownerNumber: e.target.value }))}
                    disabled={githubDeployMutation.isPending}
                    data-testid="input-owner-number"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Include country code (e.g., +1 for US)</p>
                </div>

                <div>
                  <Label htmlFor="prefix" className="text-base font-medium">Command Prefix</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Symbol to trigger bot commands</p>
                  <Input
                    id="prefix"
                    type="text"
                    placeholder="."
                    value={githubForm.prefix}
                    onChange={(e) => setGithubForm(prev => ({ ...prev, prefix: e.target.value }))}
                    disabled={githubDeployMutation.isPending}
                    data-testid="input-prefix"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Default: "." (dot)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Information */}
          <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 p-6 rounded-2xl border border-blue-200 dark:border-blue-800 shadow-sm">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mr-4 shadow-md">
                <Coins className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Deployment Pricing</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Transparent and affordable bot hosting</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Setup Fee Card */}
              <div className="bg-white dark:bg-gray-800/80 p-5 rounded-xl border border-blue-100 dark:border-blue-800/50 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mr-3">
                      <Settings className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">Setup Fee</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">One-time deployment cost</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-deployment-fee">{deploymentFee}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">coins</p>
                  </div>
                </div>
              </div>

              {/* Daily Cost Card */}
              <div className="bg-white dark:bg-gray-800/80 p-5 rounded-xl border border-blue-100 dark:border-blue-800/50 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-3">
                      <Rocket className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">Daily Hosting</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Ongoing maintenance cost</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-daily-charge">{dailyCharge}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">coins/day</p>
                  </div>
                </div>
              </div>

              {/* Balance Card */}
              <div className={`p-5 rounded-xl border shadow-sm transition-colors ${
                (user?.coinBalance || 0) >= deploymentFee 
                  ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/50' 
                  : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                      (user?.coinBalance || 0) >= deploymentFee 
                        ? 'bg-green-100 dark:bg-green-900/50' 
                        : 'bg-red-100 dark:bg-red-900/50'
                    }`}>
                      <Coins className={`w-5 h-5 ${
                        (user?.coinBalance || 0) >= deploymentFee 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">Your Balance</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Available coins</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${
                      (user?.coinBalance || 0) >= deploymentFee 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`} data-testid="text-coin-balance">
                      {user?.coinBalance || 0}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">coins</p>
                  </div>
                </div>
                
                {(user?.coinBalance || 0) < deploymentFee && (
                  <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center">
                      <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mr-2" />
                      <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                        Insufficient balance. Need {deploymentFee - (user?.coinBalance || 0)} more coins to deploy.
                      </p>
                    </div>
                  </div>
                )}
                
                {(user?.coinBalance || 0) >= deploymentFee && (
                  <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" />
                      <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                        Sufficient balance. Ready to deploy!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            <Button 
              type="button" 
              onClick={handleClose}
              variant="outline"
              className="flex-1"
              disabled={githubDeployMutation.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={isDeploymentDisabled()}
              data-testid="button-deploy"
            >
              {githubDeployMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 mr-2" />
                  Deploy Bot
                </>
              )}
            </Button>
          </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

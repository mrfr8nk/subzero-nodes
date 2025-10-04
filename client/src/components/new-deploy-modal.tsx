import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Rocket, RefreshCw, CheckCircle, AlertTriangle, Coins, Plus, GitBranch, Github } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import CreateRepoModal from "./create-repo-modal";

interface NewDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewDeployModal({ isOpen, onClose }: NewDeployModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCreateRepoModal, setShowCreateRepoModal] = useState(false);
  const [selectedRepository, setSelectedRepository] = useState<string>("");
  const [deploymentForm, setDeploymentForm] = useState({
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

  // Fetch user's GitHub repositories
  const { data: userRepositories = [] } = useQuery<any[]>({
    queryKey: ["/api/github/repositories"],
    enabled: isOpen,
  });

  // Branch availability check
  const checkBranchAvailability = async () => {
    if (!deploymentForm.branchName.trim() || !selectedRepository) {
      return;
    }

    setIsCheckingBranch(true);
    try {
      const response = await fetch(`/api/deployments/check-branch?branchName=${encodeURIComponent(deploymentForm.branchName)}`);
      const result = await response.json();
      setBranchCheckResult(result);
    } catch (error) {
      console.error('Error checking branch availability:', error);
      setBranchCheckResult({
        available: false,
        message: 'Failed to check branch availability'
      });
    } finally {
      setIsCheckingBranch(false);
    }
  };

  // Deploy bot mutation
  const deployBotMutation = useMutation({
    mutationFn: async (data: { repositoryId: string; branchName: string; sessionId: string; ownerNumber: string; prefix: string }) => {
      await apiRequest("/api/deployments/user-github", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Deployment Started!",
        description: `Bot ${deploymentForm.branchName} is being deployed successfully using your GitHub account.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/deployments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/github/repositories"] });
      onClose();
      setDeploymentForm({ branchName: '', sessionId: '', ownerNumber: '', prefix: '.' });
      setSelectedRepository("");
      setBranchCheckResult(null);
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
      } else if (error?.requiresGitHub) {
        toast({
          title: "GitHub Connection Required",
          description: error.message || "Please connect your GitHub account first",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Deployment Failed",
          description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const handleDeploy = () => {
    if (!selectedRepository) return;
    
    deployBotMutation.mutate({
      repositoryId: selectedRepository,
      branchName: deploymentForm.branchName,
      sessionId: deploymentForm.sessionId,
      ownerNumber: deploymentForm.ownerNumber,
      prefix: deploymentForm.prefix,
    });
  };

  const selectedRepo = userRepositories.find((repo: any) => repo._id === selectedRepository);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Deploy New Bot
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* GitHub Connection Check */}
            {(!user?.githubUsername || !user?.githubAccessToken) && (
              <Alert className="bg-blue-50 border-blue-200">
                <Github className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-800">Connect your GitHub account to deploy bots using your own repository.</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = '/api/auth/github'}
                      className="ml-4 border-blue-300 text-blue-700 hover:bg-blue-100"
                      data-testid="button-connect-github"
                    >
                      <Github className="w-4 h-4 mr-2" />
                      Connect GitHub
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Repository Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Select Repository</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateRepoModal(true)}
                  data-testid="button-create-repo"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Repository
                </Button>
              </div>

              {userRepositories.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No repositories found. Create a repository first to deploy bots.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="repository" data-testid="label-repository">Repository</Label>
                  <Select 
                    value={selectedRepository} 
                    onValueChange={setSelectedRepository}
                  >
                    <SelectTrigger data-testid="select-repository">
                      <SelectValue placeholder="Select a repository" />
                    </SelectTrigger>
                    <SelectContent>
                      {userRepositories.map((repo: any) => (
                        <SelectItem key={repo._id} value={repo._id}>
                          {repo.name} ({repo.githubUsername}/{repo.repositoryName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedRepo && (
                    <div className="text-sm text-muted-foreground mt-2 p-3 bg-muted rounded">
                      <div className="flex items-center gap-2 mb-1">
                        <GitBranch className="h-4 w-4" />
                        <span className="font-medium">{selectedRepo.name}</span>
                      </div>
                      <div>Repository: {selectedRepo.githubUsername}/{selectedRepo.repositoryName}</div>
                      <div>Branches: {selectedRepo.branches?.length || 0} bots</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Deployment Fee Display */}
            <Alert>
              <Coins className="h-4 w-4" />
              <AlertDescription>
                <div className="flex justify-between items-center">
                  <span>Deployment Fee: <strong>{deploymentFee} coins</strong></span>
                  <span className="text-sm text-muted-foreground">Daily Charge: <strong>{dailyCharge} coins</strong></span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Your current balance: <strong>{user?.coinBalance || 0} coins</strong>
                </div>
              </AlertDescription>
            </Alert>

            {/* Insufficient Balance Warning */}
            {(user?.coinBalance || 0) < deploymentFee && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Insufficient balance! You need at least {deploymentFee} coins to deploy. Your current balance is {user?.coinBalance || 0} coins.
                </AlertDescription>
              </Alert>
            )}

            {selectedRepository && (
              <div className="grid gap-4">
                {/* Bot Name Field */}
                <div className="grid gap-2">
                  <Label htmlFor="branchName" data-testid="label-branch-name">Bot Name (Branch Name)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="branchName"
                      placeholder="my-discord-bot"
                      value={deploymentForm.branchName}
                      onChange={(e) => setDeploymentForm({ ...deploymentForm, branchName: e.target.value })}
                      className="flex-1"
                      data-testid="input-branch-name"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={checkBranchAvailability}
                      disabled={isCheckingBranch || !deploymentForm.branchName.trim()}
                      data-testid="button-check-branch"
                    >
                      {isCheckingBranch ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        "Check"
                      )}
                    </Button>
                  </div>

                  {/* Branch Check Results */}
                  {branchCheckResult && (
                    <div className={`text-sm p-2 rounded border ${
                      branchCheckResult.available ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
                    }`} data-testid="branch-check-result">
                      <div className="flex items-center gap-2">
                        {branchCheckResult.available ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                        <span>{branchCheckResult.message}</span>
                      </div>
                      {branchCheckResult.suggested && (
                        <div className="mt-1">
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-xs"
                            onClick={() => setDeploymentForm({ ...deploymentForm, branchName: branchCheckResult.suggested! })}
                            data-testid="button-use-suggested"
                          >
                            Use: {branchCheckResult.suggested}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Session ID Field */}
                <div className="grid gap-2">
                  <Label htmlFor="sessionId" data-testid="label-session-id">Session ID</Label>
                  <Input
                    id="sessionId"
                    placeholder="Enter your session ID"
                    value={deploymentForm.sessionId}
                    onChange={(e) => setDeploymentForm({ ...deploymentForm, sessionId: e.target.value })}
                    data-testid="input-session-id"
                  />
                </div>

                {/* Owner Number Field */}
                <div className="grid gap-2">
                  <Label htmlFor="ownerNumber" data-testid="label-owner-number">Owner Number</Label>
                  <Input
                    id="ownerNumber"
                    placeholder="Enter owner number"
                    value={deploymentForm.ownerNumber}
                    onChange={(e) => setDeploymentForm({ ...deploymentForm, ownerNumber: e.target.value })}
                    data-testid="input-owner-number"
                  />
                </div>

                {/* Prefix Field */}
                <div className="grid gap-2">
                  <Label htmlFor="prefix" data-testid="label-prefix">Bot Prefix</Label>
                  <Input
                    id="prefix"
                    placeholder="."
                    value={deploymentForm.prefix}
                    onChange={(e) => setDeploymentForm({ ...deploymentForm, prefix: e.target.value })}
                    data-testid="input-prefix"
                  />
                </div>
              </div>
            )}

            {/* Deploy Button */}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={onClose} data-testid="button-cancel">
                Cancel
              </Button>
              <Button
                onClick={handleDeploy}
                disabled={
                  deployBotMutation.isPending ||
                  !selectedRepository ||
                  !deploymentForm.branchName?.trim() ||
                  !deploymentForm.sessionId?.trim() ||
                  !deploymentForm.ownerNumber?.trim() ||
                  !deploymentForm.prefix?.trim() ||
                  (user?.coinBalance || 0) < deploymentFee ||
                  (branchCheckResult ? !branchCheckResult.available : false) ||
                  !user?.githubUsername ||
                  !user?.githubAccessToken
                }
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
                data-testid="button-deploy"
              >
                {deployBotMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-4 w-4" />
                    Deploy Bot ({deploymentFee} coins)
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Repository Modal */}
      <CreateRepoModal 
        isOpen={showCreateRepoModal}
        onClose={() => setShowCreateRepoModal(false)}
        onSuccess={(repo) => {
          setSelectedRepository(repo._id);
          queryClient.invalidateQueries({ queryKey: ["/api/github/repositories"] });
        }}
      />
    </>
  );
}
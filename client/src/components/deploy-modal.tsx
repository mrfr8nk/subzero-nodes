import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rocket } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
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


  const githubDeployMutation = useMutation({
    mutationFn: async (data: { branchName: string; sessionId: string; ownerNumber: string; prefix: string }) => {
      await apiRequest("POST", "/api/deployments/github", data);
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
        toast({
          title: "Insufficient Coins",
          description: "You don't have enough coins to deploy this bot. Please add more coins to your wallet.",
          variant: "destructive",
        });
      } else if (error.message.includes("GitHub settings not configured")) {
        toast({
          title: "Deployment Unavailable",
          description: "Deployment service is not available. Please contact administrator.",
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
    const deploymentCost = 25; // Default deployment cost
    if (userBalance < deploymentCost) {
      toast({
        title: "Insufficient Coins",
        description: `You need ${deploymentCost} coins to deploy this bot. You currently have ${userBalance} coins.`,
        variant: "destructive",
      });
      return;
    }

    githubDeployMutation.mutate(githubForm);
  };

  const handleClose = () => {
    if (!githubDeployMutation.isPending) {
      onClose();
      setGithubForm({ branchName: '', sessionId: '', ownerNumber: '', prefix: '.' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Rocket className="w-8 h-8 text-blue-600" />
          </div>
          <DialogTitle className="text-2xl font-bold">Deploy New Bot</DialogTitle>
          <p className="text-gray-600">Deploy a new SUBZERO-MD WhatsApp bot</p>
        </DialogHeader>

        <div className="mt-6 max-h-[500px] overflow-y-auto pr-2">
          <form onSubmit={handleGithubSubmit} className="space-y-6">
          <div>
            <Label htmlFor="bot-name">Bot Name</Label>
            <Input
              id="bot-name"
              type="text"
              placeholder="Enter unique bot name (e.g., my-bot-2024)"
              value={githubForm.branchName}
              onChange={(e) => setGithubForm(prev => ({ ...prev, branchName: e.target.value }))}
              className="mt-2"
              disabled={githubDeployMutation.isPending}
            />
          </div>

          <div>
            <Label htmlFor="session-id">Session ID</Label>
            <Input
              id="session-id"
              type="text"
              placeholder="Your WhatsApp session ID"
              value={githubForm.sessionId}
              onChange={(e) => setGithubForm(prev => ({ ...prev, sessionId: e.target.value }))}
              className="mt-2"
              disabled={githubDeployMutation.isPending}
            />
          </div>

          <div>
            <Label htmlFor="owner-number">Owner Number</Label>
            <Input
              id="owner-number"
              type="text"
              placeholder="Your WhatsApp number with country code"
              value={githubForm.ownerNumber}
              onChange={(e) => setGithubForm(prev => ({ ...prev, ownerNumber: e.target.value }))}
              className="mt-2"
              disabled={githubDeployMutation.isPending}
            />
          </div>

          <div>
            <Label htmlFor="prefix">Bot Prefix</Label>
            <Input
              id="prefix"
              type="text"
              placeholder="Bot command prefix (default: .)"
              value={githubForm.prefix}
              onChange={(e) => setGithubForm(prev => ({ ...prev, prefix: e.target.value }))}
              className="mt-2"
              disabled={githubDeployMutation.isPending}
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Deployment Cost:</span>
              <span className="font-bold text-blue-600">25 coins</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-gray-700">Your Balance:</span>
              <span className="font-bold text-gray-900">{user?.coinBalance || 0} coins</span>
            </div>
          </div>

          <div className="flex space-x-4">
            <Button 
              type="button" 
              onClick={handleClose}
              variant="outline"
              className="flex-1"
              disabled={githubDeployMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={githubDeployMutation.isPending || !githubForm.branchName.trim() || !githubForm.sessionId.trim() || !githubForm.ownerNumber.trim()}
            >
              {githubDeployMutation.isPending ? "Deploying..." : "Deploy Bot"}
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

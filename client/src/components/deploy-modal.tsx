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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Rocket, Github } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DeployModal({ isOpen, onClose }: DeployModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [botName, setBotName] = useState("");
  const [configuration, setConfiguration] = useState("standard");
  const [githubForm, setGithubForm] = useState({
    branchName: '',
    sessionId: '',
    ownerNumber: '',
    prefix: '.'
  });

  const deployMutation = useMutation({
    mutationFn: async (data: { name: string; configuration: string; cost: number }) => {
      await apiRequest("POST", "/api/deployments", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Bot deployed successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/deployments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
      onClose();
      setBotName("");
      setConfiguration("standard");
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
      } else {
        toast({
          title: "Error",
          description: "Failed to deploy bot. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const githubDeployMutation = useMutation({
    mutationFn: async (data: { branchName: string; sessionId: string; ownerNumber: string; prefix: string }) => {
      await apiRequest("POST", "/api/deployments/github", data);
    },
    onSuccess: (data) => {
      toast({
        title: "GitHub Deployment Started!",
        description: `Bot ${githubForm.branchName} is being deployed via GitHub Actions.`,
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
          title: "GitHub Not Configured",
          description: "GitHub deployment is not available. Please contact administrator.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Deployment Failed",
          description: error.message || "Failed to start GitHub deployment. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!botName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a bot name",
        variant: "destructive",
      });
      return;
    }

    const cost = getCost(configuration);
    
    const userBalance = user?.coinBalance || 0;
    if (userBalance < cost) {
      toast({
        title: "Insufficient Coins",
        description: `You need ${cost} coins to deploy this bot. You currently have ${userBalance} coins.`,
        variant: "destructive",
      });
      return;
    }

    deployMutation.mutate({
      name: botName.trim(),
      configuration,
      cost,
    });
  };

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
    const githubCost = 25; // Default deployment cost
    if (userBalance < githubCost) {
      toast({
        title: "Insufficient Coins",
        description: `You need ${githubCost} coins to deploy via GitHub. You currently have ${userBalance} coins.`,
        variant: "destructive",
      });
      return;
    }

    githubDeployMutation.mutate(githubForm);
  };

  const getCost = (config: string) => {
    switch (config) {
      case "premium":
        return 50;
      case "custom":
        return 75;
      default:
        return 25;
    }
  };

  const handleClose = () => {
    if (!deployMutation.isPending) {
      onClose();
      setBotName("");
      setConfiguration("standard");
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
          <p className="text-gray-600">Choose your deployment method</p>
        </DialogHeader>

        <Tabs defaultValue="standard" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="standard">Standard Deploy</TabsTrigger>
            <TabsTrigger value="github">
              <Github className="w-4 h-4 mr-1" />
              GitHub Deploy
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="standard" className="mt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="botName">Bot Name</Label>
            <Input
              id="botName"
              type="text"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              placeholder="Enter bot name"
              className="mt-2"
              disabled={deployMutation.isPending}
            />
          </div>

          <div>
            <Label htmlFor="configuration">Configuration</Label>
            <Select
              value={configuration}
              onValueChange={setConfiguration}
              disabled={deployMutation.isPending}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select configuration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard Configuration</SelectItem>
                <SelectItem value="premium">Premium Configuration</SelectItem>
                <SelectItem value="custom">Custom Configuration</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Deployment Cost:</span>
              <span className="font-bold text-blue-600">{getCost(configuration)} coins</span>
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
              disabled={deployMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={deployMutation.isPending || !botName.trim()}
            >
              {deployMutation.isPending ? "Deploying..." : "Deploy Bot"}
            </Button>
          </div>
        </form>
      </TabsContent>
      
      <TabsContent value="github" className="mt-6">
        <form onSubmit={handleGithubSubmit} className="space-y-6">
          <div className="bg-green-50 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Github className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">GitHub Deployment</span>
            </div>
            <p className="text-xs text-green-700">
              Deploy using admin-configured GitHub settings. Your bot will be automatically deployed via GitHub Actions.
            </p>
          </div>
          
          <div>
            <Label htmlFor="branch-name">App/Branch Name</Label>
            <Input
              id="branch-name"
              type="text"
              placeholder="Enter unique app name (e.g., my-bot-2024)"
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
              <span className="text-gray-700">GitHub Deployment:</span>
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
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={githubDeployMutation.isPending || !githubForm.branchName.trim() || !githubForm.sessionId.trim() || !githubForm.ownerNumber.trim()}
            >
              {githubDeployMutation.isPending ? "Deploying via GitHub..." : "Deploy via GitHub"}
            </Button>
          </div>
        </form>
      </TabsContent>
    </Tabs>
      </DialogContent>
    </Dialog>
  );
}

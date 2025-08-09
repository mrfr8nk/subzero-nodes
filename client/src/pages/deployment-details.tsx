import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare, CheckCircle, PauseCircle, Square, Play, Trash2, Settings, RefreshCw, AlertTriangle, Calendar, Coins } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import DeploymentVariablesModal from "@/components/deployment-variables-modal";

export default function DeploymentDetails() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/deployments/:id");
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [showVariablesModal, setShowVariablesModal] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const deploymentId = params?.id;

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  // Redirect if no deployment ID
  useEffect(() => {
    if (!match || !deploymentId) {
      setLocation("/deployments");
    }
  }, [match, deploymentId, setLocation]);

  const { data: deployment, isLoading: deploymentLoading, refetch: refetchDeployment } = useQuery<any>({
    queryKey: [`/api/deployments/${deploymentId}`],
    enabled: !!deploymentId,
    retry: false,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/deployments/${id}/status`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Deployment status updated successfully!",
      });
      refetchDeployment();
      queryClient.invalidateQueries({ queryKey: ["/api/deployments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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
      toast({
        title: "Error",
        description: "Failed to update deployment status",
        variant: "destructive",
      });
    },
  });

  const deleteDeploymentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/deployments/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Deployment deleted successfully!",
      });
      setLocation("/deployments");
      queryClient.invalidateQueries({ queryKey: ["/api/deployments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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
      toast({
        title: "Error",
        description: "Failed to delete deployment",
        variant: "destructive",
      });
    },
  });

  const fetchLogs = async () => {
    if (!deploymentId) return;
    
    setIsLoadingLogs(true);
    try {
      const response = await fetch(`/api/deployments/${deploymentId}/logs`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || 'Failed to fetch logs';
        
        if (errorMessage.includes('GitHub integration not configured')) {
          toast({
            title: "GitHub Integration Required",
            description: errorData.details || "Contact administrator to configure GitHub integration for logs access.",
            variant: "destructive",
          });
          setLogs(["GitHub integration not configured. Contact administrator to set up GitHub token and repository settings."]);
        } else {
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
          setLogs([`Error: ${errorMessage}`]);
        }
        return;
      }
      
      const data = await response.json();
      if (data.workflowRuns && data.workflowRuns.length > 0) {
        setLogs([
          `Found ${data.workflowRuns.length} workflow runs for deployment "${data.deployment.name}":`,
          "",
          ...data.workflowRuns.map((run: any, index: number) => 
            `${index + 1}. Run #${run.run_number} - ${run.status} (${run.conclusion || 'running'})`
          ),
          "",
          "Click 'View Full Logs' to see detailed workflow execution logs."
        ]);
      } else {
        setLogs([
          `No workflow runs found for deployment "${data.deployment.name}".`,
          "This could mean:",
          "• The deployment hasn't been triggered yet",
          "• GitHub workflow is not configured properly", 
          "• The branch name doesn't match the workflow configuration"
        ]);
      }
    } catch (error) {
      console.error('Fetch logs error:', error);
      toast({
        title: "Error",
        description: "Network error while fetching logs",
        variant: "destructive",
      });
      setLogs(["Network error while fetching logs. Please try again."]);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (deploymentId) {
      fetchLogs();
    }
  }, [deploymentId]);

  if (!isAuthenticated || isLoading || !deploymentId) {
    return null;
  }

  if (deploymentLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">Loading deployment details...</div>
      </div>
    );
  }

  if (!deployment) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">Deployment not found</p>
          <Button onClick={() => setLocation("/deployments")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Deployments
          </Button>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "stopped":
        return <PauseCircle className="w-5 h-5 text-gray-600" />;
      case "failed":
        return <Square className="w-5 h-5 text-red-600" />;
      case "insufficient_funds":
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      default:
        return <PauseCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "stopped":
        return "bg-gray-100 text-gray-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "insufficient_funds":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleStatusChange = (currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "stopped" : "active";
    updateStatusMutation.mutate({ id: deploymentId, status: newStatus });
  };

  const handleDeleteDeployment = () => {
    if (confirm("Are you sure you want to delete this deployment? This action cannot be undone.")) {
      deleteDeploymentMutation.mutate(deploymentId);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button 
          variant="outline" 
          onClick={() => setLocation("/deployments")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Deployments
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{deployment.name}</h1>
            <p className="text-gray-600">Deployment Details & Management</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Details & Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* Deployment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5" />
                <span>Bot Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status</span>
                <Badge className={`${getStatusColor(deployment.status)} flex items-center space-x-1`}>
                  {getStatusIcon(deployment.status)}
                  <span>
                    {deployment.status === 'insufficient_funds' ? 'No Funds' : 
                     deployment.status.charAt(0).toUpperCase() + deployment.status.slice(1)}
                  </span>
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Cost</span>
                <div className="flex items-center space-x-1">
                  <Coins className="w-4 h-4 text-yellow-600" />
                  <span className="font-medium">{deployment.cost} coins/day</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Created</span>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>{new Date(deployment.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              {deployment.nextChargeDate && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Next Charge</span>
                  <span className="text-sm font-medium">
                    {new Date(deployment.nextChargeDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Control Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={() => handleStatusChange(deployment.status)}
                disabled={updateStatusMutation.isPending}
                className={`w-full ${deployment.status === "active" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
              >
                {updateStatusMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : deployment.status === "active" ? (
                  <Square className="w-4 h-4 mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {deployment.status === "active" ? "Stop Bot" : "Start Bot"}
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => setShowVariablesModal(true)}
                className="w-full"
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Variables
              </Button>
              
              <Button 
                variant="outline"
                onClick={fetchLogs}
                disabled={isLoadingLogs}
                className="w-full"
              >
                {isLoadingLogs ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh Logs
              </Button>
              
              <Button 
                variant="destructive"
                onClick={handleDeleteDeployment}
                disabled={deleteDeploymentMutation.isPending}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Deployment
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Logs */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Deployment Logs</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={fetchLogs}
                  disabled={isLoadingLogs}
                >
                  {isLoadingLogs ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                {isLoadingLogs ? (
                  <div className="text-gray-400">Loading logs...</div>
                ) : logs.length > 0 ? (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400">No logs available yet.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Variables Modal */}
      {showVariablesModal && (
        <DeploymentVariablesModal
          isOpen={showVariablesModal}
          onClose={() => setShowVariablesModal(false)}
          deploymentId={deploymentId}
          deploymentName={deployment.name}
        />
      )}
    </div>
  );
}
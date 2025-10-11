import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, CheckCircle, PauseCircle, Calendar, AlertTriangle, ArrowRight, Square, Eye } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import DeployModal from "@/components/deploy-modal";
import DeploymentLogsModal from "@/components/deployment-logs-modal";
import CountdownTimer from "@/components/countdown-timer";

export default function Deployments() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string | null>(null);

  // Redirect to home if not authenticated
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

  const { data: deployments, isLoading: deploymentsLoading } = useQuery<any[]>({
    queryKey: ["/api/deployments"],
    retry: false,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });


  if (!isAuthenticated || isLoading) {
    return null;
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
      case "deploying":
        return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>;
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
      case "deploying":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Bot Deployments</h1>
        <p className="text-gray-600 dark:text-gray-300">Deploy and manage your SUBZERO-MD WhatsApp bots.</p>
      </div>

      {/* Deploy New Bot Button - Made more accessible */}
      <div className="mb-8">
        <Button 
          onClick={() => setShowDeployModal(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-lg px-6 py-3 h-auto"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Deploy New Bot
        </Button>
      </div>

      {/* Floating Deploy Button for Mobile */}
      <div className="fixed bottom-20 right-6 z-50 md:hidden">
        <Button 
          onClick={() => setShowDeployModal(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg rounded-full w-14 h-14 p-0"
          size="sm"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Deployment Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Total Bots</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {statsLoading ? "..." : stats?.total || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Active</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {statsLoading ? "..." : stats?.active || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Stopped</p>
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">
                  {statsLoading ? "..." : stats?.stopped || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <PauseCircle className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">This Month</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {statsLoading ? "..." : stats?.thisMonth || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deployments List */}
      <Card>
        <CardHeader className="border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="mb-4 sm:mb-0">Your Deployments</CardTitle>
          <div className="flex space-x-4">
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>All Status</option>
              <option>Active</option>
              <option>Stopped</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>All Time</option>
              <option>This Month</option>
              <option>Last Month</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="space-y-4">
            {deploymentsLoading ? (
              <div className="text-muted-foreground">Loading deployments...</div>
            ) : deployments && deployments.length > 0 ? (
              deployments.map((deployment: any) => (
                <div key={deployment._id} className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4 mb-4 lg:mb-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{deployment.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Deployed {new Date(deployment.createdAt).toLocaleDateString()}
                      </p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(deployment.status)}`}>
                          <span className={`w-2 h-2 rounded-full mr-1 ${
                            deployment.status === 'active' ? 'bg-green-600' : 
                            deployment.status === 'insufficient_funds' ? 'bg-orange-600' : 
                            deployment.status === 'failed' ? 'bg-red-600' : 'bg-gray-600'
                          }`}></span>
                          {deployment.status === 'insufficient_funds' ? 'No Funds' : 
                           deployment.status.charAt(0).toUpperCase() + deployment.status.slice(1)}
                        </span>
                        <span className="text-xs text-muted-foreground">Cost: {deployment.cost} coins/day</span>
                      </div>
                      <div className="flex items-center space-x-4 mt-2">
                        <CountdownTimer 
                          createdAt={deployment.createdAt}
                          className="text-xs"
                        />
                        {deployment.nextChargeDate && (
                          <span className="text-xs text-muted-foreground">
                            Next charge: {new Date(deployment.nextChargeDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button 
                      onClick={() => {
                        if (deployment.githubOwner && deployment.githubRepo && deployment.branchName) {
                          window.open(`https://github.com/${deployment.githubOwner}/${deployment.githubRepo}/actions?query=branch%3A${deployment.branchName}`, '_blank');
                        } else {
                          setSelectedDeploymentId(deployment._id);
                        }
                      }}
                      variant="outline"
                      className="border-blue-600 text-blue-600 hover:bg-blue-50"
                      data-testid={`button-view-workflow-${deployment._id}`}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Workflow
                    </Button>
                    <Button 
                      onClick={() => setLocation(`/deployments/${deployment._id}`)}
                      className="bg-blue-600 hover:bg-blue-700"
                      data-testid={`button-manage-${deployment._id}`}
                    >
                      Manage Bot
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-muted-foreground text-center py-8">
                No deployments yet. Click "Deploy New Bot" to get started!
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <DeployModal 
        isOpen={showDeployModal}
        onClose={() => setShowDeployModal(false)}
      />
      
      <DeploymentLogsModal
        isOpen={!!selectedDeploymentId}
        onClose={() => setSelectedDeploymentId(null)}
        deploymentId={selectedDeploymentId || ""}
        deploymentName={deployments?.find(d => d._id === selectedDeploymentId)?.name || ""}
      />
    </div>
  );
}

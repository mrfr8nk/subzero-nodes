import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, CheckCircle, PauseCircle, Calendar, Eye, Square, Play } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import DeployModal from "@/components/deploy-modal";

export default function Deployments() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [showDeployModal, setShowDeployModal] = useState(false);

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

  const { data: deployments, isLoading: deploymentsLoading } = useQuery({
    queryKey: ["/api/deployments"],
    retry: false,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/deployments/${id}/status`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Deployment status updated successfully!",
      });
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
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleStatusChange = (deploymentId: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "stopped" : "active";
    updateStatusMutation.mutate({ id: deploymentId, status: newStatus });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Bot Deployments</h1>
        <p className="text-gray-600">Deploy and manage your SUBZERO-MD WhatsApp bots.</p>
      </div>

      {/* Deploy New Bot Button */}
      <div className="mb-8">
        <Button 
          onClick={() => setShowDeployModal(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
        >
          <Plus className="w-4 h-4 mr-2" />
          Deploy New Bot
        </Button>
      </div>

      {/* Deployment Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Bots</p>
                <p className="text-2xl font-bold text-gray-900">
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
                <p className="text-sm font-medium text-gray-600 mb-1">Active</p>
                <p className="text-2xl font-bold text-green-600">
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
                <p className="text-sm font-medium text-gray-600 mb-1">Stopped</p>
                <p className="text-2xl font-bold text-gray-600">
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
                <p className="text-sm font-medium text-gray-600 mb-1">This Month</p>
                <p className="text-2xl font-bold text-blue-600">
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
              <div className="text-gray-500">Loading deployments...</div>
            ) : deployments && deployments.length > 0 ? (
              deployments.map((deployment: any) => (
                <div key={deployment.id} className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4 mb-4 lg:mb-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{deployment.name}</h4>
                      <p className="text-sm text-gray-600">
                        Deployed {new Date(deployment.createdAt).toLocaleDateString()}
                      </p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(deployment.status)}`}>
                          <span className={`w-2 h-2 rounded-full mr-1 ${
                            deployment.status === 'active' ? 'bg-green-600' : 'bg-gray-600'
                          }`}></span>
                          {deployment.status.charAt(0).toUpperCase() + deployment.status.slice(1)}
                        </span>
                        <span className="text-xs text-gray-500">Cost: {deployment.cost} coins</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button 
                      variant={deployment.status === "active" ? "destructive" : "default"}
                      size="sm"
                      onClick={() => handleStatusChange(deployment.id, deployment.status)}
                      disabled={updateStatusMutation.isPending}
                    >
                      {deployment.status === "active" ? (
                        <>
                          <Square className="w-4 h-4 mr-1" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-1" />
                          Start
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-center py-8">
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
    </div>
  );
}

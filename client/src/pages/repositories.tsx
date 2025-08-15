import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Github, 
  Plus, 
  GitBranch, 
  Settings, 
  Trash2, 
  ExternalLink,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import CreateRepoModal from "@/components/create-repo-modal";

export default function Repositories() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You need to log in to access repositories.",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/login");
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast, setLocation]);

  // Fetch user repositories
  const { data: repositories = [], isLoading: repositoriesLoading } = useQuery<any[]>({
    queryKey: ["/api/github/repositories"],
    retry: false,
  });

  // Check user's bot limit
  const { data: botLimitCheck } = useQuery<{
    allowed: boolean;
    currentCount: number;
    maxAllowed: number;
  }>({
    queryKey: ["/api/users/bot-limit"],
  });

  // Delete repository mutation
  const deleteRepositoryMutation = useMutation({
    mutationFn: async (repositoryId: string) => {
      await apiRequest(`/api/github/repositories/${repositoryId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Repository Deleted",
        description: "Repository has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/github/repositories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/bot-limit"] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete repository.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteRepository = (repository: any) => {
    if (confirm(`Are you sure you want to delete the repository "${repository.name}"? This will also delete all associated bot branches.`)) {
      deleteRepositoryMutation.mutate(repository._id);
    }
  };

  if (!isAuthenticated || isLoading) {
    return null;
  }

  const canCreateRepository = botLimitCheck?.allowed !== false;
  const currentCount = botLimitCheck?.currentCount || 0;
  const maxAllowed = botLimitCheck?.maxAllowed || 10;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">GitHub Repositories</h1>
          <p className="text-muted-foreground mt-2">
            Manage your GitHub repositories for bot deployments
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          disabled={!canCreateRepository}
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
          data-testid="button-create-repository"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Repository
        </Button>
      </div>

      {/* Repository Limit Status */}
      <Alert className={canCreateRepository ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
        {canCreateRepository ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-red-600" />
        )}
        <AlertDescription className={canCreateRepository ? "text-green-800" : "text-red-800"}>
          <div className="flex justify-between items-center">
            <span>
              Repository Limit: <strong>{currentCount} / {maxAllowed}</strong>
            </span>
            {!canCreateRepository && (
              <span className="text-sm">Limit reached - cannot create more repositories</span>
            )}
          </div>
        </AlertDescription>
      </Alert>

      {/* Repositories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {repositoriesLoading ? (
          <div className="col-span-full text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading repositories...</p>
          </div>
        ) : repositories.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-8 text-center">
                <Github className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Repositories Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first GitHub repository to start deploying bots.
                </p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  disabled={!canCreateRepository}
                  data-testid="button-create-first-repo"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Repository
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          repositories.map((repository: any) => (
            <Card key={repository._id} className="relative">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Github className="h-5 w-5" />
                      {repository.name}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground mt-1">
                      {repository.githubUsername}/{repository.repositoryName}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Badge variant={repository.isActive ? "default" : "secondary"}>
                      {repository.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Repository Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {repository.branches?.length || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Bot Branches</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {repository.workflowName}
                      </div>
                      <div className="text-sm text-muted-foreground">Workflow</div>
                    </div>
                  </div>

                  {/* Bot Branches List */}
                  {repository.branches && repository.branches.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Active Bots:</div>
                      <div className="flex flex-wrap gap-1">
                        {repository.branches.slice(0, 3).map((branch: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            <GitBranch className="h-3 w-3 mr-1" />
                            {branch}
                          </Badge>
                        ))}
                        {repository.branches.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{repository.branches.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Repository Actions */}
                  <div className="flex justify-between items-center pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(repository.githubRepoUrl, '_blank')}
                      data-testid={`button-view-repo-${repository._id}`}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View on GitHub
                    </Button>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // TODO: Add repository settings modal
                          toast({
                            title: "Coming Soon",
                            description: "Repository settings will be available soon.",
                          });
                        }}
                        data-testid={`button-settings-${repository._id}`}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteRepository(repository)}
                        disabled={deleteRepositoryMutation.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`button-delete-${repository._id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Repository Modal */}
      <CreateRepoModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/github/repositories"] });
          queryClient.invalidateQueries({ queryKey: ["/api/users/bot-limit"] });
        }}
      />
    </div>
  );
}
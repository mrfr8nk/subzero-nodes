import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Trash2, GitBranch, Activity, AlertTriangle, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Branch {
  name: string;
  protected: boolean;
  commit: {
    sha: string;
    url: string;
  };
}

interface WorkflowRun {
  id: number;
  name: string;
  head_branch: string;
  status: string;
  conclusion: string;
  created_at: string;
  run_number: number;
}

export default function AdminApiTest() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);

  const { data: branches, isLoading: branchesLoading, refetch: refetchBranches } = useQuery<Branch[]>({
    queryKey: ["/api/admin/github/branches"],
    enabled: !!isAuthenticated && user?.isAdmin,
  });

  const { data: workflows, isLoading: workflowsLoading, refetch: refetchWorkflows } = useQuery<WorkflowRun[]>({
    queryKey: ["/api/admin/github/workflows"],
    enabled: !!isAuthenticated && user?.isAdmin,
  });

  const deleteBranchesMutation = useMutation({
    mutationFn: async (branchNames: string[]) => {
      return await apiRequest("DELETE", "/api/admin/github/branches", { branches: branchNames });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Deleted ${selectedBranches.length} branches successfully!`,
      });
      setSelectedBranches([]);
      refetchBranches();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to delete branches",
        variant: "destructive",
      });
    },
  });

  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
        </div>
      </div>
    );
  }

  const handleBranchSelection = (branchName: string) => {
    setSelectedBranches(prev => 
      prev.includes(branchName) 
        ? prev.filter(name => name !== branchName)
        : [...prev, branchName]
    );
  };

  const selectAllBranches = () => {
    if (branches) {
      const nonMainBranches = branches.filter(b => b.name !== 'main' && b.name !== 'master');
      setSelectedBranches(nonMainBranches.map(b => b.name));
    }
  };

  const clearSelection = () => {
    setSelectedBranches([]);
  };

  const deleteBranches = () => {
    if (selectedBranches.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select branches to delete",
        variant: "destructive",
      });
      return;
    }

    deleteBranchesMutation.mutate(selectedBranches);
  };

  const getWorkflowStatusColor = (status: string, conclusion: string) => {
    if (status === 'completed') {
      return conclusion === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    }
    if (status === 'in_progress') return 'bg-blue-100 text-blue-800';
    if (status === 'queued') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">GitHub API Test</h1>
          <p className="text-muted-foreground">Manage repository branches and monitor workflow activity</p>
        </div>
        <div className="flex space-x-4">
          <Button onClick={() => refetchBranches()} disabled={branchesLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${branchesLoading ? 'animate-spin' : ''}`} />
            Refresh Branches
          </Button>
          <Button onClick={() => refetchWorkflows()} disabled={workflowsLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${workflowsLoading ? 'animate-spin' : ''}`} />
            Refresh Workflows
          </Button>
        </div>
      </div>

      {/* Branch Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <GitBranch className="w-5 h-5" />
            <span>Repository Branches ({branches?.length || 0})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {branchesLoading ? (
            <div className="text-muted-foreground">Loading branches...</div>
          ) : branches && branches.length > 0 ? (
            <div className="space-y-4">
              {/* Branch Selection Controls */}
              <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium">
                    {selectedBranches.length} of {branches.length} branches selected
                  </span>
                  <Button size="sm" onClick={selectAllBranches} variant="outline">
                    Select All (Non-Main)
                  </Button>
                  <Button size="sm" onClick={clearSelection} variant="outline">
                    Clear Selection
                  </Button>
                </div>
                <Button 
                  onClick={deleteBranches}
                  disabled={selectedBranches.length === 0 || deleteBranchesMutation.isPending}
                  variant="destructive"
                  size="sm"
                >
                  {deleteBranchesMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Delete Selected ({selectedBranches.length})
                </Button>
              </div>

              {/* Branches List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {branches.map((branch) => (
                  <div 
                    key={branch.name}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedBranches.includes(branch.name) 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => handleBranchSelection(branch.name)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-foreground truncate">{branch.name}</h4>
                      {branch.protected && (
                        <Badge variant="secondary" className="ml-2">
                          Protected
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      {branch.commit.sha.substring(0, 7)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-center py-8">
              No branches found or GitHub not configured
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workflow Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Recent Workflow Activity ({workflows?.length || 0})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {workflowsLoading ? (
            <div className="text-muted-foreground">Loading workflows...</div>
          ) : workflows && workflows.length > 0 ? (
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {workflow.status === 'completed' && workflow.conclusion === 'success' && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      {workflow.status === 'completed' && workflow.conclusion !== 'success' && (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}
                      {workflow.status === 'in_progress' && (
                        <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                      )}
                      {workflow.status === 'queued' && (
                        <Activity className="w-5 h-5 text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">
                        {workflow.name} #{workflow.run_number}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Branch: {workflow.head_branch} • {new Date(workflow.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge className={getWorkflowStatusColor(workflow.status, workflow.conclusion)}>
                    {workflow.status === 'completed' ? workflow.conclusion : workflow.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground text-center py-8">
              No workflow runs found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
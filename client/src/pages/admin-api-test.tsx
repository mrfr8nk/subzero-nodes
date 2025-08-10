import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Trash2, GitBranch, Activity, AlertTriangle, CheckCircle, TestTube, Plus, Play } from "lucide-react";
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

interface GitHubAccount {
  _id: string;
  name: string;
  owner: string;
  repo: string;
  workflowFile: string;
  isActive: boolean;
  createdAt: string;
  lastUsed?: string;
}

export default function AdminApiTest() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [testingTokens, setTestingTokens] = useState<{ [key: string]: boolean }>({});
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: '',
    token: '',
    owner: '',
    repo: '',
    workflowFile: 'SUBZERO.yml'
  });

  const { data: branches, isLoading: branchesLoading, refetch: refetchBranches } = useQuery<Branch[]>({
    queryKey: ["/api/admin/github/branches"],
    enabled: !!isAuthenticated && user?.isAdmin,
  });

  const { data: workflows, isLoading: workflowsLoading, refetch: refetchWorkflows } = useQuery<WorkflowRun[]>({
    queryKey: ["/api/admin/github/workflows"],
    enabled: !!isAuthenticated && user?.isAdmin,
  });

  const { data: githubAccounts, isLoading: accountsLoading, refetch: refetchAccounts } = useQuery<GitHubAccount[]>({
    queryKey: ["/api/admin/github/accounts"],
    enabled: !!isAuthenticated && user?.isAdmin,
  });

  const deleteBranchesMutation = useMutation({
    mutationFn: async (branchNames: string[]) => {
      return await apiRequest("/api/admin/github/branches", "DELETE", { branches: branchNames });
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

  const testTokenMutation = useMutation({
    mutationFn: async (accountId: string) => {
      return await apiRequest(`/api/admin/github/accounts/test/${accountId}`, "POST");
    },
    onSuccess: (data: any, accountId) => {
      toast({
        title: data.isValid ? "Token Valid" : "Token Invalid",
        description: data.isValid 
          ? `Token is working. Rate limit: ${data.rateLimitRemaining || 'Unknown'}`
          : data.error || "Token test failed",
        variant: data.isValid ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error?.response?.data?.error || "Failed to test token",
        variant: "destructive",
      });
    },
    onSettled: (_, __, accountId) => {
      setTestingTokens(prev => ({ ...prev, [accountId]: false }));
    },
  });

  const addAccountMutation = useMutation({
    mutationFn: async (accountData: typeof newAccount) => {
      return await apiRequest("/api/admin/github/accounts", "POST", accountData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "GitHub account added successfully!",
      });
      setNewAccount({ name: '', token: '', owner: '', repo: '', workflowFile: 'SUBZERO.yml' });
      setShowAddAccount(false);
      refetchAccounts();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Failed to add GitHub account",
        variant: "destructive",
      });
    },
  });

  const toggleAccountMutation = useMutation({
    mutationFn: async ({ accountId, active }: { accountId: string; active: boolean }) => {
      return await apiRequest(`/api/admin/github/accounts/${accountId}/active`, "PUT", { active });
    },
    onSuccess: () => {
      refetchAccounts();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Failed to update account status",
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

  const testToken = (accountId: string) => {
    setTestingTokens(prev => ({ ...prev, [accountId]: true }));
    testTokenMutation.mutate(accountId);
  };

  const toggleAccount = (accountId: string, currentStatus: boolean) => {
    toggleAccountMutation.mutate({ accountId, active: !currentStatus });
  };

  const addAccount = () => {
    if (!newAccount.name || !newAccount.token || !newAccount.owner || !newAccount.repo) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    addAccountMutation.mutate(newAccount);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">GitHub API Test</h1>
          <p className="text-muted-foreground">Test GitHub accounts and monitor workflow activity</p>
        </div>
        <div className="flex space-x-4">
          <Button onClick={() => refetchAccounts()} disabled={accountsLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${accountsLoading ? 'animate-spin' : ''}`} />
            Refresh Accounts
          </Button>
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

      {/* GitHub Accounts Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <TestTube className="w-5 h-5" />
              <span>GitHub Accounts ({githubAccounts?.length || 0})</span>
            </CardTitle>
            <Button 
              onClick={() => setShowAddAccount(!showAddAccount)}
              size="sm"
              data-testid="button-add-account"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddAccount && (
            <div className="border border-border rounded-lg p-4 mb-4 space-y-4">
              <h3 className="font-medium">Add New GitHub Account</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Account Name</Label>
                  <Input
                    id="name"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Main Account"
                    data-testid="input-account-name"
                  />
                </div>
                <div>
                  <Label htmlFor="token">GitHub Token</Label>
                  <Input
                    id="token"
                    type="password"
                    value={newAccount.token}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, token: e.target.value }))}
                    placeholder="ghp_xxxxxxxxxxxx"
                    data-testid="input-account-token"
                  />
                </div>
                <div>
                  <Label htmlFor="owner">Repository Owner</Label>
                  <Input
                    id="owner"
                    value={newAccount.owner}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, owner: e.target.value }))}
                    placeholder="username or organization"
                    data-testid="input-account-owner"
                  />
                </div>
                <div>
                  <Label htmlFor="repo">Repository Name</Label>
                  <Input
                    id="repo"
                    value={newAccount.repo}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, repo: e.target.value }))}
                    placeholder="repository-name"
                    data-testid="input-account-repo"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowAddAccount(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={addAccount}
                  disabled={addAccountMutation.isPending}
                  data-testid="button-save-account"
                >
                  {addAccountMutation.isPending ? "Adding..." : "Add Account"}
                </Button>
              </div>
            </div>
          )}
          
          {accountsLoading ? (
            <div className="text-muted-foreground">Loading GitHub accounts...</div>
          ) : githubAccounts && githubAccounts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {githubAccounts.map((account) => (
                <div key={account._id} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{account.name}</h4>
                    <div className="flex items-center space-x-2">
                      <Badge variant={account.isActive ? "default" : "secondary"}>
                        {account.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testToken(account._id)}
                        disabled={testingTokens[account._id]}
                        data-testid={`button-test-token-${account._id}`}
                      >
                        {testingTokens[account._id] ? (
                          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Play className="w-3 h-3 mr-1" />
                        )}
                        Test
                      </Button>
                      <Button
                        size="sm"
                        variant={account.isActive ? "destructive" : "default"}
                        onClick={() => toggleAccount(account._id, account.isActive)}
                        disabled={toggleAccountMutation.isPending}
                        data-testid={`button-toggle-${account._id}`}
                      >
                        {account.isActive ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {account.owner}/{account.repo}
                  </p>
                  {account.lastUsed && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last used: {new Date(account.lastUsed).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground text-center py-8">
              No GitHub accounts configured. Add one to get started.
            </div>
          )}
        </CardContent>
      </Card>

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
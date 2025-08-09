import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Github, 
  Plus, 
  Settings, 
  Trash2, 
  Edit, 
  Eye, 
  EyeOff,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface GitHubAccount {
  _id: string;
  name: string;
  token: string;
  owner: string;
  repo: string;
  workflowFile: string;
  isActive: boolean;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminGitHub() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<GitHubAccount | null>(null);
  const [showTokens, setShowTokens] = useState<{ [key: string]: boolean }>({});
  
  const [formData, setFormData] = useState({
    name: "",
    token: "",
    owner: "",
    repo: "",
    workflowFile: "deploy.yml",
  });

  const { data: githubAccounts = [], isLoading } = useQuery<GitHubAccount[]>({
    queryKey: ["/api/admin/github/accounts"],
    enabled: !!isAdmin,
  });

  const createAccountMutation = useMutation({
    mutationFn: (data: typeof formData) => 
      apiRequest("/api/admin/github/accounts", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/github/accounts"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "GitHub account created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create GitHub account",
        variant: "destructive",
      });
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GitHubAccount> }) =>
      apiRequest(`/api/admin/github/accounts/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/github/accounts"] });
      toast({
        title: "Success",
        description: "GitHub account updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update GitHub account",
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest(`/api/admin/github/accounts/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/github/accounts"] });
      toast({
        title: "Success",
        description: "GitHub account deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete GitHub account",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      token: "",
      owner: "",
      repo: "",
      workflowFile: "deploy.yml",
    });
    setEditingAccount(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingAccount) {
      updateAccountMutation.mutate({
        id: editingAccount._id,
        data: formData
      });
    } else {
      createAccountMutation.mutate(formData);
    }
  };

  const handleEdit = (account: GitHubAccount) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      token: account.token,
      owner: account.owner,
      repo: account.repo,
      workflowFile: account.workflowFile,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this GitHub account?")) {
      deleteAccountMutation.mutate(id);
    }
  };

  const toggleActive = (id: string, active: boolean) => {
    updateAccountMutation.mutate({
      id,
      data: { isActive: active }
    });
  };



  const toggleTokenVisibility = (accountId: string) => {
    setShowTokens(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  const maskToken = (token: string) => {
    if (!token) return '';
    return token.substring(0, 8) + '•'.repeat(Math.max(0, token.length - 12)) + token.substring(token.length - 4);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400">Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Github className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  GitHub Account Management
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage multiple GitHub accounts for deployment queue handling
                </p>
              </div>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Add GitHub Account</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingAccount ? "Edit GitHub Account" : "Add GitHub Account"}
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Account Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Main Account, Backup Account"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="token">GitHub Token</Label>
                    <Input
                      id="token"
                      type="password"
                      value={formData.token}
                      onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="owner">Repository Owner</Label>
                    <Input
                      id="owner"
                      value={formData.owner}
                      onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                      placeholder="username or organization"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="repo">Repository Name</Label>
                    <Input
                      id="repo"
                      value={formData.repo}
                      onChange={(e) => setFormData({ ...formData, repo: e.target.value })}
                      placeholder="repository-name"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="workflowFile">Workflow File</Label>
                    <Input
                      id="workflowFile"
                      value={formData.workflowFile}
                      onChange={(e) => setFormData({ ...formData, workflowFile: e.target.value })}
                      placeholder="deploy.yml"
                      required
                    />
                  </div>
                  

                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createAccountMutation.isPending || updateAccountMutation.isPending}
                    >
                      {editingAccount ? "Update" : "Create"} Account
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>GitHub Accounts ({githubAccounts.length})</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading GitHub accounts...</div>
            ) : githubAccounts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No GitHub accounts configured. Add one to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Repository</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {githubAccounts.map((account: GitHubAccount) => (
                    <TableRow key={account._id}>
                      <TableCell className="font-medium">{account.name}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{account.owner}/{account.repo}</div>
                          <div className="text-gray-500">{account.workflowFile}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {showTokens[account._id] ? account.token : maskToken(account.token)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleTokenVisibility(account._id)}
                          >
                            {showTokens[account._id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </Button>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={account.isActive}
                            onCheckedChange={(checked) => toggleActive(account._id, checked)}
                          />
                          {account.isActive ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          {account.lastUsed ? new Date(account.lastUsed).toLocaleDateString() : "Never"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(account)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(account._id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
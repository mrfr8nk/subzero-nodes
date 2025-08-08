import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Users, 
  DollarSign, 
  Activity, 
  AlertTriangle, 
  Settings,
  Ban,
  UserCheck,
  Coins,
  Crown,
  Bell,
  TrendingUp,
  Power,
  Wrench,
  CreditCard,
  Github,
  Rocket,
  Eye,
  RefreshCw
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";

interface AdminStats {
  totalUsers: number;
  totalDeployments: number;
  totalRevenue: number;
  newUsersThisMonth: number;
  activeUsers: number;
  bannedUsers: number;
}

interface User {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
  role?: string;
  status?: string;
  restrictions?: string[];
  coinBalance: number;
  registrationIp?: string;
  lastLoginIp?: string;
  createdAt: string;
}

interface AdminNotification {
  _id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
}

interface AppSetting {
  _id: string;
  key: string;
  value: any;
  description?: string;
  updatedAt: string;
}

interface MaintenanceStatus {
  enabled: boolean;
  message: string;
  estimatedTime: string;
}

interface CurrencySettings {
  currency: string;
  rate: number;
  symbol: string;
}

export default function AdminDashboard() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [coinAdjustment, setCoinAdjustment] = useState({ amount: 0, reason: "" });
  const [maintenanceForm, setMaintenanceForm] = useState({ message: '', estimatedTime: '' });
  const [currencyForm, setCurrencyForm] = useState({ currency: 'USD', rate: 0.1, symbol: '$' });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch admin stats
  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    staleTime: 30000, // 30 seconds
  });

  // Fetch users
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    staleTime: 60000, // 1 minute
  });

  // Fetch notifications
  const { data: notifications = [] } = useQuery<AdminNotification[]>({
    queryKey: ['/api/admin/notifications'],
    staleTime: 30000,
  });

  // Fetch app settings
  const { data: settings = [] } = useQuery<AppSetting[]>({
    queryKey: ['/api/admin/settings'],
    staleTime: 60000,
  });

  // Fetch maintenance status
  const { data: maintenanceStatus } = useQuery<MaintenanceStatus>({
    queryKey: ['/api/admin/maintenance/status'],
    staleTime: 30000,
  });

  // Fetch currency settings
  const { data: currencySettings } = useQuery<CurrencySettings>({
    queryKey: ['/api/admin/currency'],
    staleTime: 60000,
  });

  // GitHub settings state
  const [githubSettings, setGithubSettings] = useState({
    githubToken: '',
    repoOwner: '',
    repoName: '',
    mainBranch: 'main',
    workflowFile: 'SUBZERO.yml'
  });

  // Deployment form state
  const [deploymentForm, setDeploymentForm] = useState({
    appName: '',
    sessionId: '',
    ownerNumber: '',
    prefix: ''
  });
  const [branchCheckResult, setBranchCheckResult] = useState<any>(null);
  const [isCheckingBranch, setIsCheckingBranch] = useState(false);
  const [selectedBranchForLogs, setSelectedBranchForLogs] = useState('');
  const [workflowRuns, setWorkflowRuns] = useState<any[]>([]);
  const [selectedRunLogs, setSelectedRunLogs] = useState<any>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [realtimeUpdates, setRealtimeUpdates] = useState<any[]>([]);
  const [monitoredBranches, setMonitoredBranches] = useState<Set<string>>(new Set());
  
  // WebSocket connection for real-time updates
  const { isConnected: wsConnected, sendMessage, lastMessage, connectionError } = useWebSocket();

  // Fetch GitHub settings
  const { data: githubData, refetch: refetchGithub } = useQuery({
    queryKey: ['/api/admin/github/settings'],
    staleTime: 60000,
  });

  // Update GitHub settings when data changes
  useState(() => {
    if (githubData) {
      setGithubSettings({
        githubToken: (githubData as any).githubToken || '',
        repoOwner: (githubData as any).repoOwner || '',
        repoName: (githubData as any).repoName || '',
        mainBranch: (githubData as any).mainBranch || 'main',
        workflowFile: (githubData as any).workflowFile || 'SUBZERO.yml'
      });
    }
  });

  // Handle WebSocket messages for real-time updates
  useState(() => {
    if (lastMessage) {
      const { type, data } = lastMessage;
      
      switch (type) {
        case 'connected':
          console.log('WebSocket connected for real-time logs');
          break;
          
        case 'deployment_created':
          toast({ 
            title: "Deployment Created", 
            description: `Branch: ${data.branch} - Starting workflow...` 
          });
          setRealtimeUpdates(prev => [{
            id: Date.now(),
            type: 'deployment_created',
            branch: data.branch,
            timestamp: data.timestamp,
            message: `Deployment created for branch: ${data.branch}`
          }, ...prev]);
          break;
          
        case 'workflow_status_update':
          const update = {
            id: Date.now(),
            type: 'status_update',
            branch: data.branch,
            status: data.run.status,
            conclusion: data.run.conclusion,
            timestamp: data.run.updated_at,
            message: `Workflow ${data.run.status}${data.run.conclusion ? ` (${data.run.conclusion})` : ''}`
          };
          
          setRealtimeUpdates(prev => {
            // Remove previous updates for this branch and add new one
            const filtered = prev.filter(item => 
              !(item.branch === data.branch && item.type === 'status_update')
            );
            return [update, ...filtered];
          });
          break;
          
        case 'workflow_completed':
          toast({ 
            title: data.conclusion === 'success' ? "Deployment Successful" : "Deployment Failed", 
            description: `Branch: ${data.branch} - ${data.conclusion}`,
            variant: data.conclusion === 'success' ? 'default' : 'destructive'
          });
          
          setRealtimeUpdates(prev => [{
            id: Date.now(),
            type: 'completed',
            branch: data.branch,
            conclusion: data.conclusion,
            timestamp: data.completed_at,
            message: `Deployment ${data.conclusion === 'success' ? 'completed successfully' : 'failed'}`
          }, ...prev]);
          
          // Remove from monitored branches
          setMonitoredBranches(prev => {
            const newSet = new Set(prev);
            newSet.delete(data.branch);
            return newSet;
          });
          break;
          
        case 'monitoring_timeout':
          setRealtimeUpdates(prev => [{
            id: Date.now(),
            type: 'timeout',
            branch: data.branch,
            timestamp: new Date().toISOString(),
            message: `Monitoring timeout for branch: ${data.branch}`
          }, ...prev]);
          break;
      }
    }
  }, [lastMessage, toast]);

  // Update user status mutation
  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, status, restrictions }: { userId: string; status: string; restrictions?: string[] }) => {
      return await apiRequest('PATCH', `/api/admin/users/${userId}/status`, { status, restrictions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: "User status updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update user status", description: error.message, variant: "destructive" });
    }
  });

  // Update user coins mutation
  const updateUserCoinsMutation = useMutation({
    mutationFn: async ({ userId, amount, reason }: { userId: string; amount: number; reason: string }) => {
      return await apiRequest('PATCH', `/api/admin/users/${userId}/coins`, { amount, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: "User coins updated successfully" });
      setCoinAdjustment({ amount: 0, reason: "" });
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({ title: "Failed to update user coins", description: error.message, variant: "destructive" });
    }
  });

  // Promote user mutation
  const promoteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest('PATCH', `/api/admin/users/${userId}/promote`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "User promoted to admin successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to promote user", description: error.message, variant: "destructive" });
    }
  });

  // Update app setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value, description }: { key: string; value: any; description?: string }) => {
      return await apiRequest('PUT', `/api/admin/settings/${key}`, { value, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      toast({ title: "Setting updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update setting", description: error.message, variant: "destructive" });
    }
  });

  // Toggle maintenance mode mutation
  const toggleMaintenanceMutation = useMutation({
    mutationFn: async ({ enabled, message, estimatedTime }: { enabled: boolean; message?: string; estimatedTime?: string }) => {
      return await apiRequest('POST', '/api/admin/maintenance/toggle', { enabled, message, estimatedTime });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/maintenance/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notifications'] });
      toast({ 
        title: maintenanceStatus?.enabled ? "Maintenance mode disabled" : "Maintenance mode enabled",
        description: maintenanceStatus?.enabled ? "Site is now operational" : "Site is now in maintenance mode"
      });
      setMaintenanceForm({ message: '', estimatedTime: '' });
    },
    onError: (error: any) => {
      toast({ title: "Failed to toggle maintenance mode", description: error.message, variant: "destructive" });
    }
  });

  // Update currency settings mutation
  const updateCurrencyMutation = useMutation({
    mutationFn: async ({ currency, rate, symbol }: { currency: string; rate: number; symbol: string }) => {
      return await apiRequest('PUT', '/api/admin/currency', { currency, rate, symbol });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/currency'] });
      toast({ 
        title: "Currency settings updated",
        description: `Currency set to ${currencyForm.currency} with rate ${currencyForm.rate}`
      });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update currency settings", description: error.message, variant: "destructive" });
    }
  });

  // GitHub settings mutation
  const updateGithubSettingsMutation = useMutation({
    mutationFn: async (settings: typeof githubSettings) => {
      return await apiRequest('PUT', '/api/admin/github/settings', settings);
    },
    onSuccess: () => {
      refetchGithub();
      toast({ title: "GitHub settings updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update GitHub settings", description: error.message, variant: "destructive" });
    },
  });

  // Branch checking mutation
  const checkBranchMutation = useMutation({
    mutationFn: async (branchName: string) => {
      const response = await fetch(`/api/admin/deployment/check-branch?branchName=${encodeURIComponent(branchName)}`);
      if (!response.ok) throw new Error('Failed to check branch');
      return response.json();
    },
    onSuccess: (data) => {
      setBranchCheckResult(data);
      setIsCheckingBranch(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to check branch availability", description: error.message, variant: "destructive" });
      setIsCheckingBranch(false);
    },
  });

  // Deployment creation mutation
  const createDeploymentMutation = useMutation({
    mutationFn: async (deploymentData: typeof deploymentForm) => {
      return await apiRequest('POST', '/api/admin/deployment/deploy', {
        branchName: deploymentData.appName,
        sessionId: deploymentData.sessionId,
        ownerNumber: deploymentData.ownerNumber,
        prefix: deploymentData.prefix
      });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      toast({ title: "Deployment created successfully!", description: `Branch: ${data.branch}` });
      setDeploymentForm({ appName: '', sessionId: '', ownerNumber: '', prefix: '' });
      setBranchCheckResult(null);
      // Optionally refresh deployments list here
    },
    onError: (error: any) => {
      toast({ title: "Failed to create deployment", description: error.message, variant: "destructive" });
    },
  });

  const handleUserStatusChange = (userId: string, status: string) => {
    updateUserStatusMutation.mutate({ userId, status });
  };

  const handlePromoteUser = (userId: string) => {
    promoteUserMutation.mutate(userId);
  };

  const checkBranchAvailability = async (branchName: string) => {
    if (!branchName.trim()) {
      setBranchCheckResult(null);
      return;
    }
    setIsCheckingBranch(true);
    checkBranchMutation.mutate(branchName);
  };

  const handleCreateDeployment = () => {
    if (!deploymentForm.appName || !deploymentForm.sessionId || !deploymentForm.ownerNumber || !deploymentForm.prefix) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    if (branchCheckResult && !branchCheckResult.available) {
      toast({ title: "Branch name not available", description: "Please choose a different app name", variant: "destructive" });
      return;
    }
    createDeploymentMutation.mutate(deploymentForm);
  };

  const startRealtimeMonitoring = (branchName: string) => {
    if (wsConnected && branchName.trim() && !monitoredBranches.has(branchName)) {
      sendMessage({
        type: 'monitor_deployment',
        branch: branchName
      });
      setMonitoredBranches(prev => new Set([...prev, branchName]));
      toast({ title: "Real-time monitoring started", description: `Monitoring ${branchName}` });
    }
  };

  const fetchWorkflowRuns = async (branchName: string) => {
    if (!branchName.trim()) return;
    setIsLoadingLogs(true);
    try {
      const response = await fetch(`/api/admin/deployment/${encodeURIComponent(branchName)}/logs`);
      if (response.ok) {
        const runs = await response.json();
        setWorkflowRuns(runs);
      } else {
        toast({ title: "Failed to fetch workflow runs", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error fetching logs", variant: "destructive" });
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const fetchRunLogs = async (runId: string) => {
    setIsLoadingLogs(true);
    try {
      const response = await fetch(`/api/admin/deployment/run/${runId}/logs`);
      if (response.ok) {
        const logs = await response.json();
        setSelectedRunLogs(logs);
      } else {
        toast({ title: "Failed to fetch run logs", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error fetching run logs", variant: "destructive" });
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleCoinAdjustment = () => {
    if (!selectedUser || !coinAdjustment.reason) return;
    updateUserCoinsMutation.mutate({
      userId: selectedUser._id,
      amount: coinAdjustment.amount,
      reason: coinAdjustment.reason,
    });
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="admin-dashboard">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="title-dashboard">Admin Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Badge variant={unreadNotifications > 0 ? "destructive" : "secondary"} data-testid="badge-notifications">
            <Bell className="w-4 h-4 mr-1" />
            {unreadNotifications} notifications
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card data-testid="card-total-users">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-users">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.newUsersThisMonth || 0} this month
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-revenue">${stats?.totalRevenue || 0}</div>
            <p className="text-xs text-muted-foreground">
              From {stats?.totalDeployments || 0} deployments
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-active-users">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-active-users">{stats?.activeUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.bannedUsers || 0} banned users
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-users">User Management</TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            Notifications {unreadNotifications > 0 && <Badge className="ml-1">{unreadNotifications}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="maintenance" data-testid="tab-maintenance">
            <Wrench className="w-4 h-4 mr-1" />
            Maintenance
            {maintenanceStatus?.enabled && <Badge variant="destructive" className="ml-1">ON</Badge>}
          </TabsTrigger>
          <TabsTrigger value="currency" data-testid="tab-currency">
            <CreditCard className="w-4 h-4 mr-1" />
            Currency
          </TabsTrigger>
          <TabsTrigger value="github" data-testid="tab-github">
            <Github className="w-4 h-4 mr-1" />
            GitHub
          </TabsTrigger>
          <TabsTrigger value="deployments-mgmt" data-testid="tab-deployments-mgmt">
            <Rocket className="w-4 h-4 mr-1" />
            Deployments
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card data-testid="card-user-management">
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage user accounts, roles, and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Coins</TableHead>
                      <TableHead>Registration IP</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user._id} data-testid={`row-user-${user._id}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium" data-testid={`text-user-name-${user._id}`}>
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground" data-testid={`text-user-email-${user._id}`}>
                              {user.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isAdmin ? "default" : "secondary"} data-testid={`badge-role-${user._id}`}>
                            {user.isAdmin ? (
                              <>
                                <Crown className="w-3 h-3 mr-1" />
                                {user.role || 'Admin'}
                              </>
                            ) : (
                              'User'
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={user.status === 'banned' ? 'destructive' : user.status === 'restricted' ? 'outline' : 'default'}
                            data-testid={`badge-status-${user._id}`}
                          >
                            {user.status || 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-coins-${user._id}`}>
                          {user.coinBalance}
                        </TableCell>
                        <TableCell className="text-xs" data-testid={`text-ip-${user._id}`}>
                          {user.registrationIp}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" onClick={() => setSelectedUser(user)} data-testid={`button-manage-${user._id}`}>
                                  <Settings className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Manage User: {user.firstName} {user.lastName}</DialogTitle>
                                  <DialogDescription>Update user status, coins, or role</DialogDescription>
                                </DialogHeader>
                                
                                <div className="grid gap-4 py-4">
                                  <div className="space-y-2">
                                    <Label>Status</Label>
                                    <div className="flex space-x-2">
                                      <Button 
                                        size="sm" 
                                        variant={user.status === 'active' ? 'default' : 'outline'}
                                        onClick={() => handleUserStatusChange(user._id, 'active')}
                                        data-testid="button-set-active"
                                      >
                                        <UserCheck className="w-4 h-4 mr-1" />
                                        Active
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant={user.status === 'banned' ? 'destructive' : 'outline'}
                                        onClick={() => handleUserStatusChange(user._id, 'banned')}
                                        data-testid="button-set-banned"
                                      >
                                        <Ban className="w-4 h-4 mr-1" />
                                        Banned
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Coin Adjustment</Label>
                                    <div className="flex space-x-2">
                                      <Input
                                        type="number"
                                        placeholder="Amount (+/-)"
                                        value={coinAdjustment.amount}
                                        onChange={(e) => setCoinAdjustment(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
                                        data-testid="input-coin-amount"
                                      />
                                      <Input
                                        placeholder="Reason"
                                        value={coinAdjustment.reason}
                                        onChange={(e) => setCoinAdjustment(prev => ({ ...prev, reason: e.target.value }))}
                                        data-testid="input-coin-reason"
                                      />
                                    </div>
                                    <Button 
                                      onClick={handleCoinAdjustment}
                                      disabled={!coinAdjustment.reason || coinAdjustment.amount === 0}
                                      data-testid="button-adjust-coins"
                                    >
                                      <Coins className="w-4 h-4 mr-1" />
                                      Update Coins
                                    </Button>
                                  </div>

                                  {!user.isAdmin && (
                                    <div className="space-y-2">
                                      <Label>Promote to Admin</Label>
                                      <Button 
                                        onClick={() => handlePromoteUser(user._id)}
                                        variant="default"
                                        data-testid="button-promote-admin"
                                      >
                                        <Crown className="w-4 h-4 mr-1" />
                                        Promote to Admin
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card data-testid="card-notifications">
            <CardHeader>
              <CardTitle>Admin Notifications</CardTitle>
              <CardDescription>Recent system notifications and alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <p className="text-muted-foreground">No notifications</p>
                ) : (
                  notifications.map((notification) => (
                    <Alert key={notification._id} data-testid={`notification-${notification._id}`}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex justify-between items-start">
                          <div>
                            <strong>{notification.title}</strong>
                            <p>{notification.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(notification.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={notification.read ? "secondary" : "destructive"}>
                            {notification.read ? "Read" : "Unread"}
                          </Badge>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <Card data-testid="card-maintenance">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Wrench className="h-5 w-5" />
                <span>Site Maintenance Mode</span>
              </CardTitle>
              <CardDescription>
                Enable maintenance mode to temporarily shut down the site for all users except admins
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Power className={`h-4 w-4 ${
                      maintenanceStatus?.enabled ? 'text-red-500' : 'text-green-500'
                    }`} />
                    <span className="font-medium">
                      {maintenanceStatus?.enabled ? 'Maintenance Mode Active' : 'Site Operational'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {maintenanceStatus?.enabled 
                      ? 'Site is currently in maintenance mode. Only admins can access the site.' 
                      : 'Site is operational and accessible to all users.'}
                  </p>
                </div>
                <Switch
                  checked={maintenanceStatus?.enabled || false}
                  onCheckedChange={(enabled) => {
                    if (enabled) {
                      // When enabling, use form data
                      toggleMaintenanceMutation.mutate({
                        enabled: true,
                        message: maintenanceForm.message || 'Site is under maintenance. We\'ll be back shortly.',
                        estimatedTime: maintenanceForm.estimatedTime
                      });
                    } else {
                      // When disabling, just turn off
                      toggleMaintenanceMutation.mutate({ enabled: false });
                    }
                  }}
                  disabled={toggleMaintenanceMutation.isPending}
                  data-testid="switch-maintenance"
                />
              </div>

              {!maintenanceStatus?.enabled && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-message">Maintenance Message</Label>
                    <Textarea
                      id="maintenance-message"
                      placeholder="We're performing maintenance to improve your experience. We'll be back shortly."
                      value={maintenanceForm.message}
                      onChange={(e) => setMaintenanceForm(prev => ({ ...prev, message: e.target.value }))}
                      data-testid="textarea-maintenance-message"
                    />
                    <p className="text-xs text-muted-foreground">
                      This message will be displayed to users during maintenance
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="estimated-time">Estimated Completion Time (optional)</Label>
                    <Input
                      id="estimated-time"
                      placeholder="e.g., 2 hours, 30 minutes, etc."
                      value={maintenanceForm.estimatedTime}
                      onChange={(e) => setMaintenanceForm(prev => ({ ...prev, estimatedTime: e.target.value }))}
                      data-testid="input-estimated-time"
                    />
                    <p className="text-xs text-muted-foreground">
                      Let users know how long the maintenance is expected to last
                    </p>
                  </div>
                </div>
              )}

              {maintenanceStatus?.enabled && (
                <Alert data-testid="alert-maintenance-active">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Maintenance Mode is Active</strong>
                    <p className="mt-1">{maintenanceStatus.message || 'Site is under maintenance.'}</p>
                    {maintenanceStatus.estimatedTime && (
                      <p className="text-sm mt-1">Estimated completion: {maintenanceStatus.estimatedTime}</p>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currency" className="space-y-4">
          <Card data-testid="card-currency">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Currency Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure the currency display settings for user coin balances
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency-name">Currency</Label>
                    <Select 
                      value={currencyForm.currency}
                      onValueChange={(value) => setCurrencyForm(prev => ({ ...prev, currency: value }))}
                    >
                      <SelectTrigger data-testid="select-currency">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="NGN">NGN - Nigerian Naira</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                        <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                        <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                        <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="currency-rate">Exchange Rate</Label>
                    <Input
                      id="currency-rate"
                      type="number"
                      step="0.001"
                      placeholder="e.g., 0.1 or 100"
                      value={currencyForm.rate}
                      onChange={(e) => setCurrencyForm(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                      data-testid="input-currency-rate"
                    />
                    <p className="text-xs text-muted-foreground">
                      How much 1 coin equals in the selected currency
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="currency-symbol">Currency Symbol</Label>
                    <Input
                      id="currency-symbol"
                      placeholder="e.g., $, ₦, €"
                      value={currencyForm.symbol}
                      onChange={(e) => setCurrencyForm(prev => ({ ...prev, symbol: e.target.value }))}
                      data-testid="input-currency-symbol"
                    />
                    <p className="text-xs text-muted-foreground">
                      Symbol to display with the currency
                    </p>
                  </div>
                </div>

                {currencySettings && (
                  <Alert>
                    <CreditCard className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Current Setting:</strong> {currencySettings.currency} ({currencySettings.symbol}) 
                      - Rate: {currencySettings.rate} per coin
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    Preview: 100 coins = {currencyForm.symbol}{(100 * currencyForm.rate).toFixed(2)} {currencyForm.currency}
                  </div>
                  <Button 
                    onClick={() => updateCurrencyMutation.mutate(currencyForm)}
                    disabled={updateCurrencyMutation.isPending || !currencyForm.currency || !currencyForm.rate}
                    data-testid="button-update-currency"
                  >
                    {updateCurrencyMutation.isPending ? "Updating..." : "Update Currency Settings"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card data-testid="card-settings">
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
              <CardDescription>Configure deployment costs and other system settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="deployment-cost">Bot Deployment Cost (coins)</Label>
                    <div className="flex space-x-2 mt-2">
                      <Input
                        id="deployment-cost"
                        type="number"
                        placeholder="25"
                        defaultValue={settings.find(s => s.key === 'deployment_cost')?.value || 25}
                        data-testid="input-deployment-cost"
                      />
                      <Button 
                        onClick={() => {
                          const input = document.getElementById('deployment-cost') as HTMLInputElement;
                          const value = parseInt(input.value);
                          updateSettingMutation.mutate({ 
                            key: 'deployment_cost', 
                            value,
                            description: 'Cost in coins for bot deployment'
                          });
                        }}
                        data-testid="button-save-deployment-cost"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="daily-login-bonus">Daily Login Bonus (coins)</Label>
                    <div className="flex space-x-2 mt-2">
                      <Input
                        id="daily-login-bonus"
                        type="number"
                        placeholder="10"
                        defaultValue={settings.find(s => s.key === 'daily_login_bonus')?.value || 10}
                        data-testid="input-daily-bonus"
                      />
                      <Button 
                        onClick={() => {
                          const input = document.getElementById('daily-login-bonus') as HTMLInputElement;
                          const value = parseInt(input.value);
                          updateSettingMutation.mutate({ 
                            key: 'daily_login_bonus', 
                            value,
                            description: 'Daily login bonus in coins'
                          });
                        }}
                        data-testid="button-save-daily-bonus"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deployments-mgmt" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Deployment Creation Form */}
            <Card data-testid="card-create-deployment">
              <CardHeader>
                <CardTitle>Create New Deployment</CardTitle>
                <CardDescription>Deploy a new bot instance with custom configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="app-name">App Name (Branch Name)</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="app-name"
                        placeholder="e.g., my-bot-app"
                        value={deploymentForm.appName}
                        onChange={(e) => {
                          setDeploymentForm(prev => ({ ...prev, appName: e.target.value }));
                          // Auto-check availability after typing stops
                          setTimeout(() => checkBranchAvailability(e.target.value), 500);
                        }}
                        data-testid="input-app-name"
                      />
                      <Button
                        variant="outline"
                        onClick={() => checkBranchAvailability(deploymentForm.appName)}
                        disabled={isCheckingBranch || !deploymentForm.appName.trim()}
                        data-testid="button-check-branch"
                      >
                        {isCheckingBranch ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Check"}
                      </Button>
                    </div>
                    {branchCheckResult && (
                      <Alert variant={branchCheckResult.available ? "default" : "destructive"}>
                        <AlertDescription>
                          {branchCheckResult.message}
                          {branchCheckResult.suggested && (
                            <div className="mt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setDeploymentForm(prev => ({ ...prev, appName: branchCheckResult.suggested }));
                                  setBranchCheckResult({ ...branchCheckResult, available: true, message: 'Name available!' });
                                }}
                                data-testid="button-use-suggested"
                              >
                                Use "{branchCheckResult.suggested}"
                              </Button>
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="session-id">Session ID</Label>
                    <Input
                      id="session-id"
                      placeholder="Enter bot session ID"
                      value={deploymentForm.sessionId}
                      onChange={(e) => setDeploymentForm(prev => ({ ...prev, sessionId: e.target.value }))}
                      data-testid="input-session-id"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="owner-number">Owner Number</Label>
                    <Input
                      id="owner-number"
                      placeholder="Enter owner phone number"
                      value={deploymentForm.ownerNumber}
                      onChange={(e) => setDeploymentForm(prev => ({ ...prev, ownerNumber: e.target.value }))}
                      data-testid="input-owner-number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prefix">Command Prefix</Label>
                    <Input
                      id="prefix"
                      placeholder="e.g., ."
                      value={deploymentForm.prefix}
                      onChange={(e) => setDeploymentForm(prev => ({ ...prev, prefix: e.target.value }))}
                      data-testid="input-prefix"
                    />
                  </div>

                  <Button
                    onClick={handleCreateDeployment}
                    disabled={createDeploymentMutation.isPending || !branchCheckResult?.available}
                    className="w-full"
                    data-testid="button-create-deployment"
                  >
                    {createDeploymentMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        Creating Deployment...
                      </>
                    ) : (
                      <>
                        <Rocket className="h-4 w-4 mr-2" />
                        Create Deployment
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* GitHub Configuration Status */}
            <Card data-testid="card-github-status">
              <CardHeader>
                <CardTitle>GitHub Configuration</CardTitle>
                <CardDescription>Current GitHub repository settings</CardDescription>
              </CardHeader>
              <CardContent>
                {githubData && (githubData as any).repoOwner ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Repository:</span>
                      <Badge variant="secondary">
                        {(githubData as any).repoOwner}/{(githubData as any).repoName}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Main Branch:</span>
                      <Badge variant="outline">{(githubData as any).mainBranch}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Workflow File:</span>
                      <Badge variant="outline">{(githubData as any).workflowFile}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Token Status:</span>
                      <Badge variant={githubSettings.githubToken ? "default" : "destructive"}>
                        {githubSettings.githubToken ? "Configured" : "Missing"}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      GitHub settings not configured. Please configure GitHub settings in the GitHub tab before creating deployments.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Logs Viewer Section */}
          <Card data-testid="card-logs-viewer">
            <CardHeader>
              <CardTitle>App Logs Viewer</CardTitle>
              <CardDescription>View GitHub Actions workflow logs for deployed apps</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* WebSocket Status */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm font-medium">
                      Real-time Updates: {wsConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  {connectionError && (
                    <span className="text-sm text-destructive">{connectionError}</span>
                  )}
                </div>

                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter app name (branch name) to view logs"
                    value={selectedBranchForLogs}
                    onChange={(e) => setSelectedBranchForLogs(e.target.value)}
                    data-testid="input-branch-logs"
                  />
                  <Button
                    onClick={() => fetchWorkflowRuns(selectedBranchForLogs)}
                    disabled={isLoadingLogs || !selectedBranchForLogs.trim()}
                    data-testid="button-fetch-logs"
                  >
                    {isLoadingLogs ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                    View Logs
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => startRealtimeMonitoring(selectedBranchForLogs)}
                    disabled={!wsConnected || !selectedBranchForLogs.trim() || monitoredBranches.has(selectedBranchForLogs)}
                    data-testid="button-monitor-realtime"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    {monitoredBranches.has(selectedBranchForLogs) ? 'Monitoring...' : 'Monitor Live'}
                  </Button>
                </div>

                {/* Real-time Updates Feed */}
                {realtimeUpdates.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                      Real-time Updates
                    </h4>
                    <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3">
                      {realtimeUpdates.slice(0, 10).map((update) => (
                        <div key={update.id} className="flex items-start space-x-2 text-sm">
                          <Badge 
                            variant={
                              update.type === 'completed' 
                                ? (update.conclusion === 'success' ? 'default' : 'destructive')
                                : update.type === 'deployment_created' 
                                ? 'secondary' 
                                : 'outline'
                            }
                          >
                            {update.type === 'deployment_created' ? '🚀' : 
                             update.type === 'completed' ? (update.conclusion === 'success' ? '✅' : '❌') :
                             update.type === 'status_update' ? '⏳' : '⚠️'}
                          </Badge>
                          <div className="flex-1">
                            <p className="font-medium">{update.branch}</p>
                            <p className="text-muted-foreground">{update.message}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(update.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {workflowRuns.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Workflow Runs for {selectedBranchForLogs}</h4>
                    <div className="space-y-2">
                      {workflowRuns.map((run) => (
                        <div key={run.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <Badge variant={run.status === 'completed' ? 'default' : run.status === 'in_progress' ? 'secondary' : 'destructive'}>
                                  {run.status}
                                </Badge>
                                {run.conclusion && (
                                  <Badge variant={run.conclusion === 'success' ? 'default' : 'destructive'}>
                                    {run.conclusion}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Started: {new Date(run.created_at).toLocaleString()}
                              </p>
                              {run.updated_at && (
                                <p className="text-sm text-muted-foreground">
                                  Updated: {new Date(run.updated_at).toLocaleString()}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fetchRunLogs(run.id.toString())}
                              disabled={isLoadingLogs}
                              data-testid={`button-view-run-${run.id}`}
                            >
                              View Logs
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedRunLogs && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Workflow Logs</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRunLogs(null)}
                        data-testid="button-close-logs"
                      >
                        Close
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {selectedRunLogs.logs?.map((jobLog: any, index: number) => (
                        <div key={index} className="border rounded-lg">
                          <div className="bg-muted p-3 border-b">
                            <h5 className="font-medium">{jobLog.jobName}</h5>
                          </div>
                          <div className="p-3">
                            <pre className="text-sm bg-black text-green-400 p-3 rounded overflow-auto max-h-96 whitespace-pre-wrap">
                              {jobLog.logs || 'No logs available'}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {workflowRuns.length === 0 && selectedBranchForLogs && !isLoadingLogs && (
                  <Alert>
                    <AlertDescription>
                      No workflow runs found for "{selectedBranchForLogs}". Make sure the app name is correct and has been deployed.
                      {wsConnected && (
                        <div className="mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startRealtimeMonitoring(selectedBranchForLogs)}
                            disabled={monitoredBranches.has(selectedBranchForLogs)}
                          >
                            Start Real-time Monitoring
                          </Button>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="github" className="space-y-4">
          <Card data-testid="card-github-settings">
            <CardHeader>
              <CardTitle>GitHub Deployment Settings</CardTitle>
              <CardDescription>Configure GitHub repository settings for automated deployments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="github-token">GitHub Personal Access Token</Label>
                  <Input
                    id="github-token"
                    type="password"
                    placeholder="Enter your GitHub token"
                    value={githubSettings.githubToken}
                    onChange={(e) => setGithubSettings(prev => ({ ...prev, githubToken: e.target.value }))}
                    data-testid="input-github-token"
                  />
                  <p className="text-sm text-muted-foreground">
                    Required for GitHub API access. Must have repo and workflow permissions.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="repo-owner">Repository Owner</Label>
                    <Input
                      id="repo-owner"
                      placeholder="e.g., d33l"
                      value={githubSettings.repoOwner}
                      onChange={(e) => setGithubSettings(prev => ({ ...prev, repoOwner: e.target.value }))}
                      data-testid="input-repo-owner"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="repo-name">Repository Name</Label>
                    <Input
                      id="repo-name"
                      placeholder="e.g., SUBZERO-MD"
                      value={githubSettings.repoName}
                      onChange={(e) => setGithubSettings(prev => ({ ...prev, repoName: e.target.value }))}
                      data-testid="input-repo-name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="main-branch">Main Branch</Label>
                    <Input
                      id="main-branch"
                      placeholder="main"
                      value={githubSettings.mainBranch}
                      onChange={(e) => setGithubSettings(prev => ({ ...prev, mainBranch: e.target.value }))}
                      data-testid="input-main-branch"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workflow-file">Workflow File</Label>
                    <Input
                      id="workflow-file"
                      placeholder="SUBZERO.yml"
                      value={githubSettings.workflowFile}
                      onChange={(e) => setGithubSettings(prev => ({ ...prev, workflowFile: e.target.value }))}
                      data-testid="input-workflow-file"
                    />
                  </div>
                </div>

                <Button
                  onClick={() => updateGithubSettingsMutation.mutate(githubSettings)}
                  disabled={updateGithubSettingsMutation.isPending}
                  className="w-full"
                  data-testid="button-save-github-settings"
                >
                  {updateGithubSettingsMutation.isPending ? "Saving..." : "Save GitHub Settings"}
                </Button>

                {githubData && (githubData as any).repoOwner && (
                  <Alert>
                    <Github className="h-4 w-4" />
                    <AlertDescription>
                      Settings configured for: <strong>{(githubData as any).repoOwner}/{(githubData as any).repoName}</strong>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
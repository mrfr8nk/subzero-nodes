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
  TrendingUp
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

export default function AdminDashboard() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [coinAdjustment, setCoinAdjustment] = useState({ amount: 0, reason: "" });
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

  // Update user status mutation
  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, status, restrictions }: { userId: string; status: string; restrictions?: string[] }) => {
      return await apiRequest(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, restrictions }),
      });
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
      return await apiRequest(`/api/admin/users/${userId}/coins`, {
        method: 'PATCH',
        body: JSON.stringify({ amount, reason }),
      });
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
      return await apiRequest(`/api/admin/users/${userId}/promote`, {
        method: 'PATCH',
      });
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
      return await apiRequest(`/api/admin/settings/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ value, description }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      toast({ title: "Setting updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update setting", description: error.message, variant: "destructive" });
    }
  });

  const handleUserStatusChange = (userId: string, status: string) => {
    updateUserStatusMutation.mutate({ userId, status });
  };

  const handlePromoteUser = (userId: string) => {
    promoteUserMutation.mutate(userId);
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
      </Tabs>
    </div>
  );
}
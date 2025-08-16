import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Database, Trash2, RefreshCw, Users, FileText, CreditCard, MessageSquare, Bot, HardDrive } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DatabaseStats {
  totalUsers: number;
  activeUsers: number;
  totalDeployments: number;
  activeDeployments: number;
  totalTransactions: number;
  totalVouchers: number;
  totalChatMessages: number;
  storageSize: {
    users: number;
    deployments: number;
    transactions: number;
    chatMessages: number;
    vouchers: number;
    total: number;
  };
  lastCleanup?: string;
}

interface DatabaseCleanupResult {
  deletedUsers: number;
  deletedMessages: number;
  deletedDeployments: number;
  totalSaved: number;
  success: boolean;
}

export default function AdminDatabaseStats() {
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading, refetch } = useQuery<DatabaseStats>({
    queryKey: ['/api/admin/database/stats'],
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/database/cleanup', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json() as Promise<DatabaseCleanupResult>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/database/stats'] });
      toast({
        title: "Database Cleanup Complete",
        description: `Deleted ${result.totalSaved} items (${result.deletedUsers} users, ${result.deletedMessages} messages, ${result.deletedDeployments} deployments)`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Cleanup Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCleanup = () => {
    if (window.confirm('Are you sure you want to perform database cleanup? This will permanently delete inactive users, old messages, and failed deployments.')) {
      cleanupMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6" />
          Database Usage Statistics
        </h1>
        <div className="flex gap-2">
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={handleCleanup}
            variant="destructive"
            size="sm"
            disabled={cleanupMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {cleanupMutation.isPending ? "Cleaning..." : "Cleanup"}
          </Button>
        </div>
      </div>

      {stats && (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.activeUsers.toLocaleString()} active (30 days)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Deployments</CardTitle>
                <Bot className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalDeployments.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.activeDeployments.toLocaleString()} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTransactions.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalVouchers.toLocaleString()} vouchers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalChatMessages.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Chat messages
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Storage Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Storage Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="text-center">
                  <div className="font-semibold text-sm text-muted-foreground">Users</div>
                  <div className="text-lg font-bold">{formatBytes(stats.storageSize.users)}</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm text-muted-foreground">Deployments</div>
                  <div className="text-lg font-bold">{formatBytes(stats.storageSize.deployments)}</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm text-muted-foreground">Transactions</div>
                  <div className="text-lg font-bold">{formatBytes(stats.storageSize.transactions)}</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm text-muted-foreground">Messages</div>
                  <div className="text-lg font-bold">{formatBytes(stats.storageSize.chatMessages)}</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm text-muted-foreground">Vouchers</div>
                  <div className="text-lg font-bold">{formatBytes(stats.storageSize.vouchers)}</div>
                </div>
                <div className="text-center border-l-2 border-primary">
                  <div className="font-semibold text-sm text-primary">Total</div>
                  <div className="text-lg font-bold text-primary">{formatBytes(stats.storageSize.total)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Database Health */}
          <Card>
            <CardHeader>
              <CardTitle>Database Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Active User Ratio</span>
                  <Badge variant={stats.activeUsers / stats.totalUsers > 0.3 ? "default" : "secondary"}>
                    {((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Active Deployment Ratio</span>
                  <Badge variant={stats.activeDeployments / stats.totalDeployments > 0.5 ? "default" : "secondary"}>
                    {((stats.activeDeployments / stats.totalDeployments) * 100).toFixed(1)}%
                  </Badge>
                </div>
                {stats.lastCleanup && (
                  <div className="flex items-center justify-between">
                    <span>Last Cleanup</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(stats.lastCleanup).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cleanup Warning */}
          <Alert>
            <Trash2 className="h-4 w-4" />
            <AlertDescription>
              Database cleanup will permanently delete:
              <ul className="list-disc list-inside mt-2 ml-4">
                <li>Inactive users (no login in 90+ days)</li>
                <li>Old chat messages (60+ days old)</li>
                <li>Failed deployments (7+ days old)</li>
              </ul>
              This action cannot be undone.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
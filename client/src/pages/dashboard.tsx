import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Coins, Users, Rocket, Plus, Wallet, Share, Eye, Settings } from "lucide-react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You need to log in to access the dashboard.",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/login");
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast, setLocation]);

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  const { data: activity, isLoading: activityLoading } = useQuery<any[]>({
    queryKey: ["/api/dashboard/activity"],
    retry: false,
  });

  const { data: recentDeployments, isLoading: deploymentsLoading } = useQuery<any[]>({
    queryKey: ["/api/deployments"],
    retry: false,
  });

  if (!isAuthenticated || isLoading) {
    return null;
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "deployment":
        return <Rocket className="w-5 h-5 text-red-600" />;
      case "referral":
        return <Coins className="w-5 h-5 text-blue-600" />;
      case "daily_reward":
        return <Coins className="w-5 h-5 text-green-600" />;
      default:
        return <Coins className="w-5 h-5 text-gray-600" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "deployment":
        return "bg-red-100";
      case "referral":
        return "bg-blue-100";
      case "daily_reward":
        return "bg-green-100";
      default:
        return "bg-gray-100";
    }
  };

  const formatAmount = (amount: number) => {
    return amount > 0 ? `+${amount}` : `${amount}`;
  };

  const getAmountColor = (amount: number) => {
    return amount > 0 ? "text-green-600" : "text-red-600";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Dashboard Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-dashboard-greeting">
          Hello, {user?.firstName || user?.email?.split('@')[0] || 'User'}! 
        </h1>
        <p className="text-muted-foreground">Welcome back! Here's your bot deployment overview.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Active Bots</p>
                <p className="text-3xl font-bold text-foreground">
                  {statsLoading ? "..." : stats?.active || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">+2.5%</span>
              <span className="text-muted-foreground ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Coin Balance</p>
                <p className="text-3xl font-bold text-foreground">
                  {statsLoading ? "..." : stats?.coinBalance || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Coins className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">+150</span>
              <span className="text-muted-foreground ml-1">this week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Referrals</p>
                <p className="text-3xl font-bold text-foreground">
                  {statsLoading ? "..." : stats?.totalReferrals || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">+3</span>
              <span className="text-muted-foreground ml-1">this month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Deployments</p>
                <p className="text-3xl font-bold text-foreground">
                  {statsLoading ? "..." : stats?.total || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Rocket className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">+12</span>
              <span className="text-muted-foreground ml-1">this month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityLoading ? (
                  <div className="text-muted-foreground">Loading activity...</div>
                ) : activity && activity.length > 0 ? (
                  activity.map((transaction: any) => (
                    <div key={transaction._id} className="flex items-center space-x-4 p-4 bg-muted rounded-xl">
                      <div className={`w-10 h-10 ${getActivityColor(transaction.type)} rounded-full flex items-center justify-center`}>
                        {getActivityIcon(transaction.type)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">{transaction.type.replace('_', ' ')}</p>
                      </div>
                      <div className="text-right">
                        <span className={`font-semibold ${getAmountColor(transaction.amount)}`}>
                          {formatAmount(transaction.amount)} coins
                        </span>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground text-center py-8">No recent activity</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => setLocation("/deployments")}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 p-4 h-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                Deploy New Bot
              </Button>
              <Button 
                onClick={() => setLocation("/wallet")}
                variant="outline" 
                className="w-full p-4 h-auto border-green-200 text-green-700 hover:bg-green-50"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Add Coins
              </Button>
              <Button 
                onClick={() => setLocation("/referrals")}
                variant="outline" 
                className="w-full p-4 h-auto border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                <Share className="w-4 h-4 mr-2" />
                Share Referral
              </Button>
              <Button 
                onClick={() => setLocation("/account-settings")}
                variant="outline" 
                className="w-full p-4 h-auto border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                <Settings className="w-4 h-4 mr-2" />
                Account Settings
              </Button>
            </CardContent>
          </Card>

          {/* Recent Deployments Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Deployments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {deploymentsLoading ? (
                  <div className="text-gray-500">Loading...</div>
                ) : recentDeployments && recentDeployments.length > 0 ? (
                  recentDeployments.slice(0, 3).map((deployment: any) => (
                    <div key={deployment._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{deployment.name}</p>
                        <p className="text-sm text-gray-600 capitalize">{deployment.status}</p>
                      </div>
                      <span className={`w-3 h-3 rounded-full ${
                        deployment.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                      }`}></span>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-center py-4">No deployments yet</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

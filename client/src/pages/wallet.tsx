import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, ArrowUpRight, ArrowDownLeft, RefreshCw, Clock, Gift } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

interface ClaimStatus {
  canClaim: boolean;
  timeUntilNextClaim: number;
  claimAmount: number;
  lastClaimDate?: string;
}

function formatTimeRemaining(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

export default function Wallet() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/wallet/transactions"],
  });

  // Fetch coin claim status
  const { data: claimStatus, isLoading: claimStatusLoading } = useQuery<ClaimStatus>({
    queryKey: ["/api/coins/claim-status"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Update countdown timer
  useEffect(() => {
    if (!claimStatus || claimStatus.canClaim) {
      setTimeRemaining(0);
      return;
    }

    const updateTimer = () => {
      setTimeRemaining(Math.max(0, claimStatus.timeUntilNextClaim));
    };

    // Initial update
    updateTimer();

    // Update every second and decrease the remaining time
    const interval = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [claimStatus]);

  // Claim coins mutation
  const claimMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/coins/claim", "POST");
    },
    onSuccess: (data: any) => {
      toast({
        title: "Coins Claimed!",
        description: `You received ${data.amount} coins. New balance: ${data.newBalance}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coins/claim-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to claim coins",
        variant: "destructive",
      });
    },
  });

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Wallet</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your coins and view transaction history</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Current Balance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user.coinBalance || 0} Coins</div>
            <p className="text-xs text-muted-foreground">Available for deployments</p>
          </CardContent>
        </Card>

        {/* Daily Claim */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Coin Claim</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {claimStatusLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            ) : claimStatus?.canClaim ? (
              <div className="space-y-3">
                <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                  Ready to claim {claimStatus.claimAmount} coins!
                </div>
                <Button 
                  onClick={() => claimMutation.mutate()}
                  disabled={claimMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-claim-coins"
                >
                  {claimMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Claiming...
                    </>
                  ) : (
                    <>
                      <Gift className="mr-2 h-4 w-4" />
                      Claim {claimStatus.claimAmount} Coins
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className="text-sm text-muted-foreground">
                    Next claim available in:
                  </span>
                </div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {formatTimeRemaining(timeRemaining)}
                </div>
                <div className="text-sm text-muted-foreground">
                  You can claim {claimStatus?.claimAmount || 50} coins every 24 hours
                </div>
                {claimStatus?.lastClaimDate && (
                  <div className="text-xs text-muted-foreground">
                    Last claimed: {format(new Date(claimStatus.lastClaimDate), "MMM d, yyyy 'at' h:mm a")}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4">
                  <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="flex-1 space-y-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div key={transaction._id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${
                      transaction.amount > 0 
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                    }`}>
                      {transaction.amount > 0 ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownLeft className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{transaction.description}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(transaction.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </div>
                    </div>
                  </div>
                  <div className={`font-semibold ${
                    transaction.amount > 0 
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount} coins
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transactions yet</p>
              <p className="text-sm">Your transaction history will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
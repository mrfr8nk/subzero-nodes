import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Plus, Gift, History, Check, Minus } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import ClaimModal from "@/components/claim-modal";
import { useState } from "react";

export default function Wallet() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { toast } = useToast();
  const [showClaimModal, setShowClaimModal] = useState(false);

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

  const { data: transactions, isLoading: transactionsLoading } = useQuery<any[]>({
    queryKey: ["/api/wallet/transactions"],
    retry: false,
  });

  // Fetch currency settings
  const { data: currencySettings } = useQuery<{currency: string, rate: number, symbol: string}>({
    queryKey: ["/api/currency"],
    retry: false,
  });

  const claimDailyMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/wallet/claim-daily");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Daily reward claimed successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
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
        description: "Failed to claim daily reward",
        variant: "destructive",
      });
    },
  });

  if (!isAuthenticated || isLoading) {
    return null;
  }

  const getTransactionIcon = (type: string, amount: number) => {
    if (amount > 0) {
      return <Plus className="w-5 h-5 text-green-600" />;
    } else {
      return <Minus className="w-5 h-5 text-red-600" />;
    }
  };

  const getTransactionColor = (amount: number) => {
    return amount > 0 ? "bg-green-100" : "bg-red-100";
  };

  const formatAmount = (amount: number) => {
    return amount > 0 ? `+${amount}` : `${amount}`;
  };

  const getAmountColor = (amount: number) => {
    return amount > 0 ? "text-green-600" : "text-red-600";
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Wallet</h1>
        <p className="text-gray-600">Manage your coins and track your spending.</p>
      </div>

      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl p-8 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-blue-200 mb-2">Current Balance</p>
            <p className="text-4xl font-bold">{user?.coinBalance || 0} Coins</p>
            {currencySettings && (
              <p className="text-blue-200 mt-2">
                ≈ {currencySettings.symbol}{((user?.coinBalance || 0) * currencySettings.rate).toFixed(2)} {currencySettings.currency}
              </p>
            )}
          </div>
          <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center">
            <Coins className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Card className="border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer group">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-green-100 group-hover:bg-green-200 rounded-xl flex items-center justify-center mb-4 transition-colors">
              <Plus className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Add Coins</h3>
            <p className="text-gray-600 text-sm">Purchase more coins for deployments</p>
          </CardContent>
        </Card>

        <Card 
          className="border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer group"
          onClick={() => setShowClaimModal(true)}
        >
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-orange-100 group-hover:bg-orange-200 rounded-xl flex items-center justify-center mb-4 transition-colors">
              <Gift className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Claim Rewards</h3>
            <p className="text-gray-600 text-sm">Claim daily and referral rewards</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer group">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-blue-100 group-hover:bg-blue-200 rounded-xl flex items-center justify-center mb-4 transition-colors">
              <History className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Transaction History</h3>
            <p className="text-gray-600 text-sm">View all coin transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader className="border-b border-gray-200">
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {transactionsLoading ? (
              <div className="text-gray-500">Loading transactions...</div>
            ) : transactions && transactions.length > 0 ? (
              transactions.map((transaction: any) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 ${getTransactionColor(transaction.amount)} rounded-full flex items-center justify-center`}>
                      {getTransactionIcon(transaction.type, transaction.amount)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{transaction.description}</p>
                      <p className="text-sm text-gray-600 capitalize">{transaction.type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${getAmountColor(transaction.amount)}`}>
                      {formatAmount(transaction.amount)} coins
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-center py-8">No transactions yet</div>
            )}
          </div>
        </CardContent>
      </Card>

      <ClaimModal 
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        onClaimDaily={() => claimDailyMutation.mutate()}
        isClaimingDaily={claimDailyMutation.isPending}
      />
    </div>
  );
}

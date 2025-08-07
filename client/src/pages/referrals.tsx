import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Coins, Calendar, Share, Copy, UserPlus, Gift } from "lucide-react";

export default function Referrals() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [referralLink, setReferralLink] = useState("");

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

  const { data: referralStats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/referrals/stats"],
    retry: false,
  });

  const { data: referrals, isLoading: referralsLoading } = useQuery<any[]>({
    queryKey: ["/api/referrals"],
    retry: false,
  });

  useEffect(() => {
    if (referralStats?.referralCode) {
      // Use current domain for referral links
      const currentDomain = window.location.origin;
      setReferralLink(`${currentDomain}/signup?ref=${referralStats.referralCode}`);
    }
  }, [referralStats]);

  const copyReferralLink = async () => {
    if (referralLink) {
      try {
        await navigator.clipboard.writeText(referralLink);
        toast({
          title: "Success",
          description: "Referral link copied to clipboard!",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to copy referral link",
          variant: "destructive",
        });
      }
    }
  };

  const shareReferralLink = async () => {
    if (navigator.share && referralLink) {
      try {
        await navigator.share({
          title: "Join SUBZERO-MD",
          text: "Deploy WhatsApp bots easily with SUBZERO-MD!",
          url: referralLink,
        });
      } catch (error) {
        // Fallback to copy
        copyReferralLink();
      }
    } else {
      copyReferralLink();
    }
  };

  if (!isAuthenticated || isLoading) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Referral Program</h1>
        <p className="text-gray-600">Invite friends and earn coins for every successful referral.</p>
      </div>

      {/* Referral Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-200 mb-1">Total Referrals</p>
              <p className="text-3xl font-bold">
                {statsLoading ? "..." : referralStats?.totalReferrals || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-200 mb-1">Coins Earned</p>
              <p className="text-3xl font-bold">
                {statsLoading ? "..." : referralStats?.referralEarnings || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <Coins className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 mb-1">This Month</p>
              <p className="text-3xl font-bold">
                {statsLoading ? "..." : referralStats?.monthlyReferrals || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Referral Link Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Input 
              value={referralLink}
              readOnly
              className="flex-1 bg-gray-50"
              placeholder="Loading referral link..."
            />
            <Button onClick={copyReferralLink} variant="outline">
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
            <Button onClick={shareReferralLink} className="bg-green-600 hover:bg-green-700">
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            Share this link with friends and earn <strong>50 coins</strong> for each successful signup!
          </p>
        </CardContent>
      </Card>

      {/* How it Works */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Share className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">1. Share Your Link</h4>
              <p className="text-gray-600 text-sm">Share your unique referral link with friends and family.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">2. Friend Signs Up</h4>
              <p className="text-gray-600 text-sm">When someone signs up using your link, they become your referral.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Gift className="w-8 h-8 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">3. Earn Rewards</h4>
              <p className="text-gray-600 text-sm">You earn 50 coins instantly when they complete registration.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral History */}
      <Card>
        <CardHeader>
          <CardTitle>Referral History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {referralsLoading ? (
              <div className="text-gray-500">Loading referrals...</div>
            ) : referrals && referrals.length > 0 ? (
              referrals.map((referral: any) => (
                <div key={referral.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">New Referral</p>
                      <p className="text-sm text-gray-600">
                        Joined {new Date(referral.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      +{referral.rewardAmount} coins
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-center py-8">No referrals yet</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

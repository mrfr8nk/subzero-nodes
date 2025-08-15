import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Gift, Loader2 } from "lucide-react";

export default function VoucherRedeem() {
  const [code, setCode] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const redeemMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch('/api/vouchers/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message);
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({ 
        title: "Voucher Redeemed!", 
        description: data.message,
      });
      setCode("");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Redemption Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      redeemMutation.mutate(code.trim().toUpperCase());
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Gift className="h-5 w-5" />
          Redeem Voucher
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="voucherCode">Voucher Code</Label>
            <Input
              id="voucherCode"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Enter your voucher code"
              className="font-mono"
              disabled={redeemMutation.isPending}
            />
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={!code.trim() || redeemMutation.isPending}
          >
            {redeemMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Redeeming...
              </>
            ) : (
              "Redeem Voucher"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
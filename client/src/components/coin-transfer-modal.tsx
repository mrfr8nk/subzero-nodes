import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, User, Mail } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CoinTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  userBalance: number;
}

export default function CoinTransferModal({ 
  isOpen, 
  onClose,
  userBalance 
}: CoinTransferModalProps) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const transferMutation = useMutation({
    mutationFn: async (data: { toEmailOrUsername: string; amount: number; message: string }) => {
      return await apiRequest('/api/coins/transfer', 'POST', data);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Transfer Successful!",
        description: `Successfully sent ${data.amount} coins to ${data.recipient}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/coins/transfers'] });
      onClose();
      setRecipient("");
      setAmount("");
      setMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Transfer Failed",
        description: error.message || "Failed to transfer coins",
        variant: "destructive",
      });
    },
  });

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountNum = parseInt(amount);
    if (!recipient.trim() || !amountNum || amountNum <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid recipient and amount",
        variant: "destructive",
      });
      return;
    }

    if (amountNum > userBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You only have ${userBalance} coins available`,
        variant: "destructive",
      });
      return;
    }

    transferMutation.mutate({
      toEmailOrUsername: recipient.trim(),
      amount: amountNum,
      message: message.trim()
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-blue-600" />
          </div>
          <DialogTitle className="text-2xl font-bold">Send Coins</DialogTitle>
          <p className="text-gray-600">Transfer coins to another user</p>
        </DialogHeader>

        <form onSubmit={handleTransfer} className="space-y-4">
          <div>
            <Label htmlFor="recipient" className="text-sm font-medium">
              Recipient (Email or Username)
            </Label>
            <div className="relative">
              <Input
                id="recipient"
                data-testid="input-recipient"
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="user@example.com or username"
                className="pl-10"
                disabled={transferMutation.isPending}
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                {recipient.includes('@') ? 
                  <Mail className="w-4 h-4 text-gray-400" /> : 
                  <User className="w-4 h-4 text-gray-400" />
                }
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="amount" className="text-sm font-medium">
              Amount
            </Label>
            <Input
              id="amount"
              data-testid="input-amount"
              type="number"
              min="1"
              max={userBalance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              disabled={transferMutation.isPending}
            />
            <p className="text-sm text-gray-500 mt-1">
              Available balance: {userBalance} coins
            </p>
          </div>

          <div>
            <Label htmlFor="message" className="text-sm font-medium">
              Message (Optional)
            </Label>
            <Textarea
              id="message"
              data-testid="input-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a note to your transfer..."
              className="resize-none"
              rows={3}
              disabled={transferMutation.isPending}
            />
          </div>

          <div className="flex space-x-4 pt-4">
            <Button 
              type="button" 
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={transferMutation.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={transferMutation.isPending || !recipient.trim() || !amount || parseInt(amount) <= 0}
              data-testid="button-send"
            >
              {transferMutation.isPending ? "Sending..." : "Send Coins"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
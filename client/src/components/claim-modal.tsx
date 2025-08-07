import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gift, Calendar, Users, Coins } from "lucide-react";

interface ClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaimDaily: () => void;
  isClaimingDaily: boolean;
}

export default function ClaimModal({ 
  isOpen, 
  onClose, 
  onClaimDaily, 
  isClaimingDaily 
}: ClaimModalProps) {
  const handleClaimAll = () => {
    onClaimDaily();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-orange-600" />
          </div>
          <DialogTitle className="text-2xl font-bold">Claim Rewards</DialogTitle>
          <p className="text-gray-600">Claim your available rewards</p>
        </DialogHeader>

        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Calendar className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Daily Reward</p>
                <p className="text-sm text-gray-600">Login bonus</p>
              </div>
            </div>
            <span className="font-bold text-green-600">+10 coins</span>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">Total Claimable:</span>
              <span className="text-2xl font-bold text-blue-600">10 coins</span>
            </div>
          </div>
        </div>

        <div className="flex space-x-4">
          <Button 
            type="button" 
            onClick={onClose}
            variant="outline"
            className="flex-1"
            disabled={isClaimingDaily}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleClaimAll}
            className="flex-1 bg-orange-600 hover:bg-orange-700"
            disabled={isClaimingDaily}
          >
            {isClaimingDaily ? "Claiming..." : "Claim All"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

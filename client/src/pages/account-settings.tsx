import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertTriangle, User, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AccountSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', '/api/user/account');
    },
    onSuccess: () => {
      toast({ 
        title: "Account deleted successfully",
        description: "Your account and all associated data have been permanently deleted.",
      });
      // Redirect to home after deletion
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete account", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate();
    setShowDeleteDialog(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <User className="w-6 h-6" />
        <h1 className="text-2xl font-bold">Account Settings</h1>
      </div>

      {/* Account Information */}
      <Card data-testid="card-account-info">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground mt-1" data-testid="text-user-email">
                {user?.email}
              </p>
            </div>
            <div>
              <Label>Name</Label>
              <p className="text-sm text-muted-foreground mt-1" data-testid="text-user-name">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
            <div>
              <Label>Account Type</Label>
              <p className="text-sm text-muted-foreground mt-1" data-testid="text-user-role">
                {user?.isAdmin ? 'Admin' : 'User'}
              </p>
            </div>
            <div>
              <Label>Coin Balance</Label>
              <p className="text-sm text-muted-foreground mt-1" data-testid="text-user-balance">
                {user?.coinBalance || 0} coins
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200" data-testid="card-danger-zone">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-medium text-red-800 mb-2">Delete Account</h3>
            <p className="text-sm text-red-700 mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
              All your deployments, transactions, and referrals will be permanently removed.
            </p>
            <Button 
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleteAccountMutation.isPending}
              data-testid="button-delete-account"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="dialog-delete-account">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account and remove all your data from our servers. 
              This includes:
              <ul className="mt-2 ml-4 list-disc text-sm">
                <li>All your bot deployments</li>
                <li>Transaction history</li>
                <li>Referral data</li>
                <li>Account settings and preferences</li>
              </ul>
              <strong className="text-red-600">This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAccount}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
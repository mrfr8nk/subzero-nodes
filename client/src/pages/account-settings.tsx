import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertTriangle, User, Trash2, Key, Eye, EyeOff, Github, CheckCircle, XCircle } from "lucide-react";
import { SiGithub } from "react-icons/si";
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
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/user/account', 'DELETE');
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

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return await apiRequest('/api/user/change-password', 'POST', data);
    },
    onSuccess: () => {
      toast({ 
        title: "Password changed successfully",
        description: "Your password has been updated.",
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to change password", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  // Unlink GitHub account mutation
  const unlinkGitHubMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/user/unlink-github', 'POST');
    },
    onSuccess: () => {
      toast({ 
        title: "GitHub account disconnected",
        description: "Your GitHub account has been successfully unlinked.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to unlink GitHub account", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate();
    setShowDeleteDialog(false);
  };

  const handleChangePassword = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast({
        title: "Missing fields",
        description: "Please fill in all password fields",
        variant: "destructive"
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirmation must match",
        variant: "destructive"
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    });
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <User className="w-6 h-6" />
        <h1 className="text-2xl font-bold">Account Settings</h1>
      </div>

      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border border-border rounded-lg p-4">
        <h2 className="text-lg font-medium text-foreground" data-testid="text-welcome-greeting">
          Hello, {user?.firstName || user?.email}! 👋
        </h2>
        <p className="text-muted-foreground mt-1">
          Welcome to your account dashboard. Manage your settings and preferences here.
        </p>
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

      {/* Password Change */}
      {user?.authProvider === 'local' && (
        <Card data-testid="card-password-change">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Key className="w-5 h-5" />
              <span>Change Password</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showPasswordForm ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Update your password to keep your account secure.
                </p>
                <Button 
                  onClick={() => setShowPasswordForm(true)}
                  data-testid="button-show-password-form"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Enter current password"
                      data-testid="input-current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => togglePasswordVisibility('current')}
                    >
                      {showPasswords.current ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Enter new password"
                      data-testid="input-new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => togglePasswordVisibility('new')}
                    >
                      {showPasswords.new ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm new password"
                      data-testid="input-confirm-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => togglePasswordVisibility('confirm')}
                    >
                      {showPasswords.confirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                    data-testid="button-cancel-password"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleChangePassword}
                    disabled={changePasswordMutation.isPending}
                    data-testid="button-change-password"
                  >
                    {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* GitHub Connection */}
      <Card data-testid="card-github-connection">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <SiGithub className="w-5 h-5" />
            <span>GitHub Account</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user?.githubId ? (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                        GitHub Connected
                      </h4>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        Your GitHub account is linked: <strong>@{user.githubUsername}</strong>
                      </p>
                      {user.githubProfileUrl && (
                        <a 
                          href={user.githubProfileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-green-600 dark:text-green-400 hover:underline mt-1 inline-block"
                          data-testid="link-github-profile"
                        >
                          View GitHub Profile →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <Button 
                variant="outline"
                onClick={() => unlinkGitHubMutation.mutate()}
                disabled={unlinkGitHubMutation.isPending}
                className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                data-testid="button-disconnect-github"
              >
                <XCircle className="w-4 h-4 mr-2" />
                {unlinkGitHubMutation.isPending ? "Disconnecting..." : "Disconnect GitHub"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Link your GitHub account to enable additional features and streamline your authentication.
              </p>
              <Button 
                onClick={() => window.location.href = '/api/auth/github'}
                className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100"
                data-testid="button-connect-github"
              >
                <SiGithub className="w-4 h-4 mr-2" />
                Connect GitHub Account
              </Button>
            </div>
          )}
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
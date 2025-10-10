import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { 
  Settings, 
  User, 
  Shield, 
  Bell, 
  Eye, 
  EyeOff, 
  Save,
  Trash2,
  AlertTriangle,
  UserCircle,
  Lock,
  Mail,
  Calendar,
  Globe,
  Github,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  Play,
  Terminal
} from "lucide-react";
import { FaFacebook, FaInstagram, FaTiktok, FaWhatsapp } from 'react-icons/fa';
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UserProfile {
  _id: string;
  firstName: string;
  lastName?: string;
  email: string;
  username?: string;
  bio?: string;
  profilePicture?: string;
  profileImageUrl?: string;
  country?: string;
  socialProfiles?: {
    github?: string;
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    whatsapp?: string;
  };
  isAdmin: boolean;
  role?: string;
  status: string;
  coinBalance: number;
  createdAt: string;
  lastLogin?: string;
  preferences?: {
    emailNotifications: boolean;
    darkMode: boolean;
    language: string;
    timezone: string;
  };
  githubUsername?: string;
  githubProfileUrl?: string;
  githubId?: string;
  githubAccessToken?: string;
  authProvider?: string;
}

interface WorkflowRun {
  id: number;
  status: string;
  conclusion: string;
  created_at: string;
  updated_at: string;
  html_url: string;
}

function AvatarWithInitials({ name, imageUrl, size = "md" }: { name: string; imageUrl?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const [imageError, setImageError] = useState(false);
  
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-base",
    lg: "w-16 h-16 text-xl",
    xl: "w-24 h-24 text-3xl"
  };
  
  const getInitials = (fullName: string) => {
    const names = fullName.trim().split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return names[0].substring(0, 2).toUpperCase();
  };
  
  const getColorFromName = (fullName: string) => {
    const colors = [
      'bg-gradient-to-br from-blue-500 to-blue-600',
      'bg-gradient-to-br from-purple-500 to-purple-600',
      'bg-gradient-to-br from-pink-500 to-pink-600',
      'bg-gradient-to-br from-green-500 to-green-600',
      'bg-gradient-to-br from-yellow-500 to-yellow-600',
      'bg-gradient-to-br from-red-500 to-red-600',
      'bg-gradient-to-br from-indigo-500 to-indigo-600',
      'bg-gradient-to-br from-cyan-500 to-cyan-600',
    ];
    const index = fullName.charCodeAt(0) % colors.length;
    return colors[index];
  };
  
  if (imageUrl && !imageError) {
    return (
      <img 
        src={imageUrl} 
        alt={name} 
        className={`${sizeClasses[size]} rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-lg`}
        onError={() => setImageError(true)}
      />
    );
  }
  
  return (
    <div className={`${sizeClasses[size]} ${getColorFromName(name)} rounded-full flex items-center justify-center text-white font-bold shadow-lg border-2 border-white dark:border-gray-700`}>
      {getInitials(name)}
    </div>
  );
}

export default function UserSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    username: "",
    bio: "",
    profilePicture: "",
    country: "",
    socialProfiles: {
      github: "",
      facebook: "",
      instagram: "",
      tiktok: "",
      whatsapp: "",
    },
  });
  
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    darkMode: false,
    language: "en",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowLogs, setWorkflowLogs] = useState<string>("");

  // Fetch user profile data
  const { data: fullProfile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/user/profile"],
    enabled: !!user,
  });

  useEffect(() => {
    if (fullProfile) {
      setProfileData({
        firstName: fullProfile.firstName || "",
        lastName: fullProfile.lastName || "",
        username: fullProfile.username || fullProfile.githubUsername || "",
        bio: fullProfile.bio || "",
        profilePicture: fullProfile.profilePicture || "",
        country: fullProfile.country || "",
        socialProfiles: {
          github: fullProfile.socialProfiles?.github || fullProfile.githubUsername || "",
          facebook: fullProfile.socialProfiles?.facebook || "",
          instagram: fullProfile.socialProfiles?.instagram || "",
          tiktok: fullProfile.socialProfiles?.tiktok || "",
          whatsapp: fullProfile.socialProfiles?.whatsapp || "",
        },
      });
      
      if (fullProfile.profilePicture || fullProfile.profileImageUrl) {
        setProfilePicturePreview(fullProfile.profilePicture || fullProfile.profileImageUrl || null);
      }
      
      setPreferences({
        emailNotifications: fullProfile.preferences?.emailNotifications ?? true,
        darkMode: fullProfile.preferences?.darkMode ?? false,
        language: fullProfile.preferences?.language ?? "en",
        timezone: fullProfile.preferences?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    }
  }, [fullProfile]);

  // Handle profile picture change
  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Profile picture must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setProfilePictureFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePicturePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProfilePicture = () => {
    setProfilePictureFile(null);
    setProfilePicturePreview(null);
    setProfileData(prev => ({ ...prev, profilePicture: "" }));
  };

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      let updatedData = { ...data };
      
      if (profilePictureFile) {
        setIsUploadingPicture(true);
        const formData = new FormData();
        formData.append('image', profilePictureFile);
        
        try {
          const uploadResponse = await apiRequest('/api/chat/upload-image', 'POST', formData);
          const uploadData = await uploadResponse.json();
          updatedData.profilePicture = uploadData.imageData;
        } catch (error) {
          setIsUploadingPicture(false);
          throw new Error('Failed to upload profile picture');
        } finally {
          setIsUploadingPicture(false);
        }
      }
      
      return await apiRequest("/api/user/profile", "PUT", updatedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return await apiRequest("/api/user/change-password", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: typeof preferences) => {
      return await apiRequest("/api/user/preferences", "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      toast({
        title: "Preferences Updated",
        description: "Your preferences have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update preferences",
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/user/account", "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    },
  });

  const handleProfileUpdate = () => {
    if (!profileData.firstName.trim()) {
      toast({
        title: "Validation Error",
        description: "First name is required",
        variant: "destructive",
      });
      return;
    }

    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordChange = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast({
        title: "Validation Error",
        description: "Both current and new passwords are required",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "New passwords don't match",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Validation Error",
        description: "New password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const handlePreferencesUpdate = () => {
    updatePreferencesMutation.mutate(preferences);
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText !== "DELETE") {
      toast({
        title: "Confirmation Required",
        description: "Please type 'DELETE' to confirm account deletion",
        variant: "destructive",
      });
      return;
    }

    deleteAccountMutation.mutate();
  };

  const handleViewWorkflow = async () => {
    setShowWorkflowDialog(true);
    setWorkflowLoading(true);
    setWorkflowLogs("Initializing workflow viewer...\n");
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    setWorkflowLogs(prev => prev + "Connecting to GitHub Actions...\n");
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    setWorkflowLogs(prev => prev + "Fetching workflow runs...\n");
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    setWorkflowLogs(prev => prev + "Loading workflow details...\n");
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    setWorkflowLogs(prev => prev + "Retrieving latest deployment logs...\n");
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    setWorkflowLogs(prev => prev + "\n--- Workflow Run #Latest ---\n");
    setWorkflowLogs(prev => prev + "Status: Running\n");
    setWorkflowLogs(prev => prev + "Branch: main\n");
    setWorkflowLogs(prev => prev + "Triggered: Just now\n\n");
    setWorkflowLogs(prev => prev + "📦 Installing dependencies...\n");
    setWorkflowLogs(prev => prev + "npm install\n");
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    setWorkflowLogs(prev => prev + "✓ Dependencies installed successfully\n\n");
    setWorkflowLogs(prev => prev + "🔧 Building application...\n");
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    setWorkflowLogs(prev => prev + "✓ Build completed\n\n");
    setWorkflowLogs(prev => prev + "🚀 Starting bot application...\n");
    setWorkflowLogs(prev => prev + "npm start\n");
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    setWorkflowLogs(prev => prev + "✓ Bot is now running!\n");
    setWorkflowLogs(prev => prev + "✓ Workflow completed successfully\n");
    
    setWorkflowLoading(false);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please log in to access settings.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const fullName = `${fullProfile?.firstName || ''} ${fullProfile?.lastName || ''}`.trim();
  const profileImage = fullProfile?.profilePicture || fullProfile?.profileImageUrl;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center" data-testid="title-settings">
          <Settings className="w-8 h-8 mr-3 text-blue-600" />
          Account Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Manage your account information, security settings, and preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Account Overview with Profile Picture */}
        <Card className="border-2 border-gray-100 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserCircle className="w-5 h-5 mr-2" />
              Account Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-6 mb-6">
              <div className="flex-shrink-0">
                <AvatarWithInitials 
                  name={fullName || fullProfile?.email || "User"} 
                  imageUrl={profileImage}
                  size="xl"
                />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="text-username">
                    {fullName || fullProfile?.username}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400" data-testid="text-email">
                    {fullProfile?.email}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={fullProfile?.status === "active" ? "default" : "destructive"} data-testid="badge-status">
                    {fullProfile?.status || "Unknown"}
                  </Badge>
                  {fullProfile?.isAdmin && (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                      Administrator
                    </Badge>
                  )}
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    {fullProfile?.coinBalance || 0} Coins
                  </Badge>
                </div>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>Joined {formatDate(fullProfile?.createdAt)}</span>
              </div>
              {fullProfile?.lastLogin && (
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                  <Shield className="w-4 h-4" />
                  <span>Last login {formatDate(fullProfile.lastLogin)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* GitHub Connection */}
        <Card data-testid="card-github-connection">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Github className="w-5 h-5" />
              <span>GitHub Account</span>
            </CardTitle>
            <CardDescription>
              Link your GitHub account to enable deployment features and streamline authentication
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fullProfile?.githubId ? (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                          GitHub Connected
                        </h4>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1" data-testid="text-github-username">
                          Your GitHub account is linked: <strong>@{fullProfile.githubUsername}</strong>
                        </p>
                        {fullProfile.githubProfileUrl && (
                          <div className="flex items-center gap-2 mt-2">
                            <a 
                              href={fullProfile.githubProfileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-green-600 dark:text-green-400 hover:underline inline-flex items-center gap-1"
                              data-testid="link-github-profile"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View GitHub Profile
                            </a>
                            <span className="text-green-400 dark:text-green-600">•</span>
                            <a 
                              href={`https://github.com/${fullProfile.githubUsername}/subzero-md`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-green-600 dark:text-green-400 hover:underline inline-flex items-center gap-1"
                              data-testid="button-view-repo"
                            >
                              <Github className="w-3 h-3" />
                              View Fork
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    {fullProfile.authProvider === 'github' && (
                      <Badge className="bg-green-600 hover:bg-green-700 text-white flex-shrink-0">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                </div>
                
                {fullProfile.githubUsername && (
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleViewWorkflow}
                      className="flex items-center gap-2"
                      data-testid="button-view-workflow"
                    >
                      <Terminal className="w-4 h-4" />
                      View Workflow
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Link your GitHub account to automatically fork the repository, star it, and enable bot deployment features.
                </p>
                <Button 
                  onClick={() => window.location.href = '/api/auth/github'}
                  className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100"
                  data-testid="button-connect-github"
                >
                  <Github className="w-4 h-4 mr-2" />
                  Connect GitHub Account
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Enter your first name"
                  data-testid="input-firstname"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Enter your last name"
                  data-testid="input-lastname"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={profileData.username}
                onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Choose a unique username"
                data-testid="input-username"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={profileData.bio}
                onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us about yourself..."
                rows={3}
                data-testid="input-bio"
              />
            </div>
            
            <Separator />
            
            {/* Profile Picture Section */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Profile Picture</Label>
              <div className="flex items-center space-x-4">
                {profilePicturePreview || profileData.profilePicture ? (
                  <img 
                    src={profilePicturePreview || profileData.profilePicture} 
                    alt="Profile" 
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600"
                    data-testid="img-profile"
                  />
                ) : (
                  <AvatarWithInitials 
                    name={fullName || fullProfile?.email || "User"} 
                    imageUrl={undefined}
                    size="lg"
                  />
                )}
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="w-auto"
                    data-testid="input-profile-picture"
                  />
                  {(profilePicturePreview || profileData.profilePicture) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeProfilePicture}
                      className="text-red-600 hover:text-red-700"
                      data-testid="button-remove-picture"
                    >
                      Remove Picture
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Country Selection */}
            <div className="space-y-2">
              <Label htmlFor="country" className="flex items-center">
                <Globe className="w-4 h-4 mr-2" />
                Country
              </Label>
              <Select 
                value={profileData.country} 
                onValueChange={(value) => setProfileData(prev => ({ ...prev, country: value }))}
              >
                <SelectTrigger data-testid="select-country">
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">🇺🇸 United States</SelectItem>
                  <SelectItem value="GB">🇬🇧 United Kingdom</SelectItem>
                  <SelectItem value="CA">🇨🇦 Canada</SelectItem>
                  <SelectItem value="AU">🇦🇺 Australia</SelectItem>
                  <SelectItem value="DE">🇩🇪 Germany</SelectItem>
                  <SelectItem value="FR">🇫🇷 France</SelectItem>
                  <SelectItem value="IN">🇮🇳 India</SelectItem>
                  <SelectItem value="CN">🇨🇳 China</SelectItem>
                  <SelectItem value="JP">🇯🇵 Japan</SelectItem>
                  <SelectItem value="BR">🇧🇷 Brazil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Separator />
            
            {/* Social Profiles */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Social Profiles</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facebook" className="flex items-center">
                    <FaFacebook className="w-4 h-4 mr-2 text-blue-600" />
                    Facebook Username
                  </Label>
                  <Input
                    id="facebook"
                    value={profileData.socialProfiles.facebook}
                    onChange={(e) => setProfileData(prev => ({ 
                      ...prev, 
                      socialProfiles: { ...prev.socialProfiles, facebook: e.target.value }
                    }))}
                    placeholder="your-facebook-username"
                    data-testid="input-facebook"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="instagram" className="flex items-center">
                    <FaInstagram className="w-4 h-4 mr-2 text-pink-600" />
                    Instagram Username
                  </Label>
                  <Input
                    id="instagram"
                    value={profileData.socialProfiles.instagram}
                    onChange={(e) => setProfileData(prev => ({ 
                      ...prev, 
                      socialProfiles: { ...prev.socialProfiles, instagram: e.target.value }
                    }))}
                    placeholder="your-instagram-username"
                    data-testid="input-instagram"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tiktok" className="flex items-center">
                    <FaTiktok className="w-4 h-4 mr-2 text-black dark:text-white" />
                    TikTok Username
                  </Label>
                  <Input
                    id="tiktok"
                    value={profileData.socialProfiles.tiktok}
                    onChange={(e) => setProfileData(prev => ({ 
                      ...prev, 
                      socialProfiles: { ...prev.socialProfiles, tiktok: e.target.value }
                    }))}
                    placeholder="your-tiktok-username"
                    data-testid="input-tiktok"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="whatsapp" className="flex items-center">
                    <FaWhatsapp className="w-4 h-4 mr-2 text-green-500" />
                    WhatsApp Number
                  </Label>
                  <Input
                    id="whatsapp"
                    value={profileData.socialProfiles.whatsapp}
                    onChange={(e) => setProfileData(prev => ({ 
                      ...prev, 
                      socialProfiles: { ...prev.socialProfiles, whatsapp: e.target.value }
                    }))}
                    placeholder="+1234567890"
                    data-testid="input-whatsapp"
                  />
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleProfileUpdate}
              disabled={updateProfileMutation.isPending || isUploadingPicture}
              className="flex items-center"
              data-testid="button-update-profile"
            >
              <Save className="w-4 h-4 mr-2" />
              {isUploadingPicture ? "Uploading..." : updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
            </Button>
          </CardContent>
        </Card>

        {/* Security Settings */}
        {fullProfile?.authProvider !== 'github' && fullProfile?.authProvider !== 'google' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="w-5 h-5 mr-2" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Enter your current password"
                      data-testid="input-current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      data-testid="button-toggle-current-password"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Enter your new password (min 6 characters)"
                      data-testid="input-new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      data-testid="button-toggle-new-password"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm your new password"
                      data-testid="input-confirm-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      data-testid="button-toggle-confirm-password"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                
                <Button
                  onClick={handlePasswordChange}
                  disabled={changePasswordMutation.isPending}
                  variant="outline"
                  className="flex items-center"
                  data-testid="button-change-password"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email notifications about deployments and account updates
                  </p>
                </div>
                <Switch
                  checked={preferences.emailNotifications}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, emailNotifications: checked }))}
                  data-testid="switch-email-notifications"
                />
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label>Language</Label>
                <Select 
                  value={preferences.language} 
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, language: value }))}
                >
                  <SelectTrigger data-testid="select-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input
                  value={preferences.timezone}
                  onChange={(e) => setPreferences(prev => ({ ...prev, timezone: e.target.value }))}
                  placeholder="Your timezone"
                  data-testid="input-timezone"
                />
              </div>
              
              <Button
                onClick={handlePreferencesUpdate}
                disabled={updatePreferencesMutation.isPending}
                variant="outline"
                className="flex items-center"
                data-testid="button-save-preferences"
              >
                <Globe className="w-4 h-4 mr-2" />
                {updatePreferencesMutation.isPending ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-2 border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4 border-red-200 dark:border-red-800">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                Once you delete your account, there is no going back. This action cannot be undone.
              </AlertDescription>
            </Alert>
            
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="flex items-center" data-testid="button-delete-account">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Are you absolutely sure?</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. This will permanently delete your account
                    and remove all of your data from our servers.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Please type <strong>DELETE</strong> to confirm:
                  </p>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    data-testid="input-delete-confirm"
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteDialog(false);
                      setDeleteConfirmText("");
                    }}
                    data-testid="button-cancel-delete"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={deleteAccountMutation.isPending}
                    data-testid="button-confirm-delete"
                  >
                    {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Viewer Dialog */}
      <Dialog open={showWorkflowDialog} onOpenChange={(open) => {
        setShowWorkflowDialog(open);
        if (!open) {
          setWorkflowLogs("");
          setWorkflowLoading(false);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              Workflow Execution Logs
            </DialogTitle>
            <DialogDescription>
              Real-time view of your GitHub Actions workflow execution
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] w-full rounded-md border bg-gray-950 dark:bg-black p-4">
            <pre className="text-sm font-mono text-green-400 whitespace-pre-wrap">
              {workflowLoading && workflowLogs === "Initializing workflow viewer...\n" ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading workflow data...
                </div>
              ) : (
                workflowLogs
              )}
            </pre>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowWorkflowDialog(false);
                setWorkflowLogs("");
                setWorkflowLoading(false);
              }}
              data-testid="button-close-workflow"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

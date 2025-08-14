import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  MessageCircle
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

interface UserProfile {
  _id: string;
  firstName: string;
  lastName?: string;
  email: string;
  username?: string;
  bio?: string;
  profilePicture?: string;
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
        username: fullProfile.username || "",
        bio: fullProfile.bio || "",
        profilePicture: fullProfile.profilePicture || "",
        country: fullProfile.country || "",
        socialProfiles: {
          github: fullProfile.socialProfiles?.github || "",
          facebook: fullProfile.socialProfiles?.facebook || "",
          instagram: fullProfile.socialProfiles?.instagram || "",
          tiktok: fullProfile.socialProfiles?.tiktok || "",
          whatsapp: fullProfile.socialProfiles?.whatsapp || "",
        },
      });
      
      if (fullProfile.profilePicture) {
        setProfilePicturePreview(fullProfile.profilePicture);
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
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
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
      
      // Handle profile picture upload if a new file is selected
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
          <Settings className="w-8 h-8 mr-3 text-blue-600" />
          Account Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Manage your account information, security settings, and preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Account Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserCircle className="w-5 h-5 mr-2" />
              Account Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  Email Address
                </Label>
                <p className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded">
                  {fullProfile?.email}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  Account Status
                </Label>
                <div className="flex items-center space-x-2">
                  <Badge variant={fullProfile?.status === "active" ? "default" : "destructive"}>
                    {fullProfile?.status || "Unknown"}
                  </Badge>
                  {fullProfile?.isAdmin && (
                    <Badge variant="secondary">Administrator</Badge>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Member Since
                </Label>
                <p className="text-sm text-muted-foreground">
                  {formatDate(fullProfile?.createdAt)}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Coin Balance
                </Label>
                <p className="text-sm font-semibold text-blue-600">
                  {fullProfile?.coinBalance || 0} coins
                </p>
              </div>
            </div>
            
            {fullProfile?.lastLogin && (
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  Last login: {formatDate(fullProfile.lastLogin)}
                </p>
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
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Enter your last name"
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
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <UserCircle className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="w-auto"
                  />
                  {(profilePicturePreview || profileData.profilePicture) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeProfilePicture}
                      className="text-red-600 hover:text-red-700"
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
                <SelectTrigger>
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AF">🇦🇫 Afghanistan</SelectItem>
                  <SelectItem value="AL">🇦🇱 Albania</SelectItem>
                  <SelectItem value="DZ">🇩🇿 Algeria</SelectItem>
                  <SelectItem value="AD">🇦🇩 Andorra</SelectItem>
                  <SelectItem value="AO">🇦🇴 Angola</SelectItem>
                  <SelectItem value="AG">🇦🇬 Antigua and Barbuda</SelectItem>
                  <SelectItem value="AR">🇦🇷 Argentina</SelectItem>
                  <SelectItem value="AM">🇦🇲 Armenia</SelectItem>
                  <SelectItem value="AU">🇦🇺 Australia</SelectItem>
                  <SelectItem value="AT">🇦🇹 Austria</SelectItem>
                  <SelectItem value="AZ">🇦🇿 Azerbaijan</SelectItem>
                  <SelectItem value="BS">🇧🇸 Bahamas</SelectItem>
                  <SelectItem value="BH">🇧🇭 Bahrain</SelectItem>
                  <SelectItem value="BD">🇧🇩 Bangladesh</SelectItem>
                  <SelectItem value="BB">🇧🇧 Barbados</SelectItem>
                  <SelectItem value="BY">🇧🇾 Belarus</SelectItem>
                  <SelectItem value="BE">🇧🇪 Belgium</SelectItem>
                  <SelectItem value="BZ">🇧🇿 Belize</SelectItem>
                  <SelectItem value="BJ">🇧🇯 Benin</SelectItem>
                  <SelectItem value="BT">🇧🇹 Bhutan</SelectItem>
                  <SelectItem value="BO">🇧🇴 Bolivia</SelectItem>
                  <SelectItem value="BA">🇧🇦 Bosnia and Herzegovina</SelectItem>
                  <SelectItem value="BW">🇧🇼 Botswana</SelectItem>
                  <SelectItem value="BR">🇧🇷 Brazil</SelectItem>
                  <SelectItem value="BN">🇧🇳 Brunei</SelectItem>
                  <SelectItem value="BG">🇧🇬 Bulgaria</SelectItem>
                  <SelectItem value="BF">🇧🇫 Burkina Faso</SelectItem>
                  <SelectItem value="BI">🇧🇮 Burundi</SelectItem>
                  <SelectItem value="CV">🇨🇻 Cape Verde</SelectItem>
                  <SelectItem value="KH">🇰🇭 Cambodia</SelectItem>
                  <SelectItem value="CM">🇨🇲 Cameroon</SelectItem>
                  <SelectItem value="CA">🇨🇦 Canada</SelectItem>
                  <SelectItem value="CF">🇨🇫 Central African Republic</SelectItem>
                  <SelectItem value="TD">🇹🇩 Chad</SelectItem>
                  <SelectItem value="CL">🇨🇱 Chile</SelectItem>
                  <SelectItem value="CN">🇨🇳 China</SelectItem>
                  <SelectItem value="CO">🇨🇴 Colombia</SelectItem>
                  <SelectItem value="KM">🇰🇲 Comoros</SelectItem>
                  <SelectItem value="CG">🇨🇬 Congo</SelectItem>
                  <SelectItem value="CD">🇨🇩 Congo (Democratic Republic)</SelectItem>
                  <SelectItem value="CR">🇨🇷 Costa Rica</SelectItem>
                  <SelectItem value="CI">🇨🇮 Côte d'Ivoire</SelectItem>
                  <SelectItem value="HR">🇭🇷 Croatia</SelectItem>
                  <SelectItem value="CU">🇨🇺 Cuba</SelectItem>
                  <SelectItem value="CY">🇨🇾 Cyprus</SelectItem>
                  <SelectItem value="CZ">🇨🇿 Czech Republic</SelectItem>
                  <SelectItem value="DK">🇩🇰 Denmark</SelectItem>
                  <SelectItem value="DJ">🇩🇯 Djibouti</SelectItem>
                  <SelectItem value="DM">🇩🇲 Dominica</SelectItem>
                  <SelectItem value="DO">🇩🇴 Dominican Republic</SelectItem>
                  <SelectItem value="EC">🇪🇨 Ecuador</SelectItem>
                  <SelectItem value="EG">🇪🇬 Egypt</SelectItem>
                  <SelectItem value="SV">🇸🇻 El Salvador</SelectItem>
                  <SelectItem value="GQ">🇬🇶 Equatorial Guinea</SelectItem>
                  <SelectItem value="ER">🇪🇷 Eritrea</SelectItem>
                  <SelectItem value="EE">🇪🇪 Estonia</SelectItem>
                  <SelectItem value="SZ">🇸🇿 Eswatini</SelectItem>
                  <SelectItem value="ET">🇪🇹 Ethiopia</SelectItem>
                  <SelectItem value="FJ">🇫🇯 Fiji</SelectItem>
                  <SelectItem value="FI">🇫🇮 Finland</SelectItem>
                  <SelectItem value="FR">🇫🇷 France</SelectItem>
                  <SelectItem value="GA">🇬🇦 Gabon</SelectItem>
                  <SelectItem value="GM">🇬🇲 Gambia</SelectItem>
                  <SelectItem value="GE">🇬🇪 Georgia</SelectItem>
                  <SelectItem value="DE">🇩🇪 Germany</SelectItem>
                  <SelectItem value="GH">🇬🇭 Ghana</SelectItem>
                  <SelectItem value="GR">🇬🇷 Greece</SelectItem>
                  <SelectItem value="GD">🇬🇩 Grenada</SelectItem>
                  <SelectItem value="GT">🇬🇹 Guatemala</SelectItem>
                  <SelectItem value="GN">🇬🇳 Guinea</SelectItem>
                  <SelectItem value="GW">🇬🇼 Guinea-Bissau</SelectItem>
                  <SelectItem value="GY">🇬🇾 Guyana</SelectItem>
                  <SelectItem value="HT">🇭🇹 Haiti</SelectItem>
                  <SelectItem value="HN">🇭🇳 Honduras</SelectItem>
                  <SelectItem value="HU">🇭🇺 Hungary</SelectItem>
                  <SelectItem value="IS">🇮🇸 Iceland</SelectItem>
                  <SelectItem value="IN">🇮🇳 India</SelectItem>
                  <SelectItem value="ID">🇮🇩 Indonesia</SelectItem>
                  <SelectItem value="IR">🇮🇷 Iran</SelectItem>
                  <SelectItem value="IQ">🇮🇶 Iraq</SelectItem>
                  <SelectItem value="IE">🇮🇪 Ireland</SelectItem>
                  <SelectItem value="IL">🇮🇱 Israel</SelectItem>
                  <SelectItem value="IT">🇮🇹 Italy</SelectItem>
                  <SelectItem value="JM">🇯🇲 Jamaica</SelectItem>
                  <SelectItem value="JP">🇯🇵 Japan</SelectItem>
                  <SelectItem value="JO">🇯🇴 Jordan</SelectItem>
                  <SelectItem value="KZ">🇰🇿 Kazakhstan</SelectItem>
                  <SelectItem value="KE">🇰🇪 Kenya</SelectItem>
                  <SelectItem value="KI">🇰🇮 Kiribati</SelectItem>
                  <SelectItem value="KP">🇰🇵 North Korea</SelectItem>
                  <SelectItem value="KR">🇰🇷 South Korea</SelectItem>
                  <SelectItem value="KW">🇰🇼 Kuwait</SelectItem>
                  <SelectItem value="KG">🇰🇬 Kyrgyzstan</SelectItem>
                  <SelectItem value="LA">🇱🇦 Laos</SelectItem>
                  <SelectItem value="LV">🇱🇻 Latvia</SelectItem>
                  <SelectItem value="LB">🇱🇧 Lebanon</SelectItem>
                  <SelectItem value="LS">🇱🇸 Lesotho</SelectItem>
                  <SelectItem value="LR">🇱🇷 Liberia</SelectItem>
                  <SelectItem value="LY">🇱🇾 Libya</SelectItem>
                  <SelectItem value="LI">🇱🇮 Liechtenstein</SelectItem>
                  <SelectItem value="LT">🇱🇹 Lithuania</SelectItem>
                  <SelectItem value="LU">🇱🇺 Luxembourg</SelectItem>
                  <SelectItem value="MG">🇲🇬 Madagascar</SelectItem>
                  <SelectItem value="MW">🇲🇼 Malawi</SelectItem>
                  <SelectItem value="MY">🇲🇾 Malaysia</SelectItem>
                  <SelectItem value="MV">🇲🇻 Maldives</SelectItem>
                  <SelectItem value="ML">🇲🇱 Mali</SelectItem>
                  <SelectItem value="MT">🇲🇹 Malta</SelectItem>
                  <SelectItem value="MH">🇲🇭 Marshall Islands</SelectItem>
                  <SelectItem value="MR">🇲🇷 Mauritania</SelectItem>
                  <SelectItem value="MU">🇲🇺 Mauritius</SelectItem>
                  <SelectItem value="MX">🇲🇽 Mexico</SelectItem>
                  <SelectItem value="FM">🇫🇲 Micronesia</SelectItem>
                  <SelectItem value="MD">🇲🇩 Moldova</SelectItem>
                  <SelectItem value="MC">🇲🇨 Monaco</SelectItem>
                  <SelectItem value="MN">🇲🇳 Mongolia</SelectItem>
                  <SelectItem value="ME">🇲🇪 Montenegro</SelectItem>
                  <SelectItem value="MA">🇲🇦 Morocco</SelectItem>
                  <SelectItem value="MZ">🇲🇿 Mozambique</SelectItem>
                  <SelectItem value="MM">🇲🇲 Myanmar</SelectItem>
                  <SelectItem value="NA">🇳🇦 Namibia</SelectItem>
                  <SelectItem value="NR">🇳🇷 Nauru</SelectItem>
                  <SelectItem value="NP">🇳🇵 Nepal</SelectItem>
                  <SelectItem value="NL">🇳🇱 Netherlands</SelectItem>
                  <SelectItem value="NZ">🇳🇿 New Zealand</SelectItem>
                  <SelectItem value="NI">🇳🇮 Nicaragua</SelectItem>
                  <SelectItem value="NE">🇳🇪 Niger</SelectItem>
                  <SelectItem value="NG">🇳🇬 Nigeria</SelectItem>
                  <SelectItem value="MK">🇲🇰 North Macedonia</SelectItem>
                  <SelectItem value="NO">🇳🇴 Norway</SelectItem>
                  <SelectItem value="OM">🇴🇲 Oman</SelectItem>
                  <SelectItem value="PK">🇵🇰 Pakistan</SelectItem>
                  <SelectItem value="PW">🇵🇼 Palau</SelectItem>
                  <SelectItem value="PA">🇵🇦 Panama</SelectItem>
                  <SelectItem value="PG">🇵🇬 Papua New Guinea</SelectItem>
                  <SelectItem value="PY">🇵🇾 Paraguay</SelectItem>
                  <SelectItem value="PE">🇵🇪 Peru</SelectItem>
                  <SelectItem value="PH">🇵🇭 Philippines</SelectItem>
                  <SelectItem value="PL">🇵🇱 Poland</SelectItem>
                  <SelectItem value="PT">🇵🇹 Portugal</SelectItem>
                  <SelectItem value="QA">🇶🇦 Qatar</SelectItem>
                  <SelectItem value="RO">🇷🇴 Romania</SelectItem>
                  <SelectItem value="RU">🇷🇺 Russia</SelectItem>
                  <SelectItem value="RW">🇷🇼 Rwanda</SelectItem>
                  <SelectItem value="KN">🇰🇳 Saint Kitts and Nevis</SelectItem>
                  <SelectItem value="LC">🇱🇨 Saint Lucia</SelectItem>
                  <SelectItem value="VC">🇻🇨 Saint Vincent and the Grenadines</SelectItem>
                  <SelectItem value="WS">🇼🇸 Samoa</SelectItem>
                  <SelectItem value="SM">🇸🇲 San Marino</SelectItem>
                  <SelectItem value="ST">🇸🇹 São Tomé and Príncipe</SelectItem>
                  <SelectItem value="SA">🇸🇦 Saudi Arabia</SelectItem>
                  <SelectItem value="SN">🇸🇳 Senegal</SelectItem>
                  <SelectItem value="RS">🇷🇸 Serbia</SelectItem>
                  <SelectItem value="SC">🇸🇨 Seychelles</SelectItem>
                  <SelectItem value="SL">🇸🇱 Sierra Leone</SelectItem>
                  <SelectItem value="SG">🇸🇬 Singapore</SelectItem>
                  <SelectItem value="SK">🇸🇰 Slovakia</SelectItem>
                  <SelectItem value="SI">🇸🇮 Slovenia</SelectItem>
                  <SelectItem value="SB">🇸🇧 Solomon Islands</SelectItem>
                  <SelectItem value="SO">🇸🇴 Somalia</SelectItem>
                  <SelectItem value="ZA">🇿🇦 South Africa</SelectItem>
                  <SelectItem value="SS">🇸🇸 South Sudan</SelectItem>
                  <SelectItem value="ES">🇪🇸 Spain</SelectItem>
                  <SelectItem value="LK">🇱🇰 Sri Lanka</SelectItem>
                  <SelectItem value="SD">🇸🇩 Sudan</SelectItem>
                  <SelectItem value="SR">🇸🇷 Suriname</SelectItem>
                  <SelectItem value="SE">🇸🇪 Sweden</SelectItem>
                  <SelectItem value="CH">🇨🇭 Switzerland</SelectItem>
                  <SelectItem value="SY">🇸🇾 Syria</SelectItem>
                  <SelectItem value="TW">🇹🇼 Taiwan</SelectItem>
                  <SelectItem value="TJ">🇹🇯 Tajikistan</SelectItem>
                  <SelectItem value="TZ">🇹🇿 Tanzania</SelectItem>
                  <SelectItem value="TH">🇹🇭 Thailand</SelectItem>
                  <SelectItem value="TL">🇹🇱 Timor-Leste</SelectItem>
                  <SelectItem value="TG">🇹🇬 Togo</SelectItem>
                  <SelectItem value="TO">🇹🇴 Tonga</SelectItem>
                  <SelectItem value="TT">🇹🇹 Trinidad and Tobago</SelectItem>
                  <SelectItem value="TN">🇹🇳 Tunisia</SelectItem>
                  <SelectItem value="TR">🇹🇷 Turkey</SelectItem>
                  <SelectItem value="TM">🇹🇲 Turkmenistan</SelectItem>
                  <SelectItem value="TV">🇹🇻 Tuvalu</SelectItem>
                  <SelectItem value="UG">🇺🇬 Uganda</SelectItem>
                  <SelectItem value="UA">🇺🇦 Ukraine</SelectItem>
                  <SelectItem value="AE">🇦🇪 United Arab Emirates</SelectItem>
                  <SelectItem value="GB">🇬🇧 United Kingdom</SelectItem>
                  <SelectItem value="US">🇺🇸 United States</SelectItem>
                  <SelectItem value="UY">🇺🇾 Uruguay</SelectItem>
                  <SelectItem value="UZ">🇺🇿 Uzbekistan</SelectItem>
                  <SelectItem value="VU">🇻🇺 Vanuatu</SelectItem>
                  <SelectItem value="VA">🇻🇦 Vatican City</SelectItem>
                  <SelectItem value="VE">🇻🇪 Venezuela</SelectItem>
                  <SelectItem value="VN">🇻🇳 Vietnam</SelectItem>
                  <SelectItem value="YE">🇾🇪 Yemen</SelectItem>
                  <SelectItem value="ZM">🇿🇲 Zambia</SelectItem>
                  <SelectItem value="ZW">🇿🇼 Zimbabwe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />
            
            {/* Social Profiles Section */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Social Profiles</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="github" className="flex items-center">
                    <Github className="w-4 h-4 mr-2" />
                    GitHub Username
                  </Label>
                  <Input
                    id="github"
                    value={profileData.socialProfiles.github}
                    onChange={(e) => setProfileData(prev => ({ 
                      ...prev, 
                      socialProfiles: { ...prev.socialProfiles, github: e.target.value }
                    }))}
                    placeholder="your-github-username"
                  />
                </div>
                
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
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="instagram" className="flex items-center">
                    <FaInstagram className="w-4 h-4 mr-2 text-pink-500" />
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
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
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
                  />
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleProfileUpdate}
              disabled={updateProfileMutation.isPending || isUploadingPicture}
              className="flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {isUploadingPicture ? "Uploading..." : updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
            </Button>
          </CardContent>
        </Card>

        {/* Security Settings */}
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
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
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
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowNewPassword(!showNewPassword)}
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
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
              >
                <Lock className="w-4 h-4 mr-2" />
                {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
              </Button>
            </div>
          </CardContent>
        </Card>

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
                />
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label>Language</Label>
                <Select 
                  value={preferences.language} 
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, language: value }))}
                >
                  <SelectTrigger>
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
                />
              </div>
              
              <Button
                onClick={handlePreferencesUpdate}
                disabled={updatePreferencesMutation.isPending}
                variant="outline"
                className="flex items-center"
              >
                <Globe className="w-4 h-4 mr-2" />
                {updatePreferencesMutation.isPending ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Once you delete your account, there is no going back. This action cannot be undone.
              </AlertDescription>
            </Alert>
            
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="flex items-center">
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
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteDialog(false);
                      setDeleteConfirmText("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={deleteAccountMutation.isPending}
                  >
                    {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  UserCircle, 
  Calendar, 
  Shield, 
  Github, 
  Facebook, 
  Instagram, 
  MessageCircle,
  Phone,
  Music2,
  ExternalLink,
  Copy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username: string;
}

interface UserProfileData {
  _id: string;
  firstName: string;
  lastName?: string;
  email: string;
  username?: string;
  bio?: string;
  profilePicture?: string;
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
}

export default function UserProfileModal({ isOpen, onClose, userId, username }: UserProfileModalProps) {
  const { toast } = useToast();
  
  const { data: userProfile, isLoading } = useQuery<UserProfileData>({
    queryKey: ["/api/user/profile", userId],
    enabled: isOpen && !!userId,
  });

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const handleSocialProfileClick = (platform: string, username: string) => {
    let url = "";
    switch (platform) {
      case "github":
        url = `https://github.com/${username}`;
        break;
      case "facebook":
        url = `https://facebook.com/${username}`;
        break;
      case "instagram":
        url = `https://instagram.com/${username}`;
        break;
      case "tiktok":
        url = `https://tiktok.com/@${username}`;
        break;
      case "whatsapp":
        url = `https://wa.me/${username.replace(/[^\d]/g, '')}`;
        break;
    }
    if (url) {
      window.open(url, "_blank");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long", 
      day: "numeric",
    });
  };

  const getInitials = (firstName: string, lastName?: string) => {
    return `${firstName.charAt(0)}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <UserCircle className="w-5 h-5 mr-2" />
            User Profile
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : userProfile ? (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16">
                {userProfile.profilePicture ? (
                  <AvatarImage src={userProfile.profilePicture} alt={userProfile.firstName} />
                ) : (
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-lg font-semibold">
                    {getInitials(userProfile.firstName, userProfile.lastName)}
                  </AvatarFallback>
                )}
              </Avatar>
              
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {userProfile.firstName} {userProfile.lastName}
                </h3>
                {userProfile.username && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    @{userProfile.username}
                  </p>
                )}
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant={userProfile.status === "active" ? "default" : "destructive"} className="text-xs">
                    {userProfile.status}
                  </Badge>
                  {userProfile.isAdmin && (
                    <Badge variant="secondary" className="text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Bio */}
            {userProfile.bio && (
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                  "{userProfile.bio}"
                </p>
              </div>
            )}

            <Separator />

            {/* Account Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Joined
                </span>
                <span className="text-sm font-medium">
                  {formatDate(userProfile.createdAt)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Email
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">
                    {userProfile.email}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleCopyToClipboard(userProfile.email, "Email")}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Social Profiles */}
            {userProfile.socialProfiles && Object.values(userProfile.socialProfiles).some(val => val) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Social Profiles
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {userProfile.socialProfiles.github && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        onClick={() => handleSocialProfileClick("github", userProfile.socialProfiles!.github!)}
                      >
                        <Github className="w-4 h-4 mr-2" />
                        GitHub
                        <ExternalLink className="w-3 h-3 ml-auto" />
                      </Button>
                    )}
                    
                    {userProfile.socialProfiles.facebook && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        onClick={() => handleSocialProfileClick("facebook", userProfile.socialProfiles!.facebook!)}
                      >
                        <Facebook className="w-4 h-4 mr-2" />
                        Facebook
                        <ExternalLink className="w-3 h-3 ml-auto" />
                      </Button>
                    )}
                    
                    {userProfile.socialProfiles.instagram && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        onClick={() => handleSocialProfileClick("instagram", userProfile.socialProfiles!.instagram!)}
                      >
                        <Instagram className="w-4 h-4 mr-2" />
                        Instagram
                        <ExternalLink className="w-3 h-3 ml-auto" />
                      </Button>
                    )}
                    
                    {userProfile.socialProfiles.tiktok && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        onClick={() => handleSocialProfileClick("tiktok", userProfile.socialProfiles!.tiktok!)}
                      >
                        <Music2 className="w-4 h-4 mr-2" />
                        TikTok
                        <ExternalLink className="w-3 h-3 ml-auto" />
                      </Button>
                    )}
                    
                    {userProfile.socialProfiles.whatsapp && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start col-span-2"
                        onClick={() => handleSocialProfileClick("whatsapp", userProfile.socialProfiles!.whatsapp!)}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        WhatsApp: {userProfile.socialProfiles.whatsapp}
                        <ExternalLink className="w-3 h-3 ml-auto" />
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              Unable to load user profile
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
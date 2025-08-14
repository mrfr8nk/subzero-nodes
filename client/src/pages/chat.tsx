import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Send, Users, Shield, Ban, MessageCircle, Crown, ChevronDown, Reply, Edit3, Trash2, MoreVertical, ImagePlus, X, Check, Square, CheckSquare } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { getDeviceFingerprint } from "@/lib/deviceFingerprint";
import { apiRequest } from "@/lib/queryClient";
import UserProfileModal from "@/components/user-profile-modal";

interface ChatMessage {
  _id: string;
  userId: string;
  username: string;
  message: string;
  isAdmin: boolean;
  role?: string;
  tags?: string[];
  isTagged?: boolean;
  replyTo?: string;
  replyToMessage?: string;
  replyToUsername?: string;
  isEdited?: boolean;
  editHistory?: { content: string; editedAt: string }[];
  messageType?: 'text' | 'image' | 'file';
  imageUrl?: string;
  imageData?: string;
  fileName?: string;
  fileSize?: number;
  createdAt: string;
}

interface ChatUser {
  userId: string;
  username: string;
  isAdmin: boolean;
  role?: string;
  isRestricted: boolean;
}

export default function Chat() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<ChatUser[]>([]);
  const [isRestricted, setIsRestricted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUsername, setSelectedUsername] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user) return;

    // Connect to WebSocket
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = async () => {
      setIsConnected(true);
      
      // Generate device fingerprint for device ban checking
      let deviceFingerprint: string | undefined;
      try {
        deviceFingerprint = await getDeviceFingerprint();
      } catch (error) {
        console.error('Error generating device fingerprint:', error);
      }
      
      // Join chat room
      ws.send(JSON.stringify({
        type: 'join_chat',
        userId: user._id?.toString() || user.email || '',
        username: user.firstName || user.email?.split('@')[0] || 'User',
        isAdmin: !!isAdmin,
        role: user.role || (isAdmin ? 'admin' : 'user'),
        deviceFingerprint
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'chat_message':
            setMessages(prev => [...prev, data.message]);
            break;
          case 'message_updated':
            setMessages(prev => prev.map(msg => 
              msg._id === data.messageId ? { ...msg, message: data.content, isEdited: true } : msg
            ));
            break;
          case 'message_deleted':
            setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
            break;
          case 'messages_deleted':
            setMessages(prev => prev.filter(msg => !data.messageIds.includes(msg._id)));
            break;
          case 'user_joined':
            setOnlineUsers(prev => {
              const exists = prev.find(u => u.userId === data.user.userId);
              if (!exists) {
                return [...prev, data.user];
              }
              return prev;
            });
            break;
          case 'user_left':
            setOnlineUsers(prev => prev.filter(u => u.userId !== data.userId));
            break;
          case 'users_list':
            setOnlineUsers(data.users);
            break;
          case 'chat_history':
            setMessages(data.messages);
            break;
          case 'user_restricted':
            if (data.userId === (user._id?.toString() || user.email)) {
              setIsRestricted(true);
              toast({
                title: "Chat Restricted",
                description: "You have been restricted from chatting.",
                variant: "destructive",
              });
            }
            // Update user list
            setOnlineUsers(prev => prev.map(u => 
              u.userId === data.userId ? { ...u, isRestricted: true } : u
            ));
            break;
          case 'user_unrestricted':
            if (data.userId === (user._id?.toString() || user.email)) {
              setIsRestricted(false);
              toast({
                title: "Chat Restriction Lifted",
                description: "You can now chat again.",
              });
            }
            // Update user list
            setOnlineUsers(prev => prev.map(u => 
              u.userId === data.userId ? { ...u, isRestricted: false } : u
            ));
            break;
          case 'error':
            // Handle device ban specifically
            if (data.code === 'DEVICE_BANNED') {
              toast({
                title: "Access Denied",
                description: "Your device has been banned from using the chat service.",
                variant: "destructive",
              });
              // Disconnect and prevent reconnection
              setIsConnected(false);
              ws.close();
            } else {
              toast({
                title: "Error",
                description: data.message,
                variant: "destructive",
              });
            }
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setOnlineUsers([]);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [user, isAdmin, toast]);

  const banUser = async (userId: string, username: string) => {
    if (!isAdmin) return;
    
    try {
      await apiRequest(`/api/admin/users/${userId}/status`, "PATCH", {
        status: "banned",
        restrictions: ["chat_violation"]
      });
      
      toast({
        title: "User Banned",
        description: `${username} has been banned from the platform`,
      });
      
      // Remove user from online users list
      setOnlineUsers(prev => prev.filter(u => u.userId !== userId));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to ban user",
        variant: "destructive",
      });
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!wsRef.current) return;
    
    try {
      // Send deletion via WebSocket for real-time sync
      wsRef.current.send(JSON.stringify({
        type: 'delete_message',
        messageId
      }));
      
      toast({
        title: "Message Deleted",
        description: "Message has been deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  const deleteSelectedMessages = async () => {
    if (selectedMessages.length === 0 || !wsRef.current) return;
    
    try {
      // Send deletion via WebSocket for real-time sync
      wsRef.current.send(JSON.stringify({
        type: 'delete_selected_messages',
        messageIds: selectedMessages
      }));
      
      setSelectedMessages([]);
      setIsSelectionMode(false);
      
      toast({
        title: "Messages Deleted",
        description: `${selectedMessages.length} messages deleted successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete messages",
        variant: "destructive",
      });
    }
  };

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => 
      prev.includes(messageId)
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const selectAllMessages = () => {
    setSelectedMessages(messages.map(m => m._id));
  };

  const deselectAllMessages = () => {
    setSelectedMessages([]);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive",
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImagePreview = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMessage = async () => {
    if (!wsRef.current || isRestricted) return;
    if (!message.trim() && !imageFile) return;

    let messageData: any = {
      type: 'send_message',
      message: message.trim() || '',
      messageType: imageFile ? 'image' : 'text'
    };

    if (replyingTo) {
      messageData.replyTo = replyingTo._id;
      messageData.replyToMessage = replyingTo.message;
      messageData.replyToUsername = replyingTo.username;
    }

    // Handle image upload with loading state
    if (imageFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('image', imageFile);
        
        const uploadResponse = await apiRequest('/api/chat/upload-image', 'POST', formData);
        const uploadData = await uploadResponse.json();

        messageData.imageData = uploadData.imageData;
        messageData.fileName = imageFile.name;
        messageData.fileSize = imageFile.size;
        
      } catch (error) {
        setIsUploading(false);
        toast({
          title: "Upload failed",
          description: "Failed to upload image",
          variant: "destructive",
        });
        return;
      } finally {
        setIsUploading(false);
      }
    }

    wsRef.current.send(JSON.stringify(messageData));
    setMessage("");
    setReplyingTo(null);
    removeImagePreview();
  };

  const startReply = (msg: ChatMessage) => {
    setReplyingTo(msg);
    setEditingMessage(null);
  };

  const startEdit = (msg: ChatMessage) => {
    setEditingMessage(msg._id);
    setEditContent(msg.message);
    setReplyingTo(null);
  };

  const saveEdit = async () => {
    if (!editingMessage || !editContent.trim()) return;

    try {
      await apiRequest(`/api/chat/messages/${editingMessage}`, 'PATCH', {
        content: editContent.trim()
      });

      setMessages(prev => prev.map(msg => 
        msg._id === editingMessage ? { ...msg, message: editContent.trim(), isEdited: true } : msg
      ));

      setEditingMessage(null);
      setEditContent("");
      
      toast({
        title: "Success",
        description: "Message updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update message",
        variant: "destructive",
      });
    }
  };



  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const restrictUser = (userId: string, reason?: string) => {
    if (!wsRef.current || !isAdmin) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'restrict_user',
      userId,
      reason: reason || 'Violating chat guidelines'
    }));
  };

  const unrestrictUser = (userId: string) => {
    if (!wsRef.current || !isAdmin) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'unrestrict_user',
      userId
    }));
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getRoleBadge = (role?: string, isAdmin?: boolean) => {
    if (role === 'super_admin') {
      return <Badge variant="destructive" className="text-xs"><Crown className="w-3 h-3 mr-1" />Super Admin</Badge>;
    }
    if (isAdmin || role === 'admin') {
      return <Badge variant="default" className="text-xs"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
    }
    return null;
  };

  const getTagBadge = (tag: string) => {
    const tagColors: Record<string, string> = {
      '@issue': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      '@request': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      '@query': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    };
    
    return (
      <Badge 
        className={`text-xs ${tagColors[tag] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}
        variant="outline"
      >
        {tag}
      </Badge>
    );
  };

  const highlightTags = (message: string) => {
    const tagRegex = /@(issue|request|query)\b/gi;
    const parts = message.split(tagRegex);
    const result = [];
    
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        // Regular text
        result.push(parts[i]);
      } else {
        // Tag text
        result.push(
          <span key={i} className="font-medium text-blue-600 dark:text-blue-400">
            @{parts[i]}
          </span>
        );
      }
    }
    
    return result;
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 flex flex-col m-4 h-[calc(100vh-2rem)]">
          <CardHeader className="border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                <CardTitle>Community Chat</CardTitle>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
              
              {/* Online Users Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>{onlineUsers.length} online</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
                  <div className="p-2">
                    <div className="font-medium text-sm mb-2 text-gray-600 dark:text-gray-400">
                      Online Users ({onlineUsers.length})
                    </div>
                    <div className="space-y-2">
                      {onlineUsers.map((chatUser) => (
                        <div key={chatUser.userId} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">{chatUser.username}</span>
                              {getRoleBadge(chatUser.role, chatUser.isAdmin)}
                            </div>
                            {chatUser.isRestricted && (
                              <span className="text-xs text-red-500">Restricted</span>
                            )}
                          </div>
                          
                          {isAdmin && chatUser.userId !== (user?._id?.toString() || user?.email) && (
                            <div className="flex space-x-1">
                              {chatUser.isRestricted ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => unrestrictUser(chatUser.userId)}
                                  className="text-xs px-2 py-1 h-6"
                                >
                                  Unrestrict
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => restrictUser(chatUser.userId)}
                                  className="text-xs px-2 py-1 h-6"
                                >
                                  <Ban className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      {onlineUsers.length === 0 && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                          No users online
                        </div>
                      )}
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Selection Mode Toolbar */}
            {isSelectionMode && (
              <div className="border-b p-3 bg-blue-50 dark:bg-blue-900/20 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium">
                    {selectedMessages.length} message{selectedMessages.length !== 1 ? 's' : ''} selected
                  </span>
                  <Button size="sm" variant="outline" onClick={selectAllMessages}>
                    Select All
                  </Button>
                  <Button size="sm" variant="outline" onClick={deselectAllMessages}>
                    Deselect All
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={deleteSelectedMessages}
                    disabled={selectedMessages.length === 0}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete ({selectedMessages.length})
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsSelectionMode(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!isConnected && (
                <Alert>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    Connecting to chat server...
                  </AlertDescription>
                </Alert>
              )}
              
              {messages.map((msg) => (
                <div key={msg._id} className="group">
                  {msg.replyTo && (
                    <div className="ml-12 mb-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-400">
                      <div className="flex items-center space-x-2 mb-2">
                        <Reply className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium text-blue-700 dark:text-blue-300 text-sm">
                          Replying to {msg.replyToUsername}
                        </span>
                      </div>
                      <div className="text-gray-700 dark:text-gray-300 text-sm p-2 bg-white dark:bg-gray-800 rounded border">
                        "{(msg.replyToMessage || '').substring(0, 100)}{(msg.replyToMessage || '').length > 100 ? '...' : ''}"
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start space-x-3">
                    {/* Selection checkbox */}
                    {isSelectionMode && (
                      <Checkbox
                        checked={selectedMessages.includes(msg._id)}
                        onCheckedChange={() => toggleMessageSelection(msg._id)}
                        className="mt-2"
                      />
                    )}
                    
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                      msg.isAdmin ? 'bg-blue-600' : 'bg-gray-600'
                    }`}>
                      {msg.username.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{msg.username}</span>
                        {getRoleBadge(msg.role, msg.isAdmin)}
                        {msg.isEdited && (
                          <span className="text-xs text-muted-foreground">(edited)</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                      
                      {editingMessage === msg._id ? (
                        <div className="space-y-2">
                          <Input
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="text-sm"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                saveEdit();
                              }
                              if (e.key === 'Escape') {
                                setEditingMessage(null);
                                setEditContent("");
                              }
                            }}
                          />
                          <div className="flex space-x-2">
                            <Button size="sm" onClick={saveEdit}>Save</Button>
                            <Button size="sm" variant="outline" onClick={() => {
                              setEditingMessage(null);
                              setEditContent("");
                            }}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* Image display */}
                          {msg.messageType === 'image' && (msg.imageUrl || msg.imageData) && (
                            <div className="max-w-sm">
                              <img
                                src={msg.imageData || msg.imageUrl}
                                alt={msg.fileName || 'Shared image'}
                                className="rounded-lg border max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => {
                                  const imageUrl = msg.imageData || msg.imageUrl;
                                  if (imageUrl) {
                                    window.open(imageUrl, '_blank');
                                  }
                                }}
                                onLoad={() => {
                                  // Add loading state complete indicator if needed
                                }}
                                data-testid={`img-chat-${msg._id}`}
                              />
                              {msg.fileName && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {msg.fileName} {msg.fileSize && `(${(msg.fileSize / 1024).toFixed(1)} KB)`}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Text message */}
                          {msg.message && (
                            <div className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
                              {highlightTags(msg.message)}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {msg.tags && msg.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {msg.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => startReply(msg)}>
                            <Reply className="h-4 w-4 mr-2" />
                            Reply
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setIsSelectionMode(true)}>
                            <CheckSquare className="h-4 w-4 mr-2" />
                            Select Messages
                          </DropdownMenuItem>
                          
                          {/* Quick Reply Shortcuts */}
                          <DropdownMenuItem onClick={() => {
                            setMessage("👍 Thanks!");
                            sendMessage();
                          }}>
                            <span className="mr-2">👍</span>
                            Quick Thanks
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setMessage("👎 Not helpful");
                            sendMessage();
                          }}>
                            <span className="mr-2">👎</span>
                            Not Helpful
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setMessage("✅ Solved!");
                            sendMessage();
                          }}>
                            <span className="mr-2">✅</span>
                            Mark Solved
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => startEdit(msg)}>
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteMessage(msg._id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                          {isAdmin && msg.userId !== (user?._id?.toString() || user?.email) && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => restrictUser(msg.userId)}
                                className="text-yellow-600"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Restrict User
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => banUser(msg.userId, msg.username)}
                                className="text-red-600"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Ban User
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Message Input */}
            <div className="border-t p-4 flex-shrink-0 space-y-3">
              {replyingTo && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border-l-4 border-blue-400">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Reply className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          Replying to {replyingTo.username}
                        </span>
                      </div>
                      <div className="text-sm p-2 bg-white dark:bg-gray-800 rounded border">
                        <div className="text-gray-700 dark:text-gray-300">
                          "{replyingTo.message.substring(0, 100)}{replyingTo.message.length > 100 ? '...' : ''}"
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyingTo(null)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ml-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Image Preview */}
              {imagePreview && (
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border">
                  <div className="flex items-start space-x-3">
                    <img
                      src={imagePreview}
                      alt="Image preview"
                      className="w-20 h-20 object-cover rounded border"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {imageFile?.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {imageFile && `${(imageFile.size / 1024).toFixed(1)} KB`}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={removeImagePreview}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              {isRestricted ? (
                <Alert variant="destructive">
                  <Ban className="w-4 h-4" />
                  <AlertDescription>
                    You are restricted from sending messages.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    💡 Use <span className="font-medium text-blue-600 dark:text-blue-400">@issue</span>, <span className="font-medium text-yellow-600 dark:text-yellow-400">@request</span>, or <span className="font-medium text-green-600 dark:text-green-400">@query</span> to notify admins
                  </div>
                  <div className="flex space-x-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isRestricted || !isConnected}
                      className="flex-shrink-0"
                      title="Upload image"
                    >
                      <ImagePlus className="w-4 h-4" />
                    </Button>
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={replyingTo ? `Replying to ${replyingTo.username}...` : "Type your message... (use @issue, @request, or @query to tag admins)"}
                      className="flex-1"
                      maxLength={500}
                      disabled={isRestricted || !isConnected}
                    />
                    <Button 
                      onClick={sendMessage} 
                      disabled={(!message.trim() && !imageFile) || isRestricted || !isConnected || isUploading}
                      size="sm"
                    >
                      {isUploading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Press Enter to send • Shift+Enter for new line • Images up to 5MB
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Send, Users, Shield, Ban, MessageCircle, Crown, ChevronDown, Reply, Edit3, Trash2, MoreVertical } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { getDeviceFingerprint } from "@/lib/deviceFingerprint";
import { apiRequest } from "@/lib/queryClient";

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
  createdAt: string;
}

interface ChatUser {
  userId: string;
  username: string;
  isAdmin: boolean;
  role?: string;
  isRestricted: boolean;
}

export default function EnhancedChat() {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

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
            setOnlineUsers(prev => prev.map(u => 
              u.userId === data.userId ? { ...u, isRestricted: true } : u
            ));
            break;
          case 'user_unrestricted':
            if (data.userId === (user._id?.toString() || user.email)) {
              setIsRestricted(false);
              toast({
                title: "Chat Unrestricted",
                description: "You can now chat again.",
              });
            }
            setOnlineUsers(prev => prev.map(u => 
              u.userId === data.userId ? { ...u, isRestricted: false } : u
            ));
            break;
          case 'error':
            toast({
              title: "Chat Error",
              description: data.message,
              variant: "destructive",
            });
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
      ws.close();
    };
  }, [user, isAdmin, toast]);

  const sendMessage = () => {
    if (!wsRef.current || !message.trim() || isRestricted) return;

    const messageData: any = {
      type: 'send_message',
      message: message.trim()
    };

    if (replyingTo) {
      messageData.replyTo = replyingTo._id;
      messageData.replyToMessage = replyingTo.message;
      messageData.replyToUsername = replyingTo.username;
    }

    wsRef.current.send(JSON.stringify(messageData));
    setMessage("");
    setReplyingTo(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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

  const deleteMessage = async (messageId: string) => {
    try {
      await apiRequest(`/api/chat/messages/${messageId}`, 'DELETE');
      
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
      
      toast({
        title: "Success",
        description: "Message deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
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

  const getRoleBadge = (role?: string, isAdmin?: boolean) => {
    if (role === 'super_admin' || (isAdmin && role === 'admin')) {
      return <Crown className="w-4 h-4 text-yellow-500" />;
    } else if (isAdmin) {
      return <Shield className="w-4 h-4 text-blue-500" />;
    }
    return null;
  };

  const canEditOrDelete = (msg: ChatMessage) => {
    return msg.userId === (user?._id?.toString() || user?.email) || isAdmin;
  };

  const formatMessageWithTags = (text: string, tags?: string[]) => {
    if (!tags || tags.length === 0) return text;
    
    let formattedText = text;
    tags.forEach(tag => {
      const regex = new RegExp(`(${tag})`, 'gi');
      formattedText = formattedText.replace(regex, `<span class="bg-blue-100 text-blue-800 px-1 rounded font-medium">$1</span>`);
    });
    
    return formattedText;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please log in to access the chat.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
          <MessageCircle className="w-8 h-8 mr-3 text-blue-600" />
          Live Chat
        </h1>
        <p className="text-gray-600 dark:text-gray-300">Connect with other users and get support from admins.</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Chat Messages */}
        <div className="lg:col-span-3">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="border-b border-gray-200 dark:border-gray-700 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="w-5 h-5" />
                  <span>General Chat</span>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm text-muted-foreground">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {isRestricted && (
                <Alert className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You are currently restricted from sending messages. Contact an admin for assistance.
                  </AlertDescription>
                </Alert>
              )}

              {messages.map((msg) => (
                <div key={msg._id} className="group">
                  {msg.replyTo && (
                    <div className="ml-4 mb-2 text-sm text-muted-foreground border-l-2 border-gray-300 pl-2">
                      <span className="font-medium">{msg.replyToUsername}:</span> {msg.replyToMessage}
                    </div>
                  )}
                  
                  <div className="flex items-start space-x-3">
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
                          {new Date(msg.createdAt).toLocaleTimeString()}
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
                        <div className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
                          {msg.tags && msg.tags.length > 0 ? (
                            <div 
                              dangerouslySetInnerHTML={{ 
                                __html: formatMessageWithTags(msg.message, msg.tags) 
                              }} 
                            />
                          ) : (
                            msg.message
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
                          {canEditOrDelete(msg) && (
                            <>
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
                            </>
                          )}
                          {isAdmin && msg.userId !== (user._id?.toString() || user.email) && (
                            <DropdownMenuItem 
                              onClick={() => restrictUser(msg.userId)}
                              className="text-red-600"
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Restrict User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
              
              <div ref={messagesEndRef} />
            </CardContent>

            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              {replyingTo && (
                <div className="mb-3 p-2 bg-gray-100 dark:bg-gray-800 rounded border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-medium">Replying to {replyingTo.username}:</span>
                      <p className="text-muted-foreground truncate">{replyingTo.message}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setReplyingTo(null)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isRestricted ? "You are restricted from chatting" : "Type your message... (Use @issue, @request, @query for admin attention)"}
                  disabled={isRestricted || !isConnected}
                  className="flex-1"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={!message.trim() || isRestricted || !isConnected}
                  className="px-6"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground mt-2">
                Use @issue, @request, or @query in your message to get admin attention
              </p>
            </div>
          </Card>
        </div>

        {/* Online Users */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Online ({onlineUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {onlineUsers.map((chatUser) => (
                  <div key={chatUser.userId} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                        chatUser.isAdmin ? 'bg-blue-600' : 'bg-gray-600'
                      }`}>
                        {chatUser.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{chatUser.username}</span>
                      {getRoleBadge(chatUser.role, chatUser.isAdmin)}
                    </div>
                    
                    {isAdmin && chatUser.userId !== (user._id?.toString() || user.email) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {chatUser.isRestricted ? (
                            <DropdownMenuItem onClick={() => unrestrictUser(chatUser.userId)}>
                              Unrestrict
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => restrictUser(chatUser.userId)}>
                              Restrict
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
                
                {onlineUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No users online
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
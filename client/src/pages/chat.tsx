import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Send, Users, Shield, Ban, MessageCircle, Crown, ChevronDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatMessage {
  _id: string;
  userId: string;
  username: string;
  message: string;
  isAdmin: boolean;
  role?: string;
  tags?: string[];
  isTagged?: boolean;
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

    ws.onopen = () => {
      setIsConnected(true);
      // Join chat room
      ws.send(JSON.stringify({
        type: 'join_chat',
        userId: user._id?.toString() || user.email || '',
        username: user.firstName || user.email?.split('@')[0] || 'User',
        isAdmin: !!isAdmin,
        role: user.role || (isAdmin ? 'admin' : 'user')
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'chat_message':
            setMessages(prev => [...prev, data.message]);
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
            toast({
              title: "Error",
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
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [user, isAdmin, toast]);

  const sendMessage = () => {
    if (!message.trim() || !wsRef.current || isRestricted) return;

    if (wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'send_message',
        message: message.trim()
      }));
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const restrictUser = (userId: string, username: string) => {
    if (!wsRef.current || !isAdmin) return;

    wsRef.current.send(JSON.stringify({
      type: 'restrict_user',
      userId: userId,
      reason: `Restricted by ${user?.firstName || 'Admin'}`
    }));

    toast({
      title: "User Restricted",
      description: `${username} has been restricted from chatting.`,
    });
  };

  const unrestrictUser = (userId: string, username: string) => {
    if (!wsRef.current || !isAdmin) return;

    wsRef.current.send(JSON.stringify({
      type: 'unrestrict_user',
      userId: userId
    }));

    toast({
      title: "User Unrestricted",
      description: `${username} can now chat again.`,
    });
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
                                  onClick={() => unrestrictUser(chatUser.userId, chatUser.username)}
                                  className="text-xs px-2 py-1 h-6"
                                >
                                  Unrestrict
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => restrictUser(chatUser.userId, chatUser.username)}
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
                <div key={msg._id} className="flex flex-col space-y-1">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="font-medium text-sm">{msg.username}</span>
                    {getRoleBadge(msg.role, msg.isAdmin)}
                    {msg.tags && msg.tags.map((tag, index) => (
                      <span key={index}>{getTagBadge(tag)}</span>
                    ))}
                    <span className="text-xs text-gray-500">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                  <div className={`rounded-lg p-3 shadow-sm ${
                    msg.isTagged 
                      ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800' 
                      : 'bg-white dark:bg-gray-800'
                  }`}>
                    <p className="text-sm">{highlightTags(msg.message)}</p>
                    {msg.isTagged && !msg.isAdmin && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 italic">
                        ✓ This message has been sent to admins for review
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Message Input */}
            <div className="border-t p-4 flex-shrink-0">
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
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message... (use @issue, @request, or @query to tag admins)"
                      className="flex-1"
                      maxLength={500}
                  />
                    <Button 
                      onClick={sendMessage} 
                      disabled={!message.trim() || !isConnected}
                      size="sm"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
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
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Menu, X, Shield, Bot, Github, Activity, User, Settings, Home, LayoutDashboard, Rocket, Wallet, Users, Crown, MessageCircle, Database } from "lucide-react";

export default function Navbar() {
  const [location] = useLocation();
  const { user, isAdmin } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const isActive = (path: string) => {
    return location === path;
  };

  const navItems = [
    { path: "/dashboard", label: "Home", icon: Home },
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/deployments", label: "Deployments", icon: Rocket },
    { path: "/wallet", label: "Wallet", icon: Wallet },
    { path: "/referrals", label: "Referrals", icon: Users },
    { path: "/premium", label: "Premium", icon: Crown, special: true },
    { path: "/chat", label: "Chat", icon: MessageCircle },
    { path: "/user-settings", label: "Settings", icon: Settings },
    ...(isAdmin ? [
      { path: "/admin/dashboard", label: "Admin", icon: Shield },
      { path: "/admin/github", label: "GitHub", icon: Github },
      { path: "/admin/api-test", label: "API Test", icon: Activity },
      { path: "/admin/database", label: "Database", icon: Database }
    ] : []),
  ];

  return (
    <nav className="bg-white dark:bg-slate-900 shadow-sm border-b border-gray-200 dark:border-slate-700 sticky top-0 z-50 backdrop-blur-md bg-opacity-95 dark:bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Link href={user ? "/dashboard" : "/"} className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center p-1">
                <img 
                  src="/icon.svg" 
                  alt="SUBZERO NODES" 
                  className="w-full h-full rounded object-contain"
                  onError={(e) => {
                    // Fallback to Bot icon if image fails to load
                    e.currentTarget.style.display = 'none';
                    const botIcon = e.currentTarget.nextElementSibling as HTMLElement;
                    if (botIcon) botIcon.style.display = 'block';
                  }}
                />
                <Bot className="w-5 h-5 text-white hidden" />
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white tracking-wide">SUBZERO NODES</span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link 
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-2 font-medium transition-colors ${
                    item.special
                      ? "text-purple-600 dark:text-purple-400 font-semibold hover:text-purple-700 dark:hover:text-purple-300"
                      : isActive(item.path)
                      ? "text-blue-600 dark:text-blue-400 font-semibold"
                      : "text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <ThemeToggle />
            {user && (
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.firstName || user.email}
                    </p>
                    {isAdmin && (
                      <Badge variant="default" className="text-xs">
                        <Shield className="w-3 h-3 mr-1" />
                        Admin
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{user.coinBalance || 0} coins</p>
                </div>
                {user.profileImageUrl && (
                  <img 
                    src={user.profileImageUrl} 
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )}
              </div>
            )}
            <Button onClick={handleLogout} variant="outline" className="dark:border-gray-600 dark:hover:bg-gray-800">
              Sign Out
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            <ThemeToggle />
            <button 
              className="p-2"
              onClick={toggleMobileMenu}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              ) : (
                <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700">
          <div className="px-4 py-2 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link 
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-2 py-2 transition-colors ${
                    item.special
                      ? "text-purple-600 dark:text-purple-400 font-semibold hover:text-purple-700 dark:hover:text-purple-300"
                      : isActive(item.path)
                      ? "text-blue-600 dark:text-blue-400 font-semibold"
                      : "text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {item.label}
                </Link>
              );
            })}
            <hr className="my-2 border-gray-200 dark:border-slate-700" />
            {user && (
              <div className="py-2">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.firstName || user.email}
                  </p>
                  {isAdmin && (
                    <Badge variant="default" className="text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{user.coinBalance || 0} coins</p>
              </div>
            )}
            <button 
              onClick={handleLogout}
              className="block py-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 w-full text-left"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

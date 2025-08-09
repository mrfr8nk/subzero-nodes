import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { SiGoogle } from "react-icons/si";
import { Rocket, Coins, Users, ChartLine, Smartphone, Shield, Clock, CheckCircle, Star, ArrowRight, Play, Zap, Globe, Award, Bot } from "lucide-react";
import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();
  
  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  const handleGetStarted = () => {
    setLocation("/signup");
  };

  const features = [
    {
      icon: Rocket,
      title: "Lightning Fast Deployment",
      description: "Deploy your SUBZERO-MD bots in under 60 seconds with SUBZERO NODES!",
      gradient: "from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900",
      iconColor: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-gradient-to-r from-blue-500 to-blue-600",
      highlight: "Most Popular"
    },
    {
      icon: Coins,
      title: "Smart Coin Economy",
      description: "Transparent pricing with our integrated coin system. Pay only for what you use.",
      gradient: "from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-gradient-to-r from-emerald-500 to-emerald-600"
    },
    {
      icon: Users,
      title: "Referral Rewards",
      description: "Earn up to 50 coins for each friend you refer. Build your network and profit together.",
      gradient: "from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900",
      iconColor: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-gradient-to-r from-purple-500 to-purple-600"
    },
    {
      icon: ChartLine,
      title: "Real-time Analytics",
      description: "Advanced dashboard with live metrics, performance insights, and detailed reports.",
      gradient: "from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900",
      iconColor: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-gradient-to-r from-amber-500 to-amber-600"
    },
    {
      icon: Globe,
      title: "Global Infrastructure",
      description: "99.9% uptime with servers worldwide. Your bots run 24/7 without interruption.",
      gradient: "from-cyan-50 to-cyan-100 dark:from-cyan-950 dark:to-cyan-900",
      iconColor: "text-cyan-600 dark:text-cyan-400",
      bgColor: "bg-gradient-to-r from-cyan-500 to-cyan-600"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-grade encryption and security. Your data and bots are completely protected.",
      gradient: "from-rose-50 to-rose-100 dark:from-rose-950 dark:to-rose-900",
      iconColor: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-gradient-to-r from-rose-500 to-rose-600"
    }
  ];



  const stats = [
    { label: "Bots Deployed", value: "15,000+", icon: Rocket },
    { label: "Happy Users", value: "8,500+", icon: Users },
    { label: "Uptime", value: "99.9%", icon: Shield },
    { label: "Countries", value: "50+", icon: Globe }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950">
      {/* Navigation */}
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-wide">SUBZERO-MD</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Bot Platform</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3">
              <ThemeToggle />
              <Button 
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg text-sm sm:text-base px-3 sm:px-4"
                data-testid="button-getstarted-nav"
              >
                <span className="hidden sm:inline">Get Started</span>
                <span className="sm:hidden">Start</span>
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-6 leading-tight">
                Deploy Your
                <span className="text-blue-200 block">WhatsApp Bot</span>
                in Minutes
              </h1>
              <p className="text-lg sm:text-xl text-blue-100 mb-8 leading-relaxed">
                Launch powerful SUBZERO-MD WhatsApp bots with our intuitive platform. 
                Manage deployments, track usage, and earn through our referral system.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Button 
                  onClick={handleGetStarted}
                  className="bg-white text-blue-600 hover:bg-blue-50 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg h-auto"
                >
                  Start Deploying
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleGoogleLogin}
                  className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg h-auto"
                >
                  <SiGoogle className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1611224923853-80b023f02d71?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600" 
                  alt="WhatsApp bot interface" 
                  className="rounded-2xl shadow-2xl w-full max-w-md mx-auto object-cover h-[400px]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-6 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border-0">
              <Award className="w-3 h-3 mr-1" />
              Industry Leading Features
            </Badge>
            <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Everything You Need to
              <span className="block text-blue-600 dark:text-blue-400">Dominate WhatsApp</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Built by developers, for developers. Our platform combines cutting-edge technology 
              with intuitive design to give you the ultimate bot deployment experience.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className={`group hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br ${feature.gradient} relative overflow-hidden`}>
                  {feature.highlight && (
                    <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-0 text-xs">
                        {feature.highlight}
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-6 sm:p-8 relative z-10">
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 ${feature.bgColor} rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                      <IconComponent className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-300"></div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>



      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            Ready to Deploy Your First Bot?
          </h2>
          <p className="text-xl lg:text-2xl text-blue-100 mb-12 max-w-2xl mx-auto">
            Join thousands of developers and start deploying powerful WhatsApp bots in under 60 seconds.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Button 
              onClick={handleGetStarted}
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-6 rounded-2xl font-bold text-lg shadow-xl group"
              data-testid="button-start-free"
            >
              <Rocket className="w-5 h-5 mr-3" />
              Start Free Today
              <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
            </Button>
            <div className="text-center">
              <div className="text-blue-100 text-sm">
                <CheckCircle className="w-4 h-4 inline mr-2" />
                10 free coins included • No setup fees • Cancel anytime
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-wide">SUBZERO-MD</span>
                <span className="text-xs text-gray-400 font-medium">Bot Platform</span>
              </div>
            </div>
            <div className="text-center md:text-right">
              <div className="text-gray-400 text-sm">
                © 2025 SUBZERO-NODEZ. All rights reserved.
              </div>
              <div className="text-gray-500 text-xs mt-1">
                Built with ❤️ by Team Subzero
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Rocket, Coins, Users, ChartLine, Smartphone, Shield, Clock } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const features = [
    {
      icon: Rocket,
      title: "Quick Deployment",
      description: "Deploy your SUBZERO-MD bots instantly with our one-click deployment system.",
      gradient: "from-blue-50 to-blue-100",
      iconColor: "text-blue-600",
      bgColor: "bg-blue-600"
    },
    {
      icon: Coins,
      title: "Coin System",
      description: "Use our integrated coin system for seamless payment and resource management.",
      gradient: "from-green-50 to-green-100",
      iconColor: "text-green-600",
      bgColor: "bg-green-600"
    },
    {
      icon: Users,
      title: "Referral Rewards",
      description: "Earn coins by referring friends and grow your network with our referral system.",
      gradient: "from-purple-50 to-purple-100",
      iconColor: "text-purple-600",
      bgColor: "bg-purple-600"
    },
    {
      icon: ChartLine,
      title: "Analytics Dashboard",
      description: "Monitor your bot performance with detailed analytics and usage statistics.",
      gradient: "from-orange-50 to-orange-100",
      iconColor: "text-orange-600",
      bgColor: "bg-orange-600"
    },
    {
      icon: Smartphone,
      title: "Mobile Optimized",
      description: "Manage your bots on the go with our fully responsive mobile interface.",
      gradient: "from-red-50 to-red-100",
      iconColor: "text-red-600",
      bgColor: "bg-red-600"
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Enterprise-grade security and 99.9% uptime for your peace of mind.",
      gradient: "from-indigo-50 to-indigo-100",
      iconColor: "text-indigo-600",
      bgColor: "bg-indigo-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">SUBZERO-MD</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={handleLogin}>
                Sign In
              </Button>
              <Button onClick={handleLogin} className="bg-blue-600 hover:bg-blue-700">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
                Deploy Your
                <span className="text-blue-200 block">WhatsApp Bot</span>
                in Minutes
              </h1>
              <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                Launch powerful SUBZERO-MD WhatsApp bots with our intuitive platform. 
                Manage deployments, track usage, and earn through our referral system.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Button 
                  onClick={handleLogin}
                  className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-xl font-semibold text-lg h-auto"
                >
                  Start Deploying
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleLogin}
                  className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg h-auto"
                >
                  View Demo
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
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Deploy Bots
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our platform provides all the tools and features you need to successfully deploy and manage your WhatsApp bots.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className={`bg-gradient-to-br ${feature.gradient} border-none`}>
                  <CardContent className="p-8">
                    <div className={`w-12 h-12 ${feature.bgColor} rounded-xl flex items-center justify-center mb-6`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">10,000+</div>
              <div className="text-gray-300">Bots Deployed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-400 mb-2">5,000+</div>
              <div className="text-gray-300">Active Users</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-400 mb-2">99.9%</div>
              <div className="text-gray-300">Uptime</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-orange-400 mb-2">24/7</div>
              <div className="text-gray-300">Support</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

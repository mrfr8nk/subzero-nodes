import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { SiGoogle } from "react-icons/si";
import { Rocket, Users, Shield, Globe, ArrowRight, Play, Bot, Terminal, Database, Server, Cpu, Cloud, Zap, Monitor, GitBranch, Activity } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function AnimatedLanding() {
  const [, setLocation] = useLocation();
  const [isLoaded, setIsLoaded] = useState(false);
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 300], [0, -50]);
  const y2 = useTransform(scrollY, [0, 300], [0, -100]);
  const opacity = useTransform(scrollY, [0, 200], [1, 0.5]);

  useEffect(() => {
    setIsLoaded(true);
  }, []);
  
  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  const handleGetStarted = () => {
    setLocation("/signup");
  };

  const features = [
    {
      icon: Zap,
      title: "Lightning Fast Deployment",
      description: "Deploy your applications in seconds with our advanced infrastructure and optimized deployment pipeline",
      gradient: "from-blue-600/20 to-indigo-600/20",
      border: "border-blue-400/30",
      iconColor: "text-blue-300"
    },
    {
      icon: Monitor,
      title: "Real-time Monitoring",
      description: "Comprehensive monitoring with live logs, performance metrics, and intelligent alerts",
      gradient: "from-slate-600/20 to-slate-700/20",
      border: "border-slate-400/30",
      iconColor: "text-slate-300"
    },
    {
      icon: Cpu,
      title: "Smart Resource Management",
      description: "Intelligent auto-scaling and resource allocation based on real-time usage patterns",
      gradient: "from-indigo-600/20 to-blue-700/20",
      border: "border-indigo-400/30",
      iconColor: "text-indigo-300"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-grade security with advanced threat protection, encryption, and compliance",
      gradient: "from-blue-700/20 to-slate-600/20",
      border: "border-blue-500/30",
      iconColor: "text-blue-200"
    }
  ];

  const stats = [
    { label: "Deployments", value: "15K+", icon: Rocket, iconColor: "text-blue-400" },
    { label: "Active Users", value: "8.5K+", icon: Users, iconColor: "text-emerald-400" },
    { label: "Uptime", value: "99.9%", icon: Activity, iconColor: "text-green-400" },
    { label: "Countries", value: "50+", icon: Globe, iconColor: "text-purple-400" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white relative overflow-hidden">
      {/* Animated Background Grid */}
      <div className="fixed inset-0">
        <div 
          className="absolute inset-0 bg-grid-white/[0.02] bg-grid"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M0 0h60v60H0z'/%3E%3Cpath d='M30 30h30v30H30z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        />
        
        {/* Floating Orbs */}
        <motion.div
          className="absolute top-20 left-20 w-64 h-64 bg-blue-600/15 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.4, 0.7, 0.4],
            x: [0, 50, 0],
            y: [0, -30, 0]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-40 right-20 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.8, 0.5],
            x: [0, -70, 0],
            y: [0, 40, 0]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 w-80 h-80 bg-slate-600/15 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3],
            rotate: [0, 180, 360]
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      {/* Header */}
      <motion.header 
        className="relative z-50 border-b border-blue-500/20 backdrop-blur-xl bg-slate-900/60"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div 
              className="flex items-center space-x-3"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div 
                className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-xl border border-blue-400/30"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                <Bot className="h-7 w-7 text-white" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent">
                  SUBZERO MD
                </h1>
                <div className="text-xs text-blue-200 font-medium">DEPLOYMENT PLATFORM</div>
              </div>
            </motion.div>
            
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="outline" 
                  onClick={() => setLocation("/login")}
                  className="border-blue-400/30 text-blue-100 hover:bg-blue-500/10 backdrop-blur-sm"
                >
                  Sign In
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  onClick={handleGetStarted}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl border-0"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <motion.section 
        className="relative z-10 pt-20 pb-32"
        style={{ y: y1, opacity }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Badge className="mb-8 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-blue-100 border-blue-400/40 backdrop-blur-sm px-4 py-2">
              <Zap className="w-4 h-4 mr-2 text-blue-300" />
              Deploy in seconds, not minutes
            </Badge>
            
            <motion.h1 
              className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 leading-tight"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <span className="bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent">
                Deploy
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-300 via-indigo-300 to-slate-300 bg-clip-text text-transparent">
                Anything
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-xl md:text-2xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              From WhatsApp bots to full applications. Our platform handles the complexity 
              so you can focus on what matters - building amazing experiences.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-6 justify-center items-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  onClick={handleGetStarted}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-8 py-4 rounded-xl text-lg font-semibold h-auto shadow-2xl"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Start Building
                </Button>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  onClick={handleGoogleLogin}
                  variant="outline"
                  className="border-blue-400/40 text-blue-100 hover:bg-blue-500/10 px-8 py-4 rounded-xl text-lg font-semibold h-auto backdrop-blur-sm"
                >
                  <SiGoogle className="mr-2 h-5 w-5" />
                  Continue with Google
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Stats Section */}
      <motion.section 
        className="relative z-10 py-20"
        style={{ y: y2 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="grid grid-cols-2 lg:grid-cols-4 gap-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                className="text-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -10 }}
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-2xl flex items-center justify-center border border-blue-400/20 backdrop-blur-sm">
                  <stat.icon className={`h-8 w-8 ${stat.iconColor}`} />
                </div>
                <div className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-blue-200 text-sm font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section className="relative z-10 py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                Built for
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent">
                Developers
              </span>
            </h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Everything you need to deploy, monitor, and scale your applications with confidence.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -5 }}
                className="group"
              >
                <Card className={`bg-slate-800/40 border ${feature.border} backdrop-blur-xl p-8 h-full transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-blue-500/20`}>
                  <CardContent className="p-0">
                    <div className={`w-16 h-16 mb-6 ${feature.gradient} rounded-2xl flex items-center justify-center border border-blue-400/20`}>
                      <feature.icon className={`h-8 w-8 ${feature.iconColor}`} />
                    </div>
                    <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-blue-200 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-blue-100 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section 
        className="relative z-10 py-32"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-8">
              <span className="bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                Ready to deploy?
              </span>
            </h2>
            <p className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto">
              Join thousands of developers who are building the future with SUBZERO MD.
            </p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-6 justify-center"
              whileHover={{ scale: 1.02 }}
            >
              <Button 
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-12 py-4 rounded-xl text-lg font-semibold h-auto shadow-2xl"
              >
                <Rocket className="mr-2 h-5 w-5" />
                Deploy Your First App
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <motion.footer 
        className="relative z-10 border-t border-white/10 py-16"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-blue-200">
            © 2025 SUBZERO MD. Built with ❤️ for developers worldwide.
          </p>
        </div>
      </motion.footer>
    </div>
  );
}
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { SiGoogle } from "react-icons/si";
import { Rocket, Users, Shield, Globe, ArrowRight, Play, Bot, Terminal, Database, Server, Cpu, Cloud, Zap, Monitor, GitBranch, Activity, Home } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring } from "framer-motion";

// Animated Counter Component
function AnimatedCounter({ value, suffix = "", duration = 2 }: { value: number; suffix?: string; duration?: number }) {
  const countRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(countRef, { once: true });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { duration: duration * 1000 });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [isInView, value, motionValue]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      setDisplayValue(Math.floor(latest));
    });
    return unsubscribe;
  }, [springValue]);

  const formatValue = (val: number) => {
    if (suffix === "K+") {
      return `${(val / 1000).toFixed(1)}K+`;
    }
    if (suffix === "%") {
      return `${(val / 10).toFixed(1)}%`;
    }
    return `${val}${suffix}`;
  };

  return (
    <div ref={countRef} className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
      {formatValue(displayValue)}
    </div>
  );
}

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
      gradient: "from-blue-100/80 to-indigo-100/80 dark:from-blue-600/20 dark:to-indigo-600/20",
      border: "border-blue-300/60 dark:border-blue-400/30",
      iconColor: "text-blue-600 dark:text-blue-300"
    },
    {
      icon: Monitor,
      title: "Real-time Monitoring",
      description: "Comprehensive monitoring with live logs, performance metrics, and intelligent alerts",
      gradient: "from-slate-100/80 to-slate-200/80 dark:from-slate-600/20 dark:to-slate-700/20",
      border: "border-slate-300/60 dark:border-slate-400/30",
      iconColor: "text-slate-700 dark:text-slate-300"
    },
    {
      icon: Cpu,
      title: "Smart Resource Management",
      description: "Intelligent auto-scaling and resource allocation based on real-time usage patterns",
      gradient: "from-indigo-100/80 to-blue-100/80 dark:from-indigo-600/20 dark:to-blue-700/20",
      border: "border-indigo-300/60 dark:border-indigo-400/30",
      iconColor: "text-indigo-600 dark:text-indigo-300"
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
    { label: "Deployments", value: 15000, suffix: "K+", icon: Rocket, iconColor: "text-blue-400" },
    { label: "Active Users", value: 8500, suffix: "K+", icon: Users, iconColor: "text-emerald-400" },
    { label: "Uptime", value: 999, suffix: "%", icon: Activity, iconColor: "text-green-400" },
    { label: "Countries", value: 50, suffix: "+", icon: Globe, iconColor: "text-purple-400" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-blue-900 dark:to-slate-800 text-slate-900 dark:text-white relative overflow-hidden">
      {/* Animated Background Grid */}
      <div className="fixed inset-0">
        <div 
          className="absolute inset-0 bg-grid-white/[0.02] bg-grid"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M0 0h60v60H0z'/%3E%3Cpath d='M30 30h30v30H30z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        />
        
        {/* Optimized Floating Orbs - Reduced blur for performance */}
        <motion.div
          className="absolute top-20 left-20 w-32 h-32 bg-blue-600/10 rounded-full blur-xl"
          animate={{
            opacity: [0.3, 0.5, 0.3],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-40 right-20 w-48 h-48 bg-indigo-600/10 rounded-full blur-xl"
          animate={{
            opacity: [0.4, 0.6, 0.4]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Header - Optimized backdrop blur */}
      <motion.header 
        className="relative z-50 border-b border-blue-500/20 backdrop-blur-sm bg-white/90 dark:bg-slate-900/90"
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <motion.div 
                className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg p-1"
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.3 }}
              >
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
                <Bot className="w-6 h-6 text-white hidden" />
              </motion.div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                  SUBZERO
                </h1>
                <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">Bot Platform</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <ThemeToggle />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLocation("/login")}
                className="border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                Sign In
              </Button>
              <Button 
                size="sm"
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg transition-all"
              >
                Get Started
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
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
            <Badge className="mb-8 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 dark:text-blue-100 text-blue-700 border-blue-400/40 backdrop-blur-sm px-4 py-2">
              <Zap className="w-4 h-4 mr-2 text-blue-300 dark:text-blue-300 text-blue-600" />
              Deploy in seconds, not minutes
            </Badge>
            
            <motion.h1 
              className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 leading-tight"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <span className="bg-gradient-to-r from-slate-800 via-slate-900 to-blue-900 dark:from-white dark:via-blue-100 dark:to-blue-200 bg-clip-text text-transparent">
                Deploy
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-700 dark:from-blue-300 dark:via-indigo-300 dark:to-slate-300 bg-clip-text text-transparent">
                SUBZERO
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-xl md:text-2xl text-slate-600 dark:text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              From WhatsApp bots to full applications. Our platform handles the complexity 
              so you can focus on what matters - building amazing experiences.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-6 justify-center items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Button 
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-8 py-4 rounded-xl text-lg font-semibold h-auto shadow-lg transition-all hover:scale-105"
              >
                <Play className="mr-2 h-5 w-5" />
                Start Building
              </Button>
              
              <Button 
                onClick={handleGoogleLogin}
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 px-8 py-4 rounded-xl text-lg font-semibold h-auto transition-all hover:scale-105"
              >
                <SiGoogle className="mr-2 h-5 w-5" />
                Continue with Google
              </Button>
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
                <AnimatedCounter 
                  value={stat.value} 
                  suffix={stat.suffix}
                  duration={2 + index * 0.2}
                />
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
              Join thousands of developers who are building the future with SUBZERO NODES.
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
            © 2025 SUBZERO NODES. Deploy SUBZERO-MD WhatsApp bots worldwide.
          </p>
        </div>
      </motion.footer>
    </div>
  );
}

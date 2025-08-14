import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Crown, Zap, MessageCircle, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PremiumPlan {
  id: string;
  name: string;
  price: number;
  coins: number;
  color: string;
  icon: any;
  features: string[];
  popular?: boolean;
}

const plans: PremiumPlan[] = [
  {
    id: "bronze",
    name: "Bronze",
    price: 2,
    coins: 100,
    color: "from-amber-600 to-orange-700",
    icon: Star,
    features: [
      "100 Premium Coins",
      "Priority Support",
      "Advanced Bot Templates",
      "Multi-device Sync",
      "Custom Bot Branding"
    ]
  },
  {
    id: "silver",
    name: "Silver",
    price: 4,
    coins: 150,
    color: "from-slate-400 to-slate-600",
    icon: Crown,
    popular: true,
    features: [
      "150 Premium Coins",
      "24/7 Premium Support",
      "Advanced Analytics",
      "Custom Domains",
      "API Access",
      "White-label Options"
    ]
  },
  {
    id: "gold",
    name: "Gold",
    price: 6,
    coins: 400,
    color: "from-yellow-400 to-yellow-600",
    icon: Zap,
    features: [
      "400 Premium Coins",
      "Dedicated Account Manager",
      "Enterprise Features",
      "Custom Integrations",
      "Advanced Security",
      "Priority Queue Access",
      "Unlimited Deployments"
    ]
  }
];

export default function Premium() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleUpgrade = async (planId: string) => {
    setIsProcessing(true);
    setSelectedPlan(planId);

    try {
      const plan = plans.find(p => p.id === planId);
      if (!plan) return;

      // Here you would integrate with your payment system
      // For now, we'll show the contact information
      toast({
        title: "Premium Upgrade",
        description: "Please contact us via WhatsApp or Telegram to complete your premium upgrade!",
        duration: 5000,
      });

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process upgrade. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setSelectedPlan(null);
    }
  };

  const openWhatsApp = () => {
    window.open("https://wa.me/263719647303?text=Hi, I'm interested in upgrading to premium!", "_blank");
  };

  const openTelegram = () => {
    window.open("https://t.me/mrfrankofc", "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-6">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Upgrade to <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Premium</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Unlock advanced features, priority support, and exclusive bot templates with our premium plans
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => {
            const IconComponent = plan.icon;
            return (
              <Card key={plan.id} className={`relative overflow-hidden border-2 transition-all duration-300 hover:scale-105 ${
                plan.popular ? "border-purple-500 bg-slate-800/50" : "border-slate-700 bg-slate-800/30"
              }`}>
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-purple-500 to-pink-500 py-2">
                    <p className="text-center text-white font-semibold text-sm">Most Popular</p>
                  </div>
                )}
                
                <CardHeader className={plan.popular ? "pt-12" : "pt-6"}>
                  <div className={`w-12 h-12 bg-gradient-to-r ${plan.color} rounded-lg flex items-center justify-center mb-4`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-white">{plan.name}</CardTitle>
                  <CardDescription className="text-slate-300">
                    <span className="text-4xl font-bold text-white">${plan.price}</span>
                    <span className="text-lg ml-1">USD</span>
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="text-center">
                    <Badge className={`bg-gradient-to-r ${plan.color} text-white px-4 py-2 text-lg font-semibold`}>
                      {plan.coins} Coins
                    </Badge>
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-slate-300">
                        <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isProcessing && selectedPlan === plan.id}
                    className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90 transition-opacity text-white font-semibold py-3`}
                    data-testid={`button-upgrade-${plan.id}`}
                  >
                    {isProcessing && selectedPlan === plan.id ? (
                      "Processing..."
                    ) : (
                      `Upgrade to ${plan.name}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Contact Section */}
        <div className="bg-gradient-to-r from-purple-800/20 to-pink-800/20 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Upgrade?</h2>
          <p className="text-slate-300 mb-8 max-w-2xl mx-auto">
            Contact us directly for instant premium activation and personalized support
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={openWhatsApp}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-semibold"
              data-testid="button-whatsapp"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              WhatsApp: +263719647303
            </Button>
            
            <Button
              onClick={openTelegram}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold"
              data-testid="button-telegram"
            >
              <Send className="w-5 h-5 mr-2" />
              Telegram: @mrfrankofc
            </Button>
          </div>
        </div>

        {/* Features Highlight */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Instant Activation</h3>
            <p className="text-slate-300">Get premium features activated within minutes of payment</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">24/7 Support</h3>
            <p className="text-slate-300">Direct access to our support team via WhatsApp and Telegram</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Premium Features</h3>
            <p className="text-slate-300">Advanced bot templates, analytics, and exclusive features</p>
          </div>
        </div>
      </div>
    </div>
  );
}
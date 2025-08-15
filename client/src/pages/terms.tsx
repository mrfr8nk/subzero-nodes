import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Shield, Users } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 dark:bg-blue-500 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Terms of Service</h1>
              <p className="text-gray-600 dark:text-gray-400">Last updated: January 2025</p>
            </div>
          </div>
        </div>

        {/* Terms Content */}
        <div className="space-y-6">
          <Card className="border-0 shadow-lg dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Acceptance of Terms</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>
                By accessing and using the SUBZERO-MD deployment platform ("Service"), you accept and agree to be bound by the terms and provision of this agreement.
              </p>
              <p>
                If you do not agree to abide by the above, please do not use this service.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Service Description</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>
                SUBZERO-MD platform provides hosting and deployment services specifically designed for SUBZERO-MD WhatsApp bots. Our service includes:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Instant deployment of SUBZERO-MD bots</li>
                <li>Specialized infrastructure optimized for SUBZERO-MD</li>
                <li>Real-time monitoring and management tools</li>
                <li>24/7 technical support</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg dark:bg-slate-800">
            <CardHeader>
              <CardTitle>Account Responsibilities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>
                You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer.
              </p>
              <p>
                Only one account is allowed per device. Multiple accounts from the same device may result in account suspension.
              </p>
              <p>
                You agree to accept responsibility for all activities that occur under your account or password.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg dark:bg-slate-800">
            <CardHeader>
              <CardTitle>Acceptable Use</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>
                You may use our service only for lawful purposes and in accordance with these Terms. You agree not to use the service:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
                <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
                <li>To spam, phish, pharm, pretext, spider, crawl, or scrape</li>
                <li>For any immoral or destructive purpose</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg dark:bg-slate-800">
            <CardHeader>
              <CardTitle>Payment and Refunds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>
                Our service uses a coin-based payment system. Coins are virtual currency used to pay for deployment and hosting services.
              </p>
              <p>
                Daily coin claims are available every 24 hours. Coin transfers between users are supported with proper verification.
              </p>
              <p>
                Refund requests must be submitted through our support system and will be reviewed on a case-by-case basis.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg dark:bg-slate-800">
            <CardHeader>
              <CardTitle>Service Availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>
                We strive to maintain 99.9% uptime for our SUBZERO-MD deployment platform. However, we do not guarantee uninterrupted service.
              </p>
              <p>
                Scheduled maintenance will be announced in advance when possible. Emergency maintenance may occur without prior notice.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg dark:bg-slate-800">
            <CardHeader>
              <CardTitle>Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>
                In no event shall SUBZERO-MD platform be liable for any direct, indirect, punitive, incidental, special, consequential damages or any damages whatsoever.
              </p>
              <p>
                You expressly understand and agree that your use of the service is at your sole risk.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg dark:bg-slate-800">
            <CardHeader>
              <CardTitle>Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>
                We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting to the website.
              </p>
              <p>
                Your continued use of the service after changes are posted constitutes your acceptance of the modified terms.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg dark:bg-slate-800">
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-600 dark:text-gray-300">
              <p>
                If you have any questions about these Terms of Service, please contact our support team through the platform or via our official support channels.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              © 2025 SUBZERO-MD Platform. All rights reserved.
            </div>
            <div className="flex space-x-6">
              <Link href="/privacy" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Privacy Policy
              </Link>
              <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
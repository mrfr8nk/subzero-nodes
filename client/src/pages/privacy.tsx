import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Eye, Lock, Database, UserCheck, Trash2 } from "lucide-react";

export default function Privacy() {
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
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
              <p className="text-gray-600 dark:text-gray-400">Last updated: January 2025</p>
            </div>
          </div>
        </div>

        {/* Privacy Content */}
        <div className="space-y-6">
          <Card className="border-0 shadow-lg dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Information We Collect</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>
                We collect information you provide directly to us when you create an account, deploy bots, or use our SUBZERO-MD platform services.
              </p>
              <p><strong>Personal Information:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Email address and username</li>
                <li>Google account information (when using Google Sign-In)</li>
                <li>Device fingerprint for security purposes</li>
                <li>IP address and location data</li>
              </ul>
              <p><strong>Usage Information:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Deployment configurations and bot settings</li>
                <li>Transaction history and coin balance</li>
                <li>Chat messages and platform interactions</li>
                <li>Performance metrics and analytics data</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>How We Use Your Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide and maintain our SUBZERO-MD deployment services</li>
                <li>Process transactions and manage your coin balance</li>
                <li>Monitor and improve platform performance</li>
                <li>Provide customer support and respond to inquiries</li>
                <li>Prevent fraud and ensure platform security</li>
                <li>Send important service updates and notifications</li>
                <li>Analyze usage patterns to improve our services</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Data Security</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              </p>
              <p><strong>Security Measures:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Encrypted data transmission (HTTPS/TLS)</li>
                <li>Secure password hashing and storage</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and authentication systems</li>
                <li>Device fingerprinting for fraud prevention</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Information Sharing</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>
                We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.
              </p>
              <p><strong>We may share information:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>With your explicit consent</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights, property, or safety</li>
                <li>In connection with a business transfer or merger</li>
                <li>With service providers who assist in our operations</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg dark:bg-slate-800">
            <CardHeader>
              <CardTitle>Account Restrictions and Device Limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>
                To ensure fair use and prevent abuse, we implement account restrictions:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Only 1 account allowed per device</li>
                <li>Device fingerprinting for security and enforcement</li>
                <li>Automatic detection of multiple accounts</li>
                <li>Account suspension for policy violations</li>
              </ul>
              <p>
                These measures help maintain platform integrity and ensure fair access for all users.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg dark:bg-slate-800">
            <CardHeader>
              <CardTitle>Cookies and Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>
                We use cookies and similar tracking technologies to enhance your experience and secure our platform:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Session cookies for authentication</li>
                <li>Preference cookies for theme and settings</li>
                <li>Security cookies for device recognition</li>
                <li>Analytics cookies for platform improvement</li>
              </ul>
              <p>
                You can control cookie settings through your browser, but some features may not function properly if cookies are disabled.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trash2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Data Retention and Deletion</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>
                We retain your personal information only as long as necessary to provide our services and comply with legal obligations.
              </p>
              <p><strong>Automatic Cleanup:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Inactive accounts (3+ months) may be deleted</li>
                <li>Old chat messages are automatically cleaned</li>
                <li>Expired session data is regularly purged</li>
                <li>Deployment logs are retained for performance analysis</li>
              </ul>
              <p>
                You can request account deletion by contacting our support team. Note that some information may be retained for legal and security purposes.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg dark:bg-slate-800">
            <CardHeader>
              <CardTitle>Your Rights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>
                You have certain rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                <li><strong>Portability:</strong> Export your data in a portable format</li>
                <li><strong>Objection:</strong> Object to certain processing activities</li>
              </ul>
              <p>
                To exercise these rights, please contact our support team through the platform.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg dark:bg-slate-800">
            <CardHeader>
              <CardTitle>Changes to Privacy Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
              <p>
                Your continued use of our service after any changes constitutes your acceptance of the updated Privacy Policy.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg dark:bg-slate-800">
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-600 dark:text-gray-300">
              <p>
                If you have any questions about this Privacy Policy or our data practices, please contact our support team through the platform or via our official support channels.
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
              <Link href="/terms" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Terms of Service
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
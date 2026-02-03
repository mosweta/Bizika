// src/components/legal/PrivacyPolicy.jsx
import { Link } from "react-router-dom";
import { Shield, Lock, Database, Eye, Trash2, Mail, ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  const lastUpdated = "January 28, 2026";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link 
              to="/" 
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to Home</span>
            </Link>
            <Link 
              to="/" 
              className="flex items-center gap-2"
            >
              <img 
                src="/logo4.png" 
                alt="Pavoc LMS Logo" 
                className="h-8 w-8 rounded"
              />
              <span className="font-bold text-gray-900">Pavoc LMS</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  Privacy Policy
                </h1>
                <p className="text-blue-100">
                  Last updated: {lastUpdated}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8">
            <div className="prose prose-blue max-w-none">
              <p className="text-gray-600 mb-8">
                This Privacy Policy describes how Pavoc LMS ("we", "our", or "us") collects, uses, 
                and shares your personal information when you use our learning management platform.
              </p>

              <div className="space-y-8">
                {/* Information We Collect */}
                <section className="border-l-4 border-blue-500 pl-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Database className="h-5 w-5 text-blue-600" />
                    1. Information We Collect
                  </h2>
                  <div className="space-y-3">
                    <p><strong>Personal Information:</strong> Name, email address when you register.</p>
                    <p><strong>Learning Data:</strong> Course progress, quiz scores, course ratings.</p>
                    
                  </div>
                </section>

                {/* How We Use Information */}
                <section className="border-l-4 border-green-500 pl-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Eye className="h-5 w-5 text-green-600" />
                    2. How We Use Your Information
                  </h2>
                  <div className="space-y-3">
                    <p>• Provide and improve our learning platform</p>
                    
                    <p>• Process enrollments</p>
                    
                    
                  </div>
                </section>

                {/* Data Sharing */}
                <section className="border-l-4 border-purple-500 pl-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    3. Data Sharing
                  </h2>
                  <p className="text-gray-600">
                    We do not sell your personal data. We only share information with:
                  </p>
                  <div className="space-y-3 mt-3">
                    <p>• <strong>Instructors:</strong> Your progress in their courses</p>
                    <p>• <strong>Service Providers:</strong> hosting services</p>
                    <p>• <strong>Legal Authorities:</strong> when required by law</p>
                  </div>
                </section>

                {/* Data Security */}
                <section className="border-l-4 border-red-500 pl-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Lock className="h-5 w-5 text-red-600" />
                    4. Data Security
                  </h2>
                  <p className="text-gray-600">
                    We implement industry-standard security measures:
                  </p>
                  <div className="space-y-3 mt-3">
                    
                    <p>• Access controls and authentication</p>
                    <p>• Secure data storage</p>
                  </div>
                </section>

                {/* Your Rights */}
                <section className="border-l-4 border-yellow-500 pl-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Trash2 className="h-5 w-5 text-yellow-600" />
                    5. Your Rights
                  </h2>
                  <div className="space-y-3">
                    <p>• unenroll from a course</p>
                    <p>• view authorized resources</p>
                    <p>• reset your password</p>
                    <p>• rate a course</p>
                    
                  </div>
                </section>

                {/* Cookies */}
                <section className="border-l-4 border-indigo-500 pl-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    6. Cookies
                  </h2>
                  <p className="text-gray-600">
                    We use cookies to:
                  </p>
                  <div className="space-y-3 mt-3">
                    <p>• Remember your login session</p>
                    <p>• Save your preferences</p>
                    <p>• Analyze platform usage</p>
                    <p>• Improve performance</p>
                  </div>
                  <p className="mt-3 text-sm text-gray-500">
                    You can disable cookies in your browser settings, but this may affect platform functionality.
                  </p>
                </section>

                {/* Children's Privacy */}
                <section>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    7. Children's Privacy
                  </h2>
                  <p className="text-gray-600">
                    Our platform is not intended for children under 13. We do not knowingly collect 
                    personal information from children under 13. If you believe we have collected 
                    information from a child, please contact us immediately.
                  </p>
                </section>

                {/* Changes */}
                <section>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    8. Changes to Privacy Policy
                  </h2>
                  <p className="text-gray-600">
                    We may update this Privacy Policy periodically. We will notify you of significant 
                    changes by email or through platform notifications.
                  </p>
                </section>

                {/* Contact */}
                <section className="bg-blue-50 rounded-lg p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Mail className="h-5 w-5 text-blue-600" />
                    9. Contact Us
                  </h2>
                  <p className="text-gray-600">
                    For privacy-related questions or concerns:
                  </p>
                  <div className="mt-3 space-y-2">
                    <p className="font-medium">Email: info@pavocsolutionsltd.co.ke</p>
                    <p className="font-medium">Address: Nairobi, Kenya</p>
                    <p className="text-sm text-gray-500">
                      We aim to respond to all inquiries within 48 hours.
                    </p>
                  </div>
                </section>
              </div>

              {/* Footer */}
              <div className="mt-12 pt-8 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <p className="text-sm text-gray-500">
                    © {new Date().getFullYear()} Pavoc LMS. All rights reserved.
                  </p>
                  <Link 
                    to="/terms" 
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View Terms & Conditions →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// src/components/legal/TermsConditions.jsx
import { Link } from "react-router-dom";
import { FileText, BookOpen, AlertTriangle, Users, Globe, ArrowLeft, CheckCircle } from "lucide-react";

export default function TermsConditions() {
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
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  Terms & Conditions
                </h1>
                <p className="text-indigo-100">
                  Last updated: {lastUpdated}
                </p>
              </div>
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-yellow-50 border-b border-yellow-200 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">
                  Important: Please read these terms carefully
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  By using Pavoc LMS, you agree to these terms and conditions.
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8">
            <div className="prose prose-indigo max-w-none">
              <p className="text-gray-600 mb-8">
                Welcome to Pavoc LMS. These Terms & Conditions govern your use of our learning 
                management platform. By accessing or using our services, you agree to be bound 
                by these terms.
              </p>

              <div className="space-y-8">
                {/* Acceptance */}
                <section>
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    1. Acceptance of Terms
                  </h2>
                  <p className="text-gray-600">
                    By creating an account or using Pavoc LMS, you confirm that you:
                  </p>
                  <ul className="mt-3 space-y-2 text-gray-600">
                    <li>• Are at least 13 years old</li>
                    <li>• Have the legal capacity to enter into this agreement</li>
                    <li>• Will provide accurate and complete information</li>
                    <li>• Are responsible for maintaining account security</li>
                  </ul>
                </section>

                {/* Account Registration */}
                <section>
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    2. Account Registration
                  </h2>
                  <div className="space-y-3 text-gray-600">
                    <p>• You must create an account to access most features</p>
                    <p>• You are responsible for keeping your password secure</p>
                    <p>• You must notify us immediately of any unauthorized access</p>
                    <p>• We reserve the right to suspend accounts that violate terms</p>
                  </div>
                </section>

                {/* Use of Platform */}
                <section>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    3. Use of Platform
                  </h2>
                  <p className="text-gray-600 mb-3">You agree not to:</p>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Share your login credentials</li>
                    <li>• Upload malicious content or viruses</li>
                    <li>• Harass other users or instructors</li>
                    <li>• Reverse engineer or hack the platform</li>
                    <li>• Use bots or automated systems</li>
                    <li>• Violate intellectual property rights</li>
                    <li>• Engage in fraudulent activities</li>
                  </ul>
                </section>

                {/* Content & Intellectual Property */}
                <section>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    4. Content & Intellectual Property
                  </h2>
                  <div className="space-y-4 text-gray-600">
                    <div>
                      <h3 className="font-semibold text-gray-900">Our Content:</h3>
                      <p>All course materials, platform design, and software are owned by Pavoc LMS, Pavoc Solutions or our licensors.</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Your Content:</h3>
                      <p>You retain ownership of content you submit (ratings and reviews), but grant us license to use it for platform operation.</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Instructor Content:</h3>
                      <p>Course content belongs to instructors. You may use it for personal learning only.</p>
                    </div>
                  </div>
                </section>

                

                {/* Termination */}
                <section>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    5. Termination
                  </h2>
                  <div className="space-y-3 text-gray-600">
                    <p><strong>We may:</strong> Suspend or terminate accounts that violate terms</p>
                    <p><strong>Content removal:</strong> We may retain some data as required by law</p>
                  </div>
                </section>

                {/* Disclaimers */}
                <section>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    6. Disclaimers
                  </h2>
                  <div className="space-y-3 text-gray-600">
                    <p>• Platform provided "as is" without warranties</p>
                    <p>• We don't guarantee uninterrupted access</p>
                    <p>• Course quality depends on instructors</p>
                    <p>• We're not responsible for third-party content</p>
                    <p>• Educational outcomes not guaranteed</p>
                  </div>
                </section>

                {/* Limitation of Liability */}
                <section>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    7. Limitation of Liability
                  </h2>
                  <p className="text-gray-600">
                    To the maximum extent permitted by law, Pavoc LMS shall not be liable for:
                  </p>
                  <ul className="mt-3 space-y-2 text-gray-600">
                    <li>• Indirect or consequential damages</li>
                    <li>• Loss of data or profits</li>
                    <li>• Course content accuracy</li>
                    <li>• Actions of other users</li>
                    <li>• Technical issues beyond our control</li>
                  </ul>
                </section>

                {/* Changes to Terms */}
                <section>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    8. Changes to Terms
                  </h2>
                  <p className="text-gray-600">
                    We may update these terms periodically. We'll notify you of significant changes 
                    via email or platform notification. Continued use after changes means you accept 
                    the new terms.
                  </p>
                </section>

                {/* Governing Law */}
                <section>
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Globe className="h-5 w-5 text-gray-600" />
                    9. Governing Law
                  </h2>
                  <p className="text-gray-600">
                    These terms are governed by the Constitution of Kenya 2010.
                  </p>
                </section>

                {/* Contact */}
                <section className="bg-indigo-50 rounded-lg p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    10. Contact Information
                  </h2>
                  <div className="space-y-2 text-gray-600">
                    <p><strong>Email:</strong>  info@pavocsolutionsltd.co.ke</p>
                    <p><strong>Address:</strong> Nairobi, Kenya.</p>
                    <p><strong>Support:</strong>  info@pavocsolutionsltd.co.ke</p>
                  </div>
                  <p className="mt-4 text-sm text-gray-500">
                    For legal notices, please use the email above. Allow 5-7 business days for response.
                  </p>
                </section>
              </div>

              {/* Footer */}
              <div className="mt-12 pt-8 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <p className="text-sm text-gray-500">
                    © {new Date().getFullYear()} Pavoc LMS. All rights reserved.
                  </p>
                  <div className="flex items-center gap-4">
                    <Link 
                      to="/privacy" 
                      className="text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      ← Privacy Policy
                    </Link>
                    <Link 
                      to="/" 
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Return to Platform
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
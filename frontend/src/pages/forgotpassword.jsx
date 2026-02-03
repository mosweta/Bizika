import { useState } from 'react';
import { auth } from '../firebase/config';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Mail, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState('');

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Use the current URL as the continue URL for the reset link
      const actionCodeSettings = {
        url: `${window.location.origin}/reset-password`,
        handleCodeInApp: false,
      };
      
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      setSuccess(true);
      setEmailSent(email);
      
      // Clear form after successful send
      setEmail('');
    } catch (error) {
      console.error("Password reset error:", error);
      setError(
        error.code === 'auth/user-not-found'
          ? 'No account found with this email address.'
          : error.code === 'auth/invalid-email'
          ? 'Please enter a valid email address.'
          : error.code === 'auth/too-many-requests'
          ? 'Too many attempts. Please try again later.'
          : 'Failed to send reset email. Please try again.'
      );
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!emailSent) return;
    setLoading(true);
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/reset-password`,
        handleCodeInApp: false,
      };
      await sendPasswordResetEmail(auth, emailSent, actionCodeSettings);
      setSuccess(true);
    } catch (error) {
      setError('Failed to resend email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Back button */}
          <div className="mb-6">
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to login
            </Link>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Reset Your Password</h2>
            <p className="text-gray-600 mt-2">
              Enter your email and we'll send you a reset link
            </p>
          </div>

          {/* Success message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-green-800 font-medium">
                    Reset email sent!
                  </p>
                  <p className="text-green-700 text-sm mt-1">
                    Check your inbox at <strong>{emailSent}</strong> for the password reset link.
                    <br />
                    <span className="text-green-600 text-xs">
                      (Check spam folder if you don't see it)
                    </span>
                  </p>
                  <button
                    onClick={handleResendEmail}
                    disabled={loading}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                  >
                    Didn't receive it? Resend email
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && !success && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          {!success && (
            <form onSubmit={handleResetPassword}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="you@example.com"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-400">📧</span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  We'll send a secure link to reset your password
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-200 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Sending Reset Link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          )}

          {/* Additional info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">📋 Important Information</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• The reset link expires in 1 hour</li>
                <li>• Only the most recent reset email is valid</li>
                <li>• Check your spam folder if you don't see the email</li>
                <li>• Contact support if you continue having issues</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
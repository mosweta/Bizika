// src/components/Login.jsx - UPDATED with email verification and suspension check
import { useState } from "react";
import { auth, db } from "../firebase/config";
import { 
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { 
  Eye, 
  EyeOff, 
  BookOpen, 
  Loader2, 
  Mail, 
  AlertCircle, 
  ShieldAlert,
  Ban,
  UserX,
  AlertTriangle
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [accountSuspended, setAccountSuspended] = useState(false);
  const [suspensionDetails, setSuspensionDetails] = useState(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setNeedsVerification(false);
    setAccountSuspended(false);
    setSuspensionDetails(null);
    setVerificationSent(false);
    setLoading(true);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user data from Firestore to check status
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        // Sign out if no user document found
        await signOut(auth);
        throw new Error("User profile not found. Please contact administrator.");
      }
      
      const userData = docSnap.data();
      
      // Check if account is suspended
      if (userData.status === 'suspended' || userData.isSuspended === true) {
        await signOut(auth); // Sign out immediately
        setAccountSuspended(true);
        setSuspensionDetails({
          reason: userData.suspensionReason || "Account has been suspended by administrator",
          suspendedAt: userData.suspendedAt || null,
          until: userData.suspendedUntil || null,
          adminNote: userData.adminNote || null
        });
        setError("Your account has been suspended.");
        setLoading(false);
        return;
      }

      // Check if email is verified
      if (!user.emailVerified) {
        // Sign out the user and show verification message
        await signOut(auth);
        setNeedsVerification(true);
        setError("Please verify your email before logging in.");
        setLoading(false);
        return;
      }

      // All checks passed - proceed with login
      const role = userData.role || "student";
      const displayName = userData.fullName || user.email.split("@")[0];

      // Pass user data to parent component
      if (onLoginSuccess) onLoginSuccess({
        uid: user.uid,
        role,
        email: user.email,
        displayName,
        emailVerified: user.emailVerified,
        status: userData.status || 'active',
        ...userData
      });

      // Role-based routing
      if (role === "student") {
        navigate("/student/dashboard");
      } else if (role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/"); // fallback
      }
      
    } catch (error) {
      console.error("Login error:", error);
      
      // User-friendly error messages
      if (error.code === "auth/invalid-credential") {
        setError("Invalid email or password. Please try again.");
      } else if (error.code === "auth/user-not-found") {
        setError("No account found with this email. Please sign up first.");
      } else if (error.code === "auth/wrong-password") {
        setError("Incorrect password. Please try again.");
      } else if (error.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else if (error.code === "auth/user-disabled") {
        setError("This account has been disabled by the system administrator.");
      } else {
        setError(error.message || "An error occurred during login.");
      }
      
      setNeedsVerification(false);
      setAccountSuspended(false);
    }
    
    setLoading(false);
  };

  const handleResendVerification = async () => {
    if (!email || !password) {
      setError("Please enter your email and password first.");
      return;
    }
    
    setResending(true);
    setError("");
    
    try {
      // Try to sign in first to get the user object
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Check if account is suspended before sending verification
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const userData = docSnap.data();
        if (userData.status === 'suspended' || userData.isSuspended === true) {
          await signOut(auth);
          setAccountSuspended(true);
          setSuspensionDetails({
            reason: userData.suspensionReason || "Account has been suspended by administrator",
            suspendedAt: userData.suspendedAt || null,
            until: userData.suspendedUntil || null
          });
          setError("Cannot send verification: Account is suspended.");
          setResending(false);
          return;
        }
      }
      
      // Send verification email
      await sendEmailVerification(user, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: true
      });
      
      // Sign out immediately
      await signOut(auth);
      
      setVerificationSent(true);
      setError("✅ Verification email sent! Check your inbox (and spam folder).");
      
    } catch (error) {
      console.error("Resend verification error:", error);
      
      if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found") {
        setError("Please enter correct credentials to resend verification.");
      } else if (error.code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait before trying again.");
      } else {
        setError("Failed to send verification email. Please try again.");
      }
    } finally {
      setResending(false);
    }
  };

  const handleForgotPassword = () => {
    navigate("/forgot-password", {
      state: { email }
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Not specified";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Left side - Branding/Graphics */}
      <div className="md:w-1/2 p-8 md:p-16 flex flex-col justify-center items-center text-center md:text-left">
        <div className="max-w-md">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-6">
            <Link to="/" className="flex items-center space-x-3">
              <img 
                src="/logo4.png" 
                alt="Pavoc LMS Logo" 
                className="h-15 w-15 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl object-cover"
              />
              <span className="text-3xl font-bold text-gray-900">Pavoc LMS</span>
            </Link>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Welcome to Your <span className="text-blue-600">Learning</span> Journey
          </h2>
          
          <p className="text-gray-600 text-lg mb-8">
            Access your courses, track progress, and connect with instructors in our modern eLearning platform.
          </p>
          
          {/* Feature list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
              <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-bold">📚</span>
              </div>
              <span className="text-gray-700">Great Courses</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
              <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 font-bold">👨‍🏫</span>
              </div>
              <span className="text-gray-700">Expert Instructors</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
              <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 font-bold">📊</span>
              </div>
              <span className="text-gray-700">Progress Tracking</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
              <div className="h-10 w-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <ShieldAlert className="h-5 w-5 text-yellow-600" />
              </div>
              <span className="text-gray-700">Secure Login</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="md:w-1/2 p-8 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Sign In to Your Account</h2>
              <p className="text-gray-600 mt-2">Enter your credentials to continue learning</p>
            </div>

            {/* Account Suspended Message */}
            {accountSuspended && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Ban className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-red-800 font-bold text-lg">
                        Account Suspended
                      </p>
                      <UserX className="h-5 w-5 text-red-500" />
                    </div>
                    <p className="text-red-700 text-sm mt-2">
                      Your account has been suspended and you cannot log in at this time.
                    </p>
                    
                    {suspensionDetails && (
                      <div className="mt-3 p-3 bg-red-100 rounded border border-red-200">
                        <div className="space-y-2">
                          <div>
                            <span className="text-red-800 font-medium text-xs">Reason:</span>
                            <p className="text-red-700 text-sm">{suspensionDetails.reason}</p>
                          </div>
                          
                          {suspensionDetails.suspendedAt && (
                            <div>
                              <span className="text-red-800 font-medium text-xs">Suspended On:</span>
                              <p className="text-red-700 text-sm">
                                {formatDate(suspensionDetails.suspendedAt)}
                              </p>
                            </div>
                          )}
                          
                          {suspensionDetails.until && (
                            <div>
                              <span className="text-red-800 font-medium text-xs">Suspended Until:</span>
                              <p className="text-red-700 text-sm">
                                {formatDate(suspensionDetails.until)}
                              </p>
                            </div>
                          )}
                          
                          {suspensionDetails.adminNote && (
                            <div>
                              <span className="text-red-800 font-medium text-xs">Admin Note:</span>
                              <p className="text-red-700 text-sm italic">{suspensionDetails.adminNote}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-4 p-3 bg-red-100 rounded border border-red-200">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-red-800 font-medium text-sm">Need Assistance?</p>
                          <p className="text-red-700 text-xs mt-1">
                            If you believe this is a mistake or need to appeal the suspension, 
                            please contact our support team at <span className="font-medium">support@bizika.com</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Email verification required message */}
            {needsVerification && !accountSuspended && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-800 font-medium">
                      Email Verification Required
                    </p>
                    <p className="text-yellow-700 text-sm mt-1">
                      You need to verify your email before logging in.
                    </p>
                    <button
                      onClick={handleResendVerification}
                      disabled={resending || verificationSent || loading}
                      className="mt-3 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-medium py-2 px-4 rounded transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {resending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : verificationSent ? (
                        <>
                          <Mail className="h-4 w-4" />
                          Email Sent!
                        </>
                      ) : (
                        "Resend Verification Email"
                      )}
                    </button>
                    <p className="text-yellow-600 text-xs mt-2">
                      📧 Check your spam folder if you don't see the email.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && !needsVerification && !accountSuspended && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Success message for verification sent */}
            {verificationSent && !accountSuspended && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-green-800 font-medium">
                      Verification Email Sent!
                    </p>
                    <p className="text-green-700 text-sm mt-1">
                      Please check your inbox and click the verification link.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                      setNeedsVerification(false);
                      setAccountSuspended(false);
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="student@example.com"
                    required
                    disabled={loading || accountSuspended}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-400">📧</span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                      setAccountSuspended(false);
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition pr-12 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="••••••••"
                    required
                    disabled={loading || accountSuspended}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed"
                    disabled={loading || accountSuspended}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    defaultChecked={true}
                    disabled={loading || accountSuspended}
                  />
                  <span className={`ml-2 text-sm ${accountSuspended ? 'text-gray-400' : 'text-gray-600'}`}>
                    Keep me logged in
                  </span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                  disabled={loading || accountSuspended}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || accountSuspended}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-200 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && !accountSuspended ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing In...
                  </>
                ) : accountSuspended ? (
                  <>
                    <Ban className="h-5 w-5" />
                    Account Suspended
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className={`text-center text-sm ${accountSuspended ? 'text-gray-400' : 'text-gray-600'}`}>
                Don't have an account?{" "}
                <Link 
                  to="/signup" 
                  className={`${accountSuspended ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-800 font-medium'}`}
                  onClick={(e) => {
                    if (loading || accountSuspended) e.preventDefault();
                  }}
                >
                  Register
                </Link>
              </p>
            </div>

            {/* Account status info */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="text-xs font-medium text-blue-900 mb-1 flex items-center">
                  <span className="mr-1">ℹ️</span> Account Status Information
                </h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li className="flex items-start">
                    <span className="mr-1">•</span>
                    <span><span className="font-medium">Active:</span> You can log in and access all features</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-1">•</span>
                    <span><span className="font-medium">Unverified:</span> Verify email to activate account</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-1">•</span>
                    <span><span className="font-medium">Suspended:</span> Account temporarily disabled</span>
                  </li>
                  
                </ul>
                <div className="mt-2 text-xs text-blue-700">
                  <p>Contact <span className="font-medium">info@pavocsolutionsltd.co.ke</span> for account issues</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
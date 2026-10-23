// src/pages/login.jsx
import { useState } from "react";
import { auth, db } from "../firebase/config";
import {
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  Eye, EyeOff, Loader2, Mail, AlertCircle, Ban, BookOpen,
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
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        await signOut(auth);
        throw new Error("User profile not found. Please contact support.");
      }
      const userData = userDoc.data();

      if (userData.status === "suspended" || userData.isSuspended === true) {
        await signOut(auth);
        setAccountSuspended(true);
        setSuspensionDetails({
          reason: userData.suspensionReason || "Account suspended by administrator",
          suspendedAt: userData.suspendedAt || null,
          until: userData.suspendedUntil || null,
          adminNote: userData.adminNote || null,
        });
        setError("Your account has been suspended.");
        setLoading(false);
        return;
      }

      if (!user.emailVerified) {
        await signOut(auth);
        setNeedsVerification(true);
        setError("Please verify your email before logging in.");
        setLoading(false);
        return;
      }

      const role = userData.role || "student";
      const displayName = userData.fullName || user.email.split("@")[0];

      if (onLoginSuccess)
        onLoginSuccess({
          uid: user.uid,
          role,
          email: user.email,
          displayName,
          emailVerified: user.emailVerified,
          status: userData.status || "active",
          ...userData,
        });

      if (role === "student") navigate("/student/dashboard");
      else if (role === "admin") navigate("/admin/dashboard");
      else navigate("/");
    } catch (err) {
      if (err.code === "auth/invalid-credential")
        setError("Invalid email or password.");
      else if (err.code === "auth/user-not-found")
        setError("No account found with this email.");
      else if (err.code === "auth/wrong-password")
        setError("Incorrect password.");
      else if (err.code === "auth/too-many-requests")
        setError("Too many attempts. Please try again later.");
      else if (err.code === "auth/user-disabled")
        setError("This account has been disabled.");
      else setError(err.message || "Something went wrong.");
      setNeedsVerification(false);
      setAccountSuspended(false);
    }
    setLoading(false);
  };

  const handleResendVerification = async () => {
    if (!email || !password) return setError("Enter email and password first.");
    setResending(true);
    setError("");
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.status === "suspended" || data.isSuspended === true) {
          await signOut(auth);
          setAccountSuspended(true);
          setSuspensionDetails({
            reason: data.suspensionReason || "Account suspended",
            suspendedAt: data.suspendedAt || null,
            until: data.suspendedUntil || null,
          });
          setResending(false);
          return;
        }
      }
      await sendEmailVerification(user, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: true,
      });
      await signOut(auth);
      setVerificationSent(true);
      setError("Verification email sent. Check your inbox.");
    } catch (err) {
      if (err.code === "auth/invalid-credential")
        setError("Enter correct credentials to resend verification.");
      else setError("Failed to send verification email.");
    } finally {
      setResending(false);
    }
  };

  const formatDate = (t) => {
    if (!t) return "Not specified";
    const d = t.toDate ? t.toDate() : new Date(t);
    return d.toLocaleString("en-US", {
      month: "long", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Left panel — brand */}
      <aside className="hidden lg:flex flex-col justify-between bg-blue-800 p-12 text-white">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10">
            <BookOpen className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Bizika LMS</span>
        </Link>

        <div className="max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight leading-tight">
            Learn practical skills,
            <br />
            at your own pace.
          </h1>
          <p className="mt-5 text-sm text-blue-100 leading-relaxed">
            Sign in to access your courses, track progress, and pick up where you
            left off.
          </p>

          <ul className="mt-10 space-y-3 text-sm">
            {[
              "Video and reading lessons",
              "Progress saved automatically",
              "Certificates on completion",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-blue-100">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-blue-200">
          © {new Date().getFullYear()} Bizika LMS
        </p>
      </aside>

      {/* Right panel — form */}
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          {/* Small logo for mobile */}
          <Link to="/" className="lg:hidden flex items-center gap-2.5 mb-10">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-800">
              <BookOpen className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Bizika LMS</span>
          </Link>

          <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-2 text-sm text-slate-500">
            Enter your credentials to continue.
          </p>

          {/* Suspended */}
          {accountSuspended && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <Ban className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold text-red-800">Account suspended</p>
                  <p className="mt-1 text-red-700">
                    {suspensionDetails?.reason}
                  </p>
                  {suspensionDetails?.suspendedAt && (
                    <p className="mt-2 text-xs text-red-600">
                      Suspended: {formatDate(suspensionDetails.suspendedAt)}
                    </p>
                  )}
                  {suspensionDetails?.until && (
                    <p className="mt-1 text-xs text-red-600">
                      Until: {formatDate(suspensionDetails.until)}
                    </p>
                  )}
                  {suspensionDetails?.adminNote && (
                    <p className="mt-2 text-xs text-red-600 italic">
                      Note: {suspensionDetails.adminNote}
                    </p>
                  )}
                  <p className="mt-3 text-xs text-red-600">
                    Contact support if you believe this is a mistake.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Needs verification */}
          {needsVerification && !accountSuspended && (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-800">
                    Email verification required
                  </p>
                  <p className="mt-1 text-amber-700">
                    Verify your email before logging in.
                  </p>
                  <button
                    onClick={handleResendVerification}
                    disabled={resending || verificationSent || loading}
                    className="mt-3 inline-flex items-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                  >
                    {resending ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" /> Sending...
                      </>
                    ) : verificationSent ? (
                      <>
                        <Mail className="h-3 w-3" /> Email sent
                      </>
                    ) : (
                      "Resend email"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Generic error */}
          {error && !needsVerification && !accountSuspended && (
            <div className="mt-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Verification sent success */}
          {verificationSent && !accountSuspended && (
            <div className="mt-6 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              <Mail className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Verification email sent. Check your inbox.</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                  setNeedsVerification(false);
                  setAccountSuspended(false);
                }}
                required
                disabled={loading || accountSuspended}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-800 disabled:bg-slate-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password", { state: { email } })}
                  disabled={loading || accountSuspended}
                  className="text-xs font-medium text-blue-800 hover:text-blue-900 disabled:opacity-50"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                    setAccountSuspended(false);
                  }}
                  required
                  disabled={loading || accountSuspended}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 pr-10 text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-800 disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading || accountSuspended}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 disabled:opacity-50"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || accountSuspended}
              className="w-full rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {loading && !accountSuspended ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
                </>
              ) : accountSuspended ? (
                <>
                  <Ban className="h-4 w-4" /> Account suspended
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            New to Bizika?{" "}
            <Link
              to="/signup"
              className="font-medium text-blue-800 hover:text-blue-900"
              onClick={(e) => {
                if (loading || accountSuspended) e.preventDefault();
              }}
            >
              Create an account
            </Link>
          </p>

          <p className="mt-6 text-center text-xs text-slate-400">
            Trouble signing in? Contact{" "}
            <span className="text-slate-500">info@pavocsolutionsltd.co.ke</span>
          </p>
        </div>
      </main>
    </div>
  );
}
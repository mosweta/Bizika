// src/pages/forgotpassword.jsx
import { useState } from "react";
import { auth } from "../firebase/config";
import { sendPasswordResetEmail } from "firebase/auth";
import { ArrowLeft, BookOpen, CheckCircle, Loader2, Mail, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState("");

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/reset-password`,
        handleCodeInApp: false,
      };
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      setSuccess(true);
      setEmailSent(email);
      setEmail("");
    } catch (err) {
      setError(
        err.code === "auth/user-not-found"
          ? "No account found with this email address."
          : err.code === "auth/invalid-email"
          ? "Please enter a valid email address."
          : err.code === "auth/too-many-requests"
          ? "Too many attempts. Please try again later."
          : "Failed to send reset email. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!emailSent) return;
    setLoading(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, emailSent, {
        url: `${window.location.origin}/reset-password`,
        handleCodeInApp: false,
      });
    } catch {
      setError("Failed to resend email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Left brand panel */}
      <aside className="hidden lg:flex flex-col justify-between bg-blue-800 p-12 text-white">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10">
            <BookOpen className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Bizika LMS</span>
        </Link>

        <div className="max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight leading-tight">
            Reset your password.
          </h1>
          <p className="mt-5 text-sm text-blue-100 leading-relaxed">
            We'll send a secure link to your email. Open it, set a new password,
            and you're back in.
          </p>

          <ul className="mt-10 space-y-3 text-sm">
            {[
              "Link expires in 1 hour",
              "Works on any device",
              "Your data stays safe",
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

      {/* Right panel */}
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden flex items-center gap-2.5 mb-8">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-800">
              <BookOpen className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Bizika LMS</span>
          </Link>

          {/* Back link */}
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>

          {/* ─── SUCCESS VIEW ─── */}
          {success ? (
            <div className="mt-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 border border-green-100">
                <CheckCircle className="h-5 w-5 text-green-700" />
              </div>

              <h2 className="mt-5 text-2xl font-semibold tracking-tight">
                Check your email
              </h2>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                If an account exists for{" "}
                <span className="font-medium text-slate-900 break-all">
                  {emailSent}
                </span>
                , you'll receive a password reset link shortly.
              </p>

              <div className="mt-6 rounded-lg border border-slate-200 p-4 text-xs text-slate-500 space-y-1.5">
                <p>• The link expires in 1 hour</p>
                <p>• Only the most recent email works</p>
                <p>• Check your spam folder if you don't see it</p>
              </div>

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={handleResend}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-300 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                    </>
                  ) : (
                    "Didn't get it? Resend"
                  )}
                </button>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-900"
                >
                  Back to sign in
                </Link>
              </div>
            </div>
          ) : (
            /* ─── FORM VIEW ─── */
            <div className="mt-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 border border-blue-100">
                <Mail className="h-5 w-5 text-blue-800" />
              </div>

              <h2 className="mt-5 text-2xl font-semibold tracking-tight">
                Forgot password?
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Enter your email and we'll send you a reset link.
              </p>

              {error && (
                <div className="mt-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="mt-8 space-y-5">
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
                    }}
                    required
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-800"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-slate-500">
                Remembered it?{" "}
                <Link
                  to="/login"
                  className="font-medium text-blue-800 hover:text-blue-900"
                >
                  Sign in
                </Link>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
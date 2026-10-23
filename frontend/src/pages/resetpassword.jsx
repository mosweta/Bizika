// src/pages/resetpassword.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { auth } from "../firebase/config";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import {
  ArrowLeft, BookOpen, CheckCircle, Eye, EyeOff, KeyRound,
  Loader2, AlertCircle, XCircle,
} from "lucide-react";

export default function PasswordReset() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const oobCode = searchParams.get("oobCode");
  const emailParam = searchParams.get("email");

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState("");

  const verificationAttempted = useRef(false);
  const cleanupRef = useRef(null);

  const verifyCode = useCallback(async () => {
    if (verificationAttempted.current) return;
    verificationAttempted.current = true;

    let finalOobCode = oobCode;

    if (!finalOobCode) {
      const stored = sessionStorage.getItem("resetPasswordData");
      if (stored) {
        try {
          const data = JSON.parse(stored);
          finalOobCode = data.oobCode;
          if (data.email) setVerifiedEmail(data.email);
        } catch {}
      }
    }

    if (!finalOobCode) {
      setError("Invalid reset link. Missing reset code.");
      setVerifying(false);
      return;
    }

    try {
      const timeoutPromise = new Promise((_, reject) => {
        cleanupRef.current = setTimeout(
          () => reject(new Error("Verification timed out")),
          8000
        );
      });
      const verificationPromise = verifyPasswordResetCode(auth, finalOobCode);
      const email = await Promise.race([verificationPromise, timeoutPromise]);

      setVerifiedEmail(email);
      setVerifying(false);
      sessionStorage.setItem(
        "resetPasswordData",
        JSON.stringify({
          oobCode: finalOobCode,
          email,
          timestamp: Date.now(),
        })
      );
    } catch (err) {
      setVerifying(false);
      sessionStorage.removeItem("resetPasswordData");
      if (err.code === "auth/expired-action-code") {
        setError("This reset link has expired. Please request a new one.");
      } else if (err.code === "auth/invalid-action-code") {
        setError("Invalid reset link. Please request a new one.");
      } else {
        setError("Failed to verify reset link. Please try again.");
      }
    }
  }, [oobCode]);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) clearTimeout(cleanupRef.current);
    };
  }, []);

  useEffect(() => {
    if (oobCode || sessionStorage.getItem("resetPasswordData")) {
      verifyCode();
    } else {
      setVerifying(false);
      setError("Invalid reset link. Please use the link from your email.");
    }
  }, [oobCode, verifyCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    let finalOobCode = oobCode;
    if (!finalOobCode) {
      const stored = sessionStorage.getItem("resetPasswordData");
      if (stored) {
        try {
          finalOobCode = JSON.parse(stored).oobCode;
        } catch {}
      }
    }

    if (!finalOobCode) return setError("Invalid reset link. Please request a new one.");
    if (!formData.password || !formData.confirmPassword)
      return setError("Please fill in both fields.");
    if (formData.password !== formData.confirmPassword)
      return setError("Passwords do not match.");
    if (formData.password.length < 6)
      return setError("Password must be at least 6 characters.");

    setLoading(true);
    setError("");

    try {
      await confirmPasswordReset(auth, finalOobCode, formData.password);
      sessionStorage.removeItem("resetPasswordData");
      setSuccess(true);
      setTimeout(() => {
        navigate("/login", {
          state: { message: "Password reset successful. Please sign in." },
          replace: true,
        });
      }, 3000);
    } catch (err) {
      if (err.code === "auth/expired-action-code") {
        setError("This reset link has expired.");
        sessionStorage.removeItem("resetPasswordData");
      } else if (err.code === "auth/invalid-action-code") {
        setError("Invalid reset link.");
        sessionStorage.removeItem("resetPasswordData");
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak. Please choose a stronger one.");
      } else {
        setError("Failed to reset password. Please try again.");
      }
      setLoading(false);
    }
  };

  // ─── Loading (verifying) ────────────────────────────────────
  if (verifying) {
    return (
      <div className="min-h-screen grid lg:grid-cols-2 bg-white">
        <aside className="hidden lg:flex flex-col justify-between bg-blue-800 p-12 text-white">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10">
              <BookOpen className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Bizika LMS</span>
          </Link>
          <div className="max-w-md">
            <h1 className="text-3xl font-semibold tracking-tight leading-tight">
              Verifying your link.
            </h1>
            <p className="mt-5 text-sm text-blue-100 leading-relaxed">
              This will only take a moment.
            </p>
          </div>
          <p className="text-xs text-blue-200">
            © {new Date().getFullYear()} Bizika LMS
          </p>
        </aside>

        <main className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-sm text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-800" />
            <h2 className="mt-6 text-lg font-semibold">Verifying reset link</h2>
            <p className="mt-2 text-sm text-slate-500">Please wait…</p>
          </div>
        </main>
      </div>
    );
  }

  // ─── Success ────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen grid lg:grid-cols-2 bg-white">
        <aside className="hidden lg:flex flex-col justify-between bg-blue-800 p-12 text-white">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10">
              <BookOpen className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Bizika LMS</span>
          </Link>
          <div className="max-w-md">
            <h1 className="text-3xl font-semibold tracking-tight leading-tight">
              You're all set.
            </h1>
            <p className="mt-5 text-sm text-blue-100 leading-relaxed">
              Your password has been updated. Sign in with your new credentials.
            </p>
          </div>
          <p className="text-xs text-blue-200">
            © {new Date().getFullYear()} Bizika LMS
          </p>
        </aside>

        <main className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 border border-green-100">
              <CheckCircle className="h-6 w-6 text-green-700" />
            </div>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight">
              Password updated
            </h2>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
              Redirecting you to sign in…
            </p>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Please wait</span>
            </div>

            <Link
              to="/login"
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-900"
            >
              Go to sign in
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ─── Error ──────────────────────────────────────────────────
  if (error && !verifying && !success) {
    return (
      <div className="min-h-screen grid lg:grid-cols-2 bg-white">
        <aside className="hidden lg:flex flex-col justify-between bg-blue-800 p-12 text-white">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10">
              <BookOpen className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Bizika LMS</span>
          </Link>
          <div className="max-w-md">
            <h1 className="text-3xl font-semibold tracking-tight leading-tight">
              Something went wrong.
            </h1>
            <p className="mt-5 text-sm text-blue-100 leading-relaxed">
              Request a new password reset link and try again.
            </p>
          </div>
          <p className="text-xs text-blue-200">
            © {new Date().getFullYear()} Bizika LMS
          </p>
        </aside>

        <main className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 border border-red-100">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight">
              Reset failed
            </h2>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
              {error}
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <Link
                to="/forgot-password"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-900"
              >
                Request new reset link
              </Link>
              <Link
                to="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-300"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ─── Main form ──────────────────────────────────────────────
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      <aside className="hidden lg:flex flex-col justify-between bg-blue-800 p-12 text-white">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10">
            <BookOpen className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Bizika LMS</span>
        </Link>

        <div className="max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight leading-tight">
            Set a new password.
          </h1>
          <p className="mt-5 text-sm text-blue-100 leading-relaxed">
            Choose a strong password you haven't used before. You'll be signed
            in once it's saved.
          </p>

          <ul className="mt-10 space-y-3 text-sm">
            {[
              "At least 6 characters",
              "Mix letters, numbers, and symbols",
              "Don't reuse old passwords",
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

      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden flex items-center gap-2.5 mb-8">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-800">
              <BookOpen className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Bizika LMS</span>
          </Link>

          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>

          <div className="mt-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 border border-blue-100">
              <KeyRound className="h-5 w-5 text-blue-800" />
            </div>

            <h2 className="mt-5 text-2xl font-semibold tracking-tight">
              Set new password
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {verifiedEmail || emailParam
                ? `For ${verifiedEmail || emailParam}`
                : "Choose a new password for your account."}
            </p>

            {error && (
              <div className="mt-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, password: e.target.value }));
                      setError("");
                    }}
                    required
                    minLength={6}
                    disabled={loading}
                    placeholder="Enter new password"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 pr-10 text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-800 disabled:bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-400">At least 6 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      setFormData((p) => ({
                        ...p,
                        confirmPassword: e.target.value,
                      }));
                      setError("");
                    }}
                    required
                    disabled={loading}
                    placeholder="Confirm new password"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 pr-10 text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-800 disabled:bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 disabled:opacity-50"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Resetting...
                  </>
                ) : (
                  "Reset password"
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
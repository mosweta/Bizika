// src/pages/signup.jsx
import { useState, useEffect } from "react";
import { auth, db } from "../firebase/config";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification as sendFirebaseEmailVerification,
  signOut,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import {
  Eye, EyeOff, Check, X, Loader2, Mail, AlertCircle, BookOpen, ArrowRight,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

const CLOUDFLARE_WORKER_URL =
  import.meta.env.VITE_R2_WORKER_URL || "http://127.0.0.1:8787";

// ─── Pure helpers (safe to call during render) ─────────────────
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const getPasswordRequirements = (password) => {
  const pw = password || "";
  return [
    { regex: /.{8,}/, text: "8+ characters", met: /.{8,}/.test(pw) },
    { regex: /[A-Z]/, text: "Uppercase letter", met: /[A-Z]/.test(pw) },
    { regex: /[a-z]/, text: "Lowercase letter", met: /[a-z]/.test(pw) },
    { regex: /[0-9]/, text: "Number", met: /[0-9]/.test(pw) },
    {
      regex: /[^A-Za-z0-9]/,
      text: "Special character",
      met: /[^A-Za-z0-9]/.test(pw),
    },
  ];
};

const getPasswordStrength = (password) =>
  getPasswordRequirements(password).filter((r) => r.met).length;

// ─── Component ────────────────────────────────────────────────
export default function Signup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [countdown, setCountdown] = useState(8);
  const [verificationEmailSent, setVerificationEmailSent] = useState("");

  // Redirect after success
  useEffect(() => {
    if (!success) return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
    navigate("/login", {
      state: {
        message: "Please verify your email before logging in.",
        email: verificationEmailSent,
      },
    });
  }, [success, countdown, navigate, verificationEmailSent]);

  // ─── API ────────────────────────────────────────────────────
  const sendCustomVerificationEmail = async (email, name, userId) => {
    try {
      const verificationLink = `${window.location.origin}/emails?mode=verifyEmail&uid=${userId}&email=${encodeURIComponent(
        email
      )}`;
      const res = await fetch(`${CLOUDFLARE_WORKER_URL}/send-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, verificationLink }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to send email");
      return { success: true, data: result };
    } catch (err) {
      console.error("Custom email error:", err);
      return { success: false, error: err.message };
    }
  };

  // ─── Handlers ───────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
    // No state updates derived from render — errors clear via events
  };

  const validateForm = () => {
    const e = {};
    if (!formData.firstName.trim()) e.firstName = "First name required";
    if (!formData.lastName.trim()) e.lastName = "Last name required";
    if (!validateEmail(formData.email)) e.email = "Enter a valid email";
    if (formData.password.length < 8) e.password = "At least 8 characters";
    if (formData.password !== formData.confirmPassword)
      e.confirmPassword = "Passwords don't match";
    if (getPasswordStrength(formData.password) < 3)
      e.passwordStrength = "Password is too weak";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = cred.user;

      const customEmail = await sendCustomVerificationEmail(
        user.email,
        `${formData.firstName} ${formData.lastName}`,
        user.uid
      );

      if (!customEmail.success) {
        await sendFirebaseEmailVerification(user, {
          url: window.location.origin + "/login",
          handleCodeInApp: true,
        });
      }

      setVerificationEmailSent(user.email);
      await new Promise((r) => setTimeout(r, 500));

      const configRef = doc(db, "system", "config");
      let configSnap;
      try {
        configSnap = await getDoc(configRef);
      } catch {
        configSnap = { exists: () => false };
      }
      const firstUser =
        !configSnap.exists() || !configSnap.data()?.adminCreated;
      setIsFirstUser(firstUser);

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        fullName: `${formData.firstName} ${formData.lastName}`,
        role: firstUser ? "admin" : "student",
        status: "pending_verification",
        createdAt: new Date().toISOString(),
        lastLogin: null,
        profileComplete: false,
        enrolledCourses: [],
        isEmailVerified: false,
        emailVerificationSent: new Date().toISOString(),
        emailVerificationMethod: customEmail.success ? "custom" : "firebase",
        avatarColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      });

      if (firstUser) {
        try {
          await setDoc(
            configRef,
            {
              adminCreated: true,
              updatedAt: new Date().toISOString(),
              firstAdminUid: user.uid,
              firstAdminEmail: user.email,
            },
            { merge: true }
          );
        } catch {}
      }

      await signOut(auth);
      setSuccess(true);
      setCountdown(8);
    } catch (err) {
      let msg = "Unable to create account. Please try again.";
      if (err.code === "auth/email-already-in-use")
        msg = "This email is already registered.";
      else if (err.code === "auth/weak-password")
        msg = "Please choose a stronger password.";
      else if (err.code === "auth/invalid-email")
        msg = "Please enter a valid email.";
      setErrors((p) => ({ ...p, submit: msg }));
      if (auth.currentUser) {
        try {
          await auth.currentUser.delete();
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Success view ───────────────────────────────────────────
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
              One more step.
            </h1>
            <p className="mt-5 text-sm text-blue-100 leading-relaxed">
              We've sent a verification link. Click it to activate your account,
              then sign in.
            </p>
          </div>
          <p className="text-xs text-blue-200">
            © {new Date().getFullYear()} Bizika LMS
          </p>
        </aside>

        <main className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 border border-blue-100">
              <Mail className="h-6 w-6 text-blue-800" />
            </div>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight">
              Check your inbox
            </h2>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
              We sent a verification link to
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900 break-all">
              {verificationEmailSent}
            </p>
            <p className="mt-4 text-sm text-slate-500">
              Click the link in the email to activate your account.
            </p>

            {isFirstUser && (
              <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-left text-sm">
                <p className="font-semibold text-blue-900">
                  You're the first user
                </p>
                <p className="mt-1 text-blue-800">
                  After verification, you'll have administrator access.
                </p>
              </div>
            )}

            <div className="mt-8 rounded-lg border border-slate-200 p-4 text-left text-xs text-slate-500 space-y-1.5">
              <p>• Check your spam folder if you don't see the email</p>
              <p>• The link expires in 1 hour</p>
              <p>• You must verify before you can sign in</p>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Redirecting to login in {countdown}s</span>
              </div>
              <div className="mt-3 mx-auto w-full max-w-xs bg-slate-100 rounded-full h-1 overflow-hidden">
                <div
                  className="h-full bg-blue-800 transition-all duration-1000"
                  style={{ width: `${((8 - countdown) / 8) * 100}%` }}
                />
              </div>
            </div>

            <button
              onClick={() =>
                navigate("/login", {
                  state: {
                    message: "Please verify your email.",
                    email: verificationEmailSent,
                  },
                })
              }
              className="mt-8 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
            >
              Go to login <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ─── Form view ──────────────────────────────────────────────
  const passwordReqs = getPasswordRequirements(formData.password);

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
            Start learning in
            <br />
            under a minute.
          </h1>
          <p className="mt-5 text-sm text-blue-100 leading-relaxed">
            Create a free Bizika account. No credit card, no clutter — just
            focused courses.
          </p>

          <ul className="mt-10 space-y-3 text-sm">
            {[
              "Free courses to start",
              "Video and reading lessons",
              "Track progress on every lesson",
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

      {/* Right form panel */}
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden flex items-center gap-2.5 mb-8">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-800">
              <BookOpen className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Bizika LMS</span>
          </Link>

          <h2 className="text-2xl font-semibold tracking-tight">Create account</h2>
          <p className="mt-2 text-sm text-slate-500">
            It only takes a minute.
          </p>

          {errors.submit && (
            <div className="mt-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{errors.submit}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  First name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none ${
                    errors.firstName
                      ? "border-red-300 focus:border-red-500"
                      : "border-slate-200 focus:border-blue-800"
                  }`}
                  placeholder="John"
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Last name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none ${
                    errors.lastName
                      ? "border-red-300 focus:border-red-500"
                      : "border-slate-200 focus:border-blue-800"
                  }`}
                  placeholder="Doe"
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className={`w-full rounded-lg border px-3 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none ${
                  errors.email
                    ? "border-red-300 focus:border-red-500"
                    : "border-slate-200 focus:border-blue-800"
                }`}
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={`w-full rounded-lg border px-3 py-2.5 pr-10 text-sm placeholder:text-slate-400 focus:outline-none ${
                    errors.password
                      ? "border-red-300 focus:border-red-500"
                      : "border-slate-200 focus:border-blue-800"
                  }`}
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password}</p>
              )}

              {formData.password && (
                <div className="mt-2 space-y-1">
                  {passwordReqs.map((r) => (
                    <div
                      key={r.text}
                      className={`flex items-center gap-1.5 text-xs ${
                        r.met ? "text-green-700" : "text-slate-400"
                      }`}
                    >
                      {r.met ? <Check size={12} /> : <X size={12} />}
                      <span>{r.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className={`w-full rounded-lg border px-3 py-2.5 pr-10 text-sm placeholder:text-slate-400 focus:outline-none ${
                    errors.confirmPassword
                      ? "border-red-300 focus:border-red-500"
                      : "border-slate-200 focus:border-blue-800"
                  }`}
                  placeholder="Re-enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                required
                id="terms"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-blue-800"
              />
              <label htmlFor="terms" className="text-xs text-slate-600">
                I agree to the{" "}
                <Link to="/terms" className="text-blue-800 hover:underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-blue-800 hover:underline">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating account...
                </>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-blue-800 hover:text-blue-900">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
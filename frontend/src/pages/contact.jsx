// src/pages/contact.jsx
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import Swal from "sweetalert2";
import {
  Send, MapPin, Phone, Mail, Clock, User, AlertCircle, CheckCircle,
} from "lucide-react";
import Footer from "./home/footer.jsx";

const WORKER_URL =
  import.meta.env.VITE_R2_WORKER_URL || "http://localhost:8787";
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

const SUBJECTS = [
  "General Inquiry",
  "Technical Support",
  "Course Enrollment",
  "Account Issues",
  "Other",
];

export default function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [captchaValue, setCaptchaValue] = useState(null);
  const [captchaError, setCaptchaError] = useState(!RECAPTCHA_SITE_KEY);
  const [rateLimit, setRateLimit] = useState(null);
  const recaptchaRef = useRef(null);

  // Clear rate limit hint when the user edits the form
  useEffect(() => {
    if (rateLimit) setRateLimit(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!captchaValue && RECAPTCHA_SITE_KEY) {
      Swal.fire({
        icon: "warning",
        title: "Verification required",
        text: "Please complete the reCAPTCHA.",
        confirmButtonColor: "#1E40AF",
      });
      return;
    }

    setLoading(true);
    setRateLimit(null);

    try {
      const res = await fetch(`${WORKER_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, token: captchaValue }),
      });

      const data = await res.json();

      if (res.ok) {
        const remaining = res.headers.get("X-RateLimit-Remaining");
        const resetHeader = res.headers.get("X-RateLimit-Reset");

        if (remaining && resetHeader) {
          setRateLimit({
            remaining: parseInt(remaining, 10),
            reset: new Date(parseInt(resetHeader, 10)),
          });
        }

        Swal.fire({
          icon: "success",
          title: "Message sent",
          text:
            data.message ||
            "Thanks for reaching out. We'll be in touch within 24 hours.",
          confirmButtonColor: "#1E40AF",
        });

        setForm({ name: "", email: "", subject: "", message: "" });
        recaptchaRef.current?.reset();
        setCaptchaValue(null);
      } else if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After");
        const minutes = retryAfter ? Math.ceil(parseInt(retryAfter, 10) / 60) : null;

        setRateLimit({ exceeded: true });

        Swal.fire({
          icon: "warning",
          title: "Too many submissions",
          html: `
            <p class="text-sm text-slate-600">
              You've reached the maximum of 10 messages per hour.
              ${minutes ? `Try again in about ${minutes} minutes.` : "Please try again later."}
            </p>
          `,
          confirmButtonColor: "#1E40AF",
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Couldn't send",
          text: data.error || "Something went wrong. Please try again.",
          confirmButtonColor: "#1E40AF",
        });
      }
    } catch (err) {
      console.error("Contact form error:", err);
      Swal.fire({
        icon: "error",
        title: "Network error",
        text: "Unable to reach the server. Please check your connection.",
        confirmButtonColor: "#1E40AF",
      });
    } finally {
      setLoading(false);
    }
  };

  const isBlocked = Boolean(rateLimit?.exceeded);
  const canSubmit =
    !loading &&
    !isBlocked &&
    (!RECAPTCHA_SITE_KEY || captchaValue) &&
    form.name.trim() &&
    form.email.trim() &&
    form.subject &&
    form.message.trim();

  return (
    <>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <section className="bg-blue-800 text-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Contact us
            </h1>
            <p className="mt-3 text-base text-blue-100 max-w-2xl">
              Have a question about a course, your account, or something else?
              We typically respond within 4 hours during business hours.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Left: contact info */}
            <aside className="lg:col-span-1 space-y-6">
              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <h2 className="text-base font-semibold text-slate-900">
                  Get in touch
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Reach us directly, or send a message using the form.
                </p>

                <ul className="mt-6 space-y-4 text-sm">
                  <li className="flex items-start gap-3">
                    <Mail className="h-4 w-4 mt-0.5 text-blue-800 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-slate-900">Email</div>
                      <a
                        href="mailto:support@pavoclms.com"
                        className="text-blue-800 hover:underline"
                      >
                        support@pavoclms.com
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Phone className="h-4 w-4 mt-0.5 text-blue-800 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-slate-900">Phone</div>
                      <div className="text-slate-600">+254 700 000 000</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 mt-0.5 text-blue-800 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-slate-900">Location</div>
                      <div className="text-slate-600">Nairobi, Kenya</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Clock className="h-4 w-4 mt-0.5 text-blue-800 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-slate-900">Hours</div>
                      <div className="text-slate-600">
                        Mon–Fri, 9:00–17:00 EAT
                      </div>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm">
                <h3 className="text-base font-semibold text-slate-900">
                  Before you write
                </h3>
                <ul className="mt-3 space-y-2 text-slate-600">
                  <li>
                    •{" "}
                    <Link to="/courses" className="text-blue-800 hover:underline">
                      Browse the catalog
                    </Link>{" "}
                    — most questions about a specific course are answered there.
                  </li>
                  <li>
                    •{" "}
                    <Link
                      to="/forgot-password"
                      className="text-blue-800 hover:underline"
                    >
                      Reset your password
                    </Link>{" "}
                    if you can't sign in.
                  </li>
                </ul>
              </div>
            </aside>

            {/* Right: form */}
            <div className="lg:col-span-2">
              <div className="rounded-lg border border-slate-200 bg-white p-6 sm:p-8">
                <h2 className="text-lg font-semibold text-slate-900">
                  Send us a message
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  All fields are required.
                </p>

                {captchaError && (
                  <div className="mt-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Verification unavailable</p>
                      <p className="mt-0.5 text-amber-700">
                        reCAPTCHA isn't configured. Email us directly at{" "}
                        <span className="font-medium">support@pavoclms.com</span>.
                      </p>
                    </div>
                  </div>
                )}

                {isBlocked && (
                  <div className="mt-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Too many submissions</p>
                      <p className="mt-0.5 text-amber-700">
                        Please wait before sending another message.
                      </p>
                    </div>
                  </div>
                )}

                {rateLimit && !rateLimit.exceeded && (
                  <div className="mt-6 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-green-700" />
                      {rateLimit.remaining}{" "}
                      {rateLimit.remaining === 1 ? "message" : "messages"} left
                      this hour
                    </span>
                    <span className="text-slate-400">
                      Resets{" "}
                      {rateLimit.reset.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-slate-700 mb-1.5"
                    >
                      Full name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={form.name}
                      onChange={handleChange}
                      disabled={loading || isBlocked}
                      placeholder="Jane Doe"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-800 disabled:bg-slate-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-slate-700 mb-1.5"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      disabled={loading || isBlocked}
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-800 disabled:bg-slate-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="subject"
                      className="block text-sm font-medium text-slate-700 mb-1.5"
                    >
                      Subject
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      required
                      value={form.subject}
                      onChange={handleChange}
                      disabled={loading || isBlocked}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-blue-800 disabled:bg-slate-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Choose a subject</option>
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-slate-700 mb-1.5"
                    >
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      value={form.message}
                      onChange={handleChange}
                      disabled={loading || isBlocked}
                      placeholder="Tell us what's on your mind…"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-800 disabled:bg-slate-50 disabled:cursor-not-allowed resize-y"
                    />
                  </div>

                  {RECAPTCHA_SITE_KEY && !captchaError && (
                    <ReCAPTCHA
                      ref={recaptchaRef}
                      sitekey={RECAPTCHA_SITE_KEY}
                      onChange={setCaptchaValue}
                      onErrored={() => setCaptchaError(true)}
                    />
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? (
                        <>
                          <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Sending…
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send message
                        </>
                      )}
                    </button>
                    <p className="mt-3 text-xs text-slate-500">
                      By submitting, you agree to our{" "}
                      <Link to="/privacy" className="text-blue-800 hover:underline">
                        Privacy Policy
                      </Link>{" "}
                      and{" "}
                      <Link to="/terms" className="text-blue-800 hover:underline">
                        Terms
                      </Link>
                      .
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}
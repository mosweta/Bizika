import React, { useState, useRef, useEffect } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import Swal from "sweetalert2";
import Footer from '../pages/home/footer.jsx';
import { 
  Send, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Clock,
  MessageSquare,
  User,
  BookOpen,
  AlertCircle
} from "lucide-react";

const ContactForm = () => {
  const [form, setForm] = useState({ 
    name: "", 
    email: "", 
    subject: "",
    message: "" 
  });
  const [loading, setLoading] = useState(false);
  const [captchaValue, setCaptchaValue] = useState(null);
  const [recaptchaError, setRecaptchaError] = useState(false);
  const recaptchaRef = useRef();

  // Get the reCAPTCHA site key
  const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";
  
  // Check if reCAPTCHA key is loaded
  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) {
      console.error("❌ reCAPTCHA site key is missing!");
      console.log("Environment variables loaded:", import.meta.env);
      setRecaptchaError(true);
    } else {
      console.log("✅ reCAPTCHA site key loaded:", RECAPTCHA_SITE_KEY.substring(0, 10) + "...");
    }
  }, []);

  // Handle form input changes
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!captchaValue) {
      Swal.fire({
        icon: "warning",
        title: "Verification Required",
        text: "Please complete the reCAPTCHA verification.",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    setLoading(true);

    try {
      // Point to your Cloudflare Worker
      const WORKER_URL = import.meta.env.VITE_R2_WORKER_URL || 'http://localhost:8787';
      
      const res = await fetch(`${WORKER_URL}/api/contact`, {  // Changed endpoint
        method: "POST",
        headers: { 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ 
          ...form, 
          token: captchaValue 
        }),
      });

      const data = await res.json();

      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Message Sent Successfully!",
          text: data.message || "Thank you for contacting Pavoc LMS. Our support team will get back to you within 24 hours.",
          confirmButtonColor: "#10b981",
          showConfirmButton: true,
          timer: 5000
        });
        setForm({ name: "", email: "", subject: "", message: "" });
        recaptchaRef.current?.reset();
        setCaptchaValue(null);
      } else {
        Swal.fire({
          icon: "error",
          title: "Submission Failed",
          text: data.error || "Something went wrong. Please try again.",
          confirmButtonColor: "#ef4444",
        });
      }
    } catch (err) {
      console.error('Contact form error:', err);
      Swal.fire({
        icon: "error",
        title: "Network Error",
        text: "Unable to connect to the server. Please check your internet connection.",
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setLoading(false);
    }
  };

  const subjects = [
    "General Inquiry",
    "Technical Support",
    "Course Enrollment",
    "Account Issues",
    "Other"
  ];

  return (
    <>
    

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-4">
              <MessageSquare className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">Contact us</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Have questions about our learning platform? Our support team is here to help you succeed in your educational journey.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Side - Contact Information */}
            <div className="space-y-6">
              {/* ... (keep your left side content exactly as is) ... */}
            </div>

            {/* Right Side - Contact Form */}
            <div className="bg-white rounded-2xl shadow-xl p-8 justify-center">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Send us a Message</h2>
                <p className="text-gray-600">
                  Fill out the form below and we'll get back to you as soon as possible.
                </p>
              </div>

              {/* reCAPTCHA Error Alert */}
              {recaptchaError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="h-5 w-5" />
                    <div>
                      <p className="font-medium">reCAPTCHA Configuration Error</p>
                      <p className="text-sm mt-1">
                        The contact form requires reCAPTCHA to prevent spam. 
                        Please email us directly at <strong>support@pavoclms.com</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      Full Name *
                    </div>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-base"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      Email Address *
                    </div>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-base"
                    required
                  />
                </div>

                {/* Subject */}
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-base bg-white"
                    required
                  >
                    <option value="">Select a subject</option>
                    {subjects.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Your Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Please provide details about your inquiry..."
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-base resize-none"
                    required
                  />
                </div>

                {/* reCAPTCHA - Only show if key exists */}
                {RECAPTCHA_SITE_KEY ? (
                  <div>
                    <ReCAPTCHA
                      ref={recaptchaRef}
                      sitekey={RECAPTCHA_SITE_KEY}
                      onChange={(val) => setCaptchaValue(val)}
                      onErrored={() => {
                        console.error("reCAPTCHA error occurred");
                        setRecaptchaError(true);
                      }}
                      className="mx-auto"
                    />
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-sm text-center">
                      <AlertCircle className="inline h-4 w-4 mr-1" />
                      reCAPTCHA is not configured. Form submission may be limited.
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={loading || (!captchaValue && RECAPTCHA_SITE_KEY)}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Sending Message...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        Send Message
                      </>
                    )}
                  </button>
                  <p className="text-sm text-gray-500 mt-3 text-center">
                    By submitting this form, you agree to our{" "}
                    <a href="/privacy" className="text-blue-600 hover:text-blue-800">
                      Privacy Policy
                    </a>{" "}
                    and{" "}
                    <a href="/terms" className="text-blue-600 hover:text-blue-800">
                      Terms of Service
                    </a>
                  </p>
                </div>
              </form>

              {/* Response Time */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center gap-2 text-gray-600">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <span className="text-sm">
                    Average response time: <strong>4 hours</strong> during business hours
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ... (keep your additional info section exactly as is) ... */}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ContactForm;
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
  const [rateLimitInfo, setRateLimitInfo] = useState(null); // NEW
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

  // Clear rate limit info when form changes
  useEffect(() => {
    if (rateLimitInfo) {
      setRateLimitInfo(null);
    }
  }, [form]);
  // Auto-refresh when rate limit resets
useEffect(() => {
  if (rateLimitInfo?.exceeded && rateLimitInfo.reset) {
    const now = new Date();
    const resetTime = new Date(rateLimitInfo.reset);
    const timeUntilReset = resetTime - now;
    
    if (timeUntilReset > 0) {
      const timer = setTimeout(() => {
        setRateLimitInfo(null);
        Swal.fire({
          icon: 'info',
          title: 'Rate Limit Reset',
          text: 'You can now submit messages again.',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        });
      }, timeUntilReset);
      
      return () => clearTimeout(timer);
    }
  }
}, [rateLimitInfo]);

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

// Format time remaining
const formatTimeRemaining = (resetTime) => {
  const now = new Date();
  const diffMs = resetTime - now;
  const diffMins = Math.ceil(diffMs / (1000 * 60));
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
  } else {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  }
};

// Calculate usage percentage
const calculateUsage = (remaining) => {
  const used = 10 - remaining;
  return {
    percentage: (used / 10) * 100,
    used,
    total: 10
  };
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
  setRateLimitInfo(null); // Clear previous rate limit info

  try {
    // Point to your Cloudflare Worker
    const WORKER_URL = import.meta.env.VITE_R2_WORKER_URL || 'http://localhost:8787';
    
    const res = await fetch(`${WORKER_URL}/api/contact`, {
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
      // Success - check for rate limit info in response headers
      const remaining = res.headers.get('X-RateLimit-Remaining');
      const reset = res.headers.get('X-RateLimit-Reset');
      
      if (remaining && reset) {
        const resetTime = new Date(parseInt(reset));
        const now = new Date();
        const hoursLeft = Math.ceil((resetTime - now) / (1000 * 60 * 60));
        
        // Store rate limit info
        setRateLimitInfo({
          remaining: parseInt(remaining),
          reset: resetTime,
          hoursLeft
        });
      }
      
      Swal.fire({
        icon: "success",
        title: "Message Sent Successfully!",
        html: `
          <div class="text-left">
            <p class="mb-3">${data.message || "Thank you for contacting Pavoc LMS."}</p>
            ${remaining ? `
              <div class="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p class="text-sm text-blue-800">
                  <strong>Note:</strong> You have <span class="font-bold">${remaining}</span> message${remaining !== 1 ? 's' : ''} remaining this hour.
                </p>
              </div>
            ` : ''}
          </div>
        `,
        confirmButtonColor: "#10b981",
        showConfirmButton: true,
      });
      
      setForm({ name: "", email: "", subject: "", message: "" });
      recaptchaRef.current?.reset();
      setCaptchaValue(null);
      
    } else if (res.status === 429) {
      // Rate limit exceeded
      const reset = res.headers.get('X-RateLimit-Reset');
      const retryAfter = res.headers.get('Retry-After');
      
      let waitTime = "a while";
      if (retryAfter) {
        const minutes = Math.ceil(parseInt(retryAfter) / 60);
        waitTime = minutes > 60 
          ? `${Math.ceil(minutes / 60)} hours` 
          : `${minutes} minutes`;
      } else if (reset) {
        const resetTime = new Date(parseInt(reset));
        const now = new Date();
        const minutes = Math.ceil((resetTime - now) / (1000 * 60));
        waitTime = minutes > 60 
          ? `${Math.ceil(minutes / 60)} hours` 
          : `${minutes} minutes`;
      }
      
      setRateLimitInfo({
        exceeded: true,
        message: data.message || "Too many submissions",
        waitTime,
        reset: reset ? new Date(parseInt(reset)) : null
      });
      
      Swal.fire({
        icon: "warning",
        title: "Maximum Submissions Reached",
        html: `
          <div class="text-left">
            <p class="mb-3">${data.message || "You've reached the maximum number of submissions."}</p>
            <div class="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p class="text-sm text-yellow-800">
                <strong>Please try again in ${waitTime}.</strong>
              </p>
              <p class="text-xs text-yellow-700 mt-2">
                You can submit up to 10 messages per hour.
              </p>
            </div>
          </div>
        `,
        confirmButtonColor: "#f59e0b",
      });
      
    } else {
      // Other errors
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
                    disabled={rateLimitInfo?.exceeded || loading} // Added disabled state
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
{/* Rate Limit Status */}
{rateLimitInfo && !rateLimitInfo.exceeded && (
  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
          rateLimitInfo.remaining <= 3 ? 'bg-yellow-100 text-yellow-800' :
          rateLimitInfo.remaining <= 1 ? 'bg-red-100 text-red-800' :
          'bg-green-100 text-green-800'
        }`}>
          <span className="font-bold">{rateLimitInfo.remaining}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">Messages remaining this hour</p>
          <p className="text-xs text-gray-600">
            Resets at {rateLimitInfo.reset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
      {rateLimitInfo.remaining <= 3 && (
        <span className={`px-2 py-1 text-xs rounded-full ${
          rateLimitInfo.remaining === 1 ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {rateLimitInfo.remaining === 1 ? 'Last message!' : 'Low limit'}
        </span>
      )}
    </div>
    
    {/* Progress bar */}
    <div className="mt-3">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>Usage</span>
        <span>{10 - rateLimitInfo.remaining}/10</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            rateLimitInfo.remaining <= 3 ? 'bg-yellow-500' :
            rateLimitInfo.remaining <= 1 ? 'bg-red-500' :
            'bg-green-500'
          }`}
          style={{ width: `${((10 - rateLimitInfo.remaining) / 10) * 100}%` }}
        ></div>
      </div>
    </div>
  </div>
)}

                        {/* Rate Limit Exceeded Warning */}
                        {rateLimitInfo?.exceeded && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-medium text-yellow-800">Maximum Submissions Reached</p>
                                <p className="text-sm text-yellow-700 mt-1">
                                {rateLimitInfo.message || "You've reached the maximum of 10 messages per hour."}
                                </p>
                                {rateLimitInfo.reset && (
                                <p className="text-xs text-yellow-600 mt-2">
                                    <strong>Next reset:</strong> {rateLimitInfo.reset.toLocaleTimeString()} ({rateLimitInfo.waitTime})
                                </p>
                                )}
                            </div>
                            </div>
                        </div>
                        )}
                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={
                        loading || 
                        (!captchaValue && RECAPTCHA_SITE_KEY) || 
                        rateLimitInfo?.exceeded
                    }
                    className={`w-full font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                        rateLimitInfo?.exceeded
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-200'
                    }`}
                    >
                    {loading ? (
                        <>
                        <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Sending Message...
                        </>
                    ) : rateLimitInfo?.exceeded ? (
                        <>
                        <AlertCircle className="h-5 w-5" />
                        Rate Limited
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
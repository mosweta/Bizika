import { useState, useEffect } from "react";
import { auth, db } from "../firebase/config";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, getDoc} from "firebase/firestore";
import { Eye, EyeOff, UserPlus, Check, X, GraduationCap, Lock, Loader2, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Signup({ onSignupSuccess }) {
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
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [success, setSuccess] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [countdown, setCountdown] = useState(2); // Countdown from 2 seconds
  

  // Countdown timer for auto-redirect
  useEffect(() => {
    let timer;
    if (success && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (success && countdown === 0) {
      // Auto-redirect to login after countdown
      navigate("/login");
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [success, countdown, navigate]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    const requirements = [
      { regex: /.{8,}/, text: "At least 8 characters" },
      { regex: /[A-Z]/, text: "Contains uppercase letter" },
      { regex: /[a-z]/, text: "Contains lowercase letter" },
      { regex: /[0-9]/, text: "Contains number" },
      { regex: /[^A-Za-z0-9]/, text: "Contains special character" },
    ];

    let metCount = 0;
    const updatedRequirements = requirements.map(req => {
      const met = req.regex.test(password);
      if (met) metCount++;
      return { ...req, met };
    });

    setPasswordStrength(metCount);
    return updatedRequirements;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }

    if (name === "password") {
      validatePassword(value);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (passwordStrength < 3) {
      newErrors.passwordStrength = "Please strengthen your password";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

 const handleSignup = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) return;

  setLoading(true);
  
  try {
    //console.log("🚀 Starting signup process...");
    
    // STEP 1: Create user in Firebase Authentication
    //console.log("Step 1: Creating Firebase Auth user...");
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      formData.email, 
      formData.password
    );
    
    const user = userCredential.user;
    //console.log("✅ Auth user created with UID:", user.uid);
    
    // STEP 2: Wait for auth state to propagate
    //console.log("⏳ Waiting for auth state propagation...");
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Optional: Force auth refresh
    if (auth.currentUser) {
      await auth.currentUser.reload();
      //console.log("🔄 Auth reloaded. Current UID:", auth.currentUser.uid);
    }
    
    // STEP 3: Check if first admin has been created
    console.log("Step 3: Checking system config...");
    const configRef = doc(db, "system", "config");
    let configSnap;
    
    try {
      configSnap = await getDoc(configRef);
      //console.log("✅ System config loaded");
    } catch (error) {
      //console.log("⚠️ Could not load system config, assuming first user:", error);
      configSnap = { exists: () => false };
    }
    
    const isFirstUser = !configSnap.exists() || !configSnap.data()?.adminCreated;
    //console.log("First user status:", isFirstUser ? "YES (Admin)" : "NO (Student)");
    
    // STEP 4: Prepare user profile
    const userRole = isFirstUser ? "admin" : "student";
    
    const userProfile = {
      uid: user.uid,
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      fullName: `${formData.firstName} ${formData.lastName}`,
      role: userRole,
      status: "active",
      createdAt: new Date().toISOString(),
      lastLogin: null,
      profileComplete: false,
      enrolledCourses: [],
      isEmailVerified: false,
      avatarColor: `#${Math.floor(Math.random()*16777215).toString(16)}`,
      notificationsEnabled: true,
      emailNotifications: true,
    };
    
    //console.log("Step 4: Creating Firestore user document...");
    // console.log("Auth check:", {
    //   isAuthenticated: !!auth.currentUser,
    //   authUID: auth.currentUser?.uid,
    //   targetUID: user.uid,
    //   matches: auth.currentUser?.uid === user.uid
    // });

    // STEP 5: Create user document
    await setDoc(doc(db, "users", user.uid), userProfile);
    //console.log("✅ User profile created!");
    
    // STEP 6: If first user, update system config
    if (isFirstUser) {
      //console.log("Updating system config to mark admin created...");
      try {
        await setDoc(configRef, { 
          adminCreated: true,
          updatedAt: new Date().toISOString(),
          firstAdminUid: user.uid
        }, { merge: true });
        //console.log("✅ System config updated");
      } catch (error) {
        //console.log("⚠️ Could not update system config:", error);
        // Continue anyway - the user is already created as admin
      }
    }

    // STEP 7: Auto-logout for security
    //console.log("Step 5: Logging out for security...");
    await auth.signOut();
    
    setSuccess(true);
    setCountdown(2);

  } catch (error) {
    console.error("❌ Signup failed:", {
      code: error.code,
      message: error.message,
      timestamp: new Date().toISOString()
    });
    
    let errorMessage = "Unable to create account. Please try again.";
    
    if (error.code === "auth/email-already-in-use") {
      errorMessage = "This email is already registered. Please try logging in.";
    } else if (error.code === "auth/weak-password") {
      errorMessage = "Please choose a stronger password (at least 8 characters).";
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "Please enter a valid email address.";
    } else if (error.code === "permission-denied") {
      errorMessage = "Server permission issue. Please contact support.";
      // console.error("Permission denied debug:", {
      //   authState: auth.currentUser?.uid,
      //   errorDetails: error
      // });
    }
    
    setErrors(prev => ({ ...prev, submit: errorMessage }));
    
    // Clean up auth user if Firestore failed
    if (auth.currentUser) {
      try {
        await auth.currentUser.delete();
        //console.log("Cleaned up auth user after failure");
      } catch (deleteError) {
        //console.log("Could not delete auth user:", deleteError);
      }
    }
  } finally {
    setLoading(false);
  }
};

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 md:p-8 text-center mx-4">
          <div className="mb-6">
            <div className="h-16 w-16 md:h-20 md:w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 md:h-10 md:w-10 text-green-600" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
              Account Created Successfully!
            </h2>
            
            {isFirstUser ? (
              <>
                <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Crown className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
                    <h3 className="font-bold text-purple-900 text-lg md:text-xl">🎉 Congratulations!</h3>
                  </div>
                  <p className="text-purple-800 text-sm md:text-base mb-2">
                    You are the <span className="font-bold">FIRST USER</span> and have been automatically granted <span className="font-bold">ADMINISTRATOR</span> privileges!
                  </p>
                  <p className="text-purple-700 text-xs md:text-sm">
                    Please log in to access the admin dashboard.
                  </p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 mb-6">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Lock className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                    <h3 className="font-medium text-blue-900 text-sm md:text-base">Admin Privileges</h3>
                  </div>
                  <div className="text-xs md:text-sm text-blue-800 space-y-1">
                    <p>✓ Create and manage courses</p>
                    <p>✓ Promote users to admin/tutor</p>
                    <p>✓ View platform analytics</p>
                    <p>✓ Access admin dashboard</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-600 text-sm md:text-base mb-4">
                  Your student account has been created successfully!
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 mb-6">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Lock className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                    <h3 className="font-medium text-blue-900 text-sm md:text-base">Next Steps</h3>
                  </div>
                  <p className="text-xs md:text-sm text-blue-800">
                    Please log in with your new credentials to access your student dashboard.
                  </p>
                </div>
              </>
            )}

            {/* Redirect countdown */}
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center justify-center gap-2 text-gray-600 text-sm md:text-base mb-2">
                  <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                  <span>Redirecting to login in {countdown} second{countdown !== 1 ? 's' : ''}...</span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${(2 - countdown) / 2 * 100}%` }}
                  />
                </div>
              </div>
              
              {/* Manual login button */}
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500 mb-3">Don't want to wait?</p>
                <button
                  onClick={() => navigate("/login")}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors w-full max-w-xs"
                >
                  Go to Login Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-3 md:p-4">
      <div className="w-full max-w-6xl bg-white rounded-xl md:rounded-2xl shadow-lg md:shadow-xl overflow-hidden mx-2 md:mx-4">
        <div className="md:grid md:grid-cols-2">
          {/* Left side - Illustration/Info */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 md:p-8 lg:p-12 text-white">
            <div className="h-full flex flex-col justify-center">
              <div className="mb-6 md:mb-8">
                <div className="flex items-center gap-3 mb-4 md:mb-6">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <GraduationCap className="h-6 w-6 md:h-8 md:w-8" />
                  </div>
                  <h1 className="text-xl md:text-2xl font-bold">Bizika</h1>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">
                  Join as a Student
                </h2>
                <p className="text-blue-100 text-sm md:text-base mb-4 md:mb-6">
                  Create your student account to access courses, track your progress, 
                  and start your learning journey.
                </p>
                
                {/* Added Image Section */}
                <div className="mb-4 md:mb-6 rounded-lg md:rounded-xl overflow-hidden shadow-lg border border-white/20">
                  <div className="relative h-40 md:h-48 w-full bg-gradient-to-r from-cyan-500 to-blue-500">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/90 to-blue-500/90 flex items-center justify-center p-4">
                      <div className="text-center">
                        <div className="h-12 w-12 md:h-16 md:w-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-3">
                          <GraduationCap className="h-6 w-6 md:h-8 md:w-8 text-white" />
                        </div>
                        <h3 className="text-base md:text-lg font-bold mb-1">Start Learning Today</h3>
                        <p className="text-xs md:text-sm text-blue-100">Join thousands of successful students</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features list */}
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 md:h-8 md:w-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Check className="h-3 w-3 md:h-4 md:w-4" />
                  </div>
                  <span className="text-sm md:text-base">Access to all student courses you enrolled for</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 md:h-8 md:w-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Check className="h-3 w-3 md:h-4 md:w-4" />
                  </div>
                  <span className="text-sm md:text-base">Track learning progress</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 md:h-8 md:w-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Check className="h-3 w-3 md:h-4 md:w-4" />
                  </div>
                  <span className="text-sm md:text-base">Interactive learning materials</span>
                </div>
                
              </div>

              {/* First user special note */}
              <div className="mt-6 md:mt-8 p-3 md:p-4 bg-yellow-500/20 rounded-lg md:rounded-xl border border-yellow-500/30">
                <div className="flex items-center gap-3 mb-2">
                  <Crown className="h-4 w-4 md:h-5 md:w-5 text-yellow-300" />
                  <div className="text-xs font-medium text-yellow-200">SECURITY NOTICE</div>
                </div>
                <div className="font-semibold text-sm md:text-base text-white">
                  Auto-logout after signup
                </div>
                <p className="text-xs text-yellow-100 mt-1">
                  For security, you'll be logged out and redirected to login after signup.
                </p>
              </div>
            </div>
          </div>

          {/* Right side - Form */}
          <div className="p-4 md:p-6 lg:p-8">
            <div className="max-w-md mx-auto w-full">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg md:hidden">
                    <GraduationCap className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">Bizika</h1>
                    <h2 className="text-lg md:text-xl font-bold text-gray-900 mt-1">
                      Create Your Account
                    </h2>
                    <p className="text-gray-600 text-sm md:text-base mt-1">
                      Sign up to start your learning journey
                    </p>
                  </div>
                </div>
              </div>

             

              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-4 md:mb-6">
                Create Your Account
              </h3>

              <form onSubmit={handleSignup}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 md:px-4 md:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm md:text-base ${
                        errors.firstName ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="John"
                      required
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-xs md:text-sm text-red-600">{errors.firstName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 md:px-4 md:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm md:text-base ${
                        errors.lastName ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Doe"
                      required
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-xs md:text-sm text-red-600">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="mb-3 md:mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 md:px-4 md:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm md:text-base ${
                      errors.email ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="student@gmail.com"
                    required
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs md:text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <div className="mb-3 md:mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 md:px-4 md:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm md:text-base pr-10 md:pr-12 ${
                        errors.password ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Create a strong password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs md:text-sm text-red-600">{errors.password}</p>
                  )}

                  {/* Password strength meter */}
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs md:text-sm text-gray-600">Password strength</span>
                        <span className="text-xs md:text-sm font-medium">
                          {passwordStrength >= 4 ? "Strong" : passwordStrength >= 3 ? "Good" : "Weak"}
                        </span>
                      </div>
                      <div className="h-1.5 md:h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            passwordStrength >= 4 ? "bg-green-500" : 
                            passwordStrength >= 3 ? "bg-yellow-500" : "bg-red-500"
                          }`}
                          style={{ width: `${(passwordStrength / 5) * 100}%` }}
                        />
                      </div>
                      
                      {/* Password requirements */}
                      <div className="mt-2 grid grid-cols-2 gap-1 md:gap-2">
                        <div className={`flex items-center gap-1 ${formData.password.length >= 8 ? 'text-green-600' : 'text-gray-400'}`}>
                          {formData.password.length >= 8 ? <Check size={12} className="md:w-3.5 md:h-3.5" /> : <X size={12} className="md:w-3.5 md:h-3.5" />}
                          <span className="text-xs">8+ characters</span>
                        </div>
                        <div className={`flex items-center gap-1 ${/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}`}>
                          {/[A-Z]/.test(formData.password) ? <Check size={12} className="md:w-3.5 md:h-3.5" /> : <X size={12} className="md:w-3.5 md:h-3.5" />}
                          <span className="text-xs">Uppercase</span>
                        </div>
                        <div className={`flex items-center gap-1 ${/[a-z]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}`}>
                          {/[a-z]/.test(formData.password) ? <Check size={12} className="md:w-3.5 md:h-3.5" /> : <X size={12} className="md:w-3.5 md:h-3.5" />}
                          <span className="text-xs">Lowercase</span>
                        </div>
                        <div className={`flex items-center gap-1 ${/[0-9]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}`}>
                          {/[0-9]/.test(formData.password) ? <Check size={12} className="md:w-3.5 md:h-3.5" /> : <X size={12} className="md:w-3.5 md:h-3.5" />}
                          <span className="text-xs">Number</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mb-4 md:mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 md:px-4 md:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm md:text-base pr-10 md:pr-12 ${
                        errors.confirmPassword ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Re-enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs md:text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>

                

                {errors.submit && (
                  <div className="mb-4 p-3 md:p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700">
                      <X className="h-4 w-4 md:h-5 md:w-5" />
                      <p className="text-xs md:text-sm">{errors.submit}</p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium py-2.5 md:py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-200 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm md:text-base"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 md:h-5 md:w-5" />
                      Create Account
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gray-200">
                <p className="text-center text-xs md:text-sm text-gray-600">
                  Already have an account?{" "}
                  <a href="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                    Sign in here
                  </a>
                </p>
              </div>

              <div className="mt-3 md:mt-4 text-center">
                <p className="text-xs text-gray-500">
                  By creating an account, you agree to our{" "}
                  <a href="#" className="text-gray-600 hover:text-gray-800">
                    Terms
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-gray-600 hover:text-gray-800">
                    Privacy
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
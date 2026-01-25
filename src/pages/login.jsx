import { useState } from "react";
import { auth, db } from "../firebase/config";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Eye, EyeOff, BookOpen, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user data from Firestore
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error("User profile not found. Please contact administrator.");
      }
      
      const userData = docSnap.data();
      const role = userData.role || "student";
      const displayName = userData.fullName || user.email.split("@")[0];

      // Pass user data to parent component
      if (onLoginSuccess) onLoginSuccess({
        uid: user.uid,
        role,
        email: user.email,
        displayName,
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
      setError(
        error.code === "auth/invalid-credential" 
          ? "Invalid email or password. Please try again."
          : error.code === "auth/too-many-requests"
          ? "Too many failed attempts. Please try again later."
          : error.message
      );
    }
    setLoading(false);
  };


  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Left side - Branding/Graphics */}
      <div className="md:w-1/2 p-8 md:p-16 flex flex-col justify-center items-center text-center md:text-left">
        <div className="max-w-md">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-6">
            <div className="p-3 bg-blue-600 rounded-xl">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Bizika</h1>
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

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
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
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="student@gmail.com"
                    required
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
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition pr-12"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Remember me</span>
                </label>
                <a href="#" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-200 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>


            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-center text-sm text-gray-600">
                Don't have an account?{" "}
                <a href="/signup" className="text-blue-600 hover:text-blue-800 font-medium">
                  Register
                </a>
              </p>
            </div>
          </div>

          {/* <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By signing in, you agree to our{" "}
              <a href="#" className="text-gray-600 hover:text-gray-800">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-gray-600 hover:text-gray-800">
                Privacy Policy
              </a>
            </p>
          </div> */}
        </div>
      </div>
    </div>
  );
}
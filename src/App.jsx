// src/App.jsx
import './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { auth, db } from './firebase/config';
import { 
  doc, 
  getDoc,
  collection, 
  query, 
  where, 
  getDocs, 
  limit,
  addDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import Login from './pages/login.jsx'
import Signup from './pages/signup.jsx'
import AdminDashboard from './pages/admin.jsx'
import CourseCatalog from './pages/catalog.jsx'
import CoursePage from './pages/coursepage.jsx'
import StudentDashboard from './pages/student.jsx';
import CourseDetails from "./pages/coursedetails.jsx";
import EmailActionHandler from './pages/emailhandler.jsx';
import ForgotPassword from './pages/forgotpassword.jsx';
import PasswordReset from './pages/resetpassword.jsx';
import TakeQuiz from './pages/takequiz.jsx';
import QuizResults from './pages/quizresults.jsx';
import QuizManager from './pages/quizmanager.jsx';
import CreateQuiz from './pages/createquiz.jsx';
import QuizDetails from './pages/quizdetails.jsx';
import TermsConditions from './pages/terms.jsx';
import PrivacyPolicy from './pages/privacy.jsx';



// Loading component
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);
// Add to main.jsx or App.jsx
const animateFavicon = () => {
  const favicon = document.querySelector('link[rel="icon"]');
  if (!favicon) return;
  
  let scale = 1;
  let direction = 0.05;
  
  const animate = () => {
    // Create a canvas to manipulate favicon
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    
    // Draw logo with scale effect
    const img = new Image();
    img.src = '/logo.png';
    img.onload = () => {
      ctx.clearRect(0, 0, 32, 32);
      ctx.save();
      ctx.translate(16, 16);
      ctx.scale(scale, scale);
      ctx.drawImage(img, -16, -16, 32, 32);
      ctx.restore();
      
      // Update favicon
      favicon.href = canvas.toDataURL('image/png');
    };
    
    // Update scale for next frame
    scale += direction;
    if (scale > 1.2 || scale < 0.8) direction *= -1;
    
    requestAnimationFrame(animate);
  };
  
  // Run for 3 seconds
  animate();
  setTimeout(() => {
    // Reset to original favicon
    favicon.href = '/logo.png';
  }, 3000);
};

// Call when app loads
animateFavicon();

import { Link, useNavigate } from "react-router-dom";
import {
  Play,
  Award,
  Users,
  Clock,
  Star,
  CheckCircle,
  ArrowRight,
  BookOpen,
  Video,
  FileText,
  BarChart,
  Shield,
  Globe,
  ChevronRight,
  Menu,
  X
} from "lucide-react";

function Home() {
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({
    students: 10,
    courses: 42,
    completionRate: 94,
    satisfaction: 98
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFeaturedCourses();
  }, []);

  const fetchFeaturedCourses = async () => {
    try {
      const coursesRef = collection(db, "courses");
      const q = query(
        coursesRef,
        where("published", "==", true),
        where("featured", "==", true),
        limit(6)
      );
      const snapshot = await getDocs(q);
      const coursesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(coursesData);
      
      // Update stats with real data
      setStats(prev => ({
        ...prev,
        courses: coursesData.length
      }));
      
    } catch (error) {
      console.error("Error fetching featured courses:", error);
      // Fallback to getting any published courses if featured query fails
      try {
        const coursesRef = collection(db, "courses");
        const q = query(
          coursesRef,
          where("published", "==", true),
          limit(6)
        );
        const snapshot = await getDocs(q);
        const coursesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCourses(coursesData);
      } catch (fallbackError) {
        console.error("Fallback fetch failed:", fallbackError);
      }
    }
  };

  // Add this function to handle enrollment
  const handleEnroll = async (courseId) => {
    const user = auth.currentUser;
    if (!user) {
      navigate("/login", { state: { redirectTo: `/course/${courseId}` } });
      return;
    }

    try {
      // Check if already enrolled
      const enrollmentsRef = collection(db, "enrollments");
      const existingEnrollmentQuery = query(
        enrollmentsRef, 
        where("userId", "==", user.uid),
        where("courseId", "==", courseId)
      );
      const existingEnrollmentSnap = await getDocs(existingEnrollmentQuery);
      
      if (!existingEnrollmentSnap.empty) {
        // Already enrolled, go to course page
        navigate(`/course/${courseId}`);
        return;
      }

      // Enroll the user
      const enrollmentData = {
        userId: user.uid,
        courseId,
        enrolledAt: serverTimestamp(),
        progress: 0,
        completedLessons: [],
        status: "active",
        lastAccessed: serverTimestamp()
      };

      await addDoc(collection(db, "enrollments"), enrollmentData);

      // Update course enrollment count
      const courseRef = doc(db, "courses", courseId);
      const courseDoc = await getDoc(courseRef);
      const currentCount = courseDoc.data()?.enrolledCount || 0;
      
      await updateDoc(courseRef, {
        enrolledCount: currentCount + 1,
        updatedAt: serverTimestamp()
      });

      // Update user's enrolled courses
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      const currentCourses = userDoc.data()?.enrolledCourses || [];
      
      if (!currentCourses.includes(courseId)) {
        await updateDoc(userRef, {
          enrolledCourses: [...currentCourses, courseId],
          updatedAt: serverTimestamp()
        });
      }

      navigate(`/course/${courseId}`);

    } catch (error) {
      console.error("Error enrolling in course:", error);
      alert("Failed to enroll. Please try again.");
    }
  };

  const handleGetStarted = () => {
    navigate("/signup");
  };

  const handleLogin = () => {
    navigate("/login");
  };

  // Add this CourseCard component inside the Home component
  const CourseCard = ({ course }) => {
    const user = auth.currentUser;

    return (
      <div key={course.id} className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
        <div className="relative h-48 overflow-hidden">
          {course.thumbnailUrl ? (
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
              <BookOpen className="h-12 w-12 text-white" />
            </div>
          )}
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-sm font-medium rounded-full">
              {course.category || "Course"}
            </span>
          </div>
          {(course.isFree || course.price === 0) && (
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-full">
                FREE
              </span>
            </div>
          )}
        </div>
        
        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
              course.level === 'beginner' ? 'bg-green-100 text-green-800' :
              course.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {course.level?.charAt(0).toUpperCase() + course.level?.slice(1) || "All Levels"}
            </span>
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="h-4 w-4 mr-1" />
              <span>{course.duration || "Self-paced"}</span>
            </div>
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
            {course.title}
          </h3>
          
          <p className="text-gray-600 mb-4 line-clamp-2">
            {course.shortDescription || course.description?.substring(0, 120) || "Master essential skills with practical examples and real-world applications."}
          </p>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-gray-400 mr-1" />
              <span className="text-sm text-gray-600">
                {course.enrolledCount || 0} enrolled
              </span>
            </div>
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
              <span className="text-sm text-gray-600">{course.rating || 4.8}</span>
            </div>
          </div>
          
          <button
            onClick={() => handleEnroll(course.id)}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2"
          >
            {auth.currentUser ? "Enroll Now" : "Start Learning"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-sm z-50 border-b border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            {/* Logo - Simple replacement */}
<div className="flex items-center">
  <Link to="/" className="flex items-center space-x-3">
    <img 
      src="/logo4.png" 
      alt="Pavoc LMS Logo" 
      className="h-15 w-15 rounded-xl object-cover"
    />
    <span className="text-xl font-bold text-gray-900">Pavoc LMS</span>
  </Link>
</div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors">
                Features
              </a>
              <a href="#courses" className="text-gray-700 hover:text-blue-600 transition-colors">
                Courses
              </a>
              <a href="#how-it-works" className="text-gray-700 hover:text-blue-600 transition-colors">
                How It Works
              </a>
              <a href="#testimonials" className="text-gray-700 hover:text-blue-600 transition-colors">
                Testimonials
              </a>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleLogin}
                  className="px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={handleGetStarted}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Get Started
                </button>
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100">
            <div className="px-4 py-3 space-y-3">
              <a
                href="#features"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a
                href="#courses"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                Courses
              </a>
              <a
                href="#how-it-works"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                How It Works
              </a>
              <a
                href="#testimonials"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                Testimonials
              </a>
              <div className="pt-4 space-y-3 border-t border-gray-100">
                <button
                  onClick={() => {
                    handleLogin();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-gray-700 hover:text-blue-600 text-left"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    handleGetStarted();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-50"></div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Learn <span className="text-blue-600">Business Skills</span> That
              <span className="block mt-2">Actually Matter</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of professionals mastering practical business skills with our expert-led courses. 
              Learn at your own pace, from anywhere.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button
                onClick={handleGetStarted}
                className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                Start Learning Free
                <ArrowRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => document.getElementById('courses').scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-white text-gray-700 border border-gray-300 rounded-xl hover:border-blue-300 hover:text-blue-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-sm"
              >
                <Play className="h-5 w-5" />
                View Courses
              </button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{stats.students}+</div>
                <div className="text-sm text-gray-600">Active Students</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{stats.courses}+</div>
                <div className="text-sm text-gray-600">Courses</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{stats.completionRate}%</div>
                <div className="text-sm text-gray-600">Completion Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{stats.satisfaction}%</div>
                <div className="text-sm text-gray-600">Satisfaction</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Bizika LMS?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              A learning experience designed for professionals who want to grow their career
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-2xl border border-blue-100">
              <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <Video className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Expert Video Lessons</h3>
              <p className="text-gray-600">
                Learn from industry professionals with real-world experience through high-quality video content.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-white p-8 rounded-2xl border border-purple-100">
              <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Practical Resources</h3>
              <p className="text-gray-600">
                Downloadable templates, case studies, and tools you can apply immediately in your work.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-white p-8 rounded-2xl border border-green-100">
              <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <BarChart className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Progress Tracking</h3>
              <p className="text-gray-600">
                Monitor your learning journey with detailed progress reports and achievement badges.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
            <div className="bg-gradient-to-br from-indigo-50 to-white p-8 rounded-2xl border border-indigo-100">
              <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                <Clock className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Flexible Learning</h3>
              <p className="text-gray-600">
                Learn at your own pace. Access courses anytime, anywhere on any device.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Courses Section - UPDATED */}
      <section id="courses" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Featured Courses
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Explore our most popular courses taught by industry experts
            </p>
          </div>
          
          {courses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No featured courses yet
              </h3>
              <p className="text-gray-600 mb-6">
                Check back soon for our latest courses!
              </p>
              <button
                onClick={() => navigate("/courses")}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Browse All Courses
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {courses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
              
              <div className="text-center mt-12">
                <button
                  onClick={() => navigate("/courses")}
                  className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:border-blue-300 hover:text-blue-700 transition-colors"
                >
                  View All Courses
                  <ChevronRight className="h-4 w-4 ml-2" />
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Start learning in just 4 simple steps
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="relative mb-6">
                <div className="h-16 w-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                    1
                  </div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Sign Up Free</h3>
              <p className="text-gray-600">
                Create your free account in under 2 minutes
              </p>
            </div>
            
            <div className="text-center">
              <div className="relative mb-6">
                <div className="h-16 w-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <div className="h-12 w-12 bg-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                    2
                  </div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Browse Courses</h3>
              <p className="text-gray-600">
                Explore courses that match your career goals
              </p>
            </div>
            
            <div className="text-center">
              <div className="relative mb-6">
                <div className="h-16 w-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <div className="h-12 w-12 bg-green-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                    3
                  </div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Learn at Your Pace</h3>
              <p className="text-gray-600">
                Watch videos, complete exercises, and track progress
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-16 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What Our Students Say
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Join thousands of learners who transformed their careers
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="flex items-center mb-6">
                <div className="h-12 w-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"></div>
                <div className="ml-4">
                  <h4 className="font-semibold text-gray-900">Steve Mambo</h4>
                  <p className="text-sm text-gray-600">Marketing Manager</p>
                </div>
              </div>
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 italic">
                "The Digital Marketing course transformed how I approach campaigns. 
                Practical, actionable content that I applied immediately at work."
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="flex items-center mb-6">
                <div className="h-12 w-12 bg-gradient-to-r from-green-400 to-blue-500 rounded-full"></div>
                <div className="ml-4">
                  <h4 className="font-semibold text-gray-900">Michael Mwikonyo</h4>
                  <p className="text-sm text-gray-600">Business Analyst</p>
                </div>
              </div>
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 italic">
                "Financial Analysis course gave me the confidence to lead budget meetings. 
                The templates alone were worth the enrollment!"
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="flex items-center mb-6">
                <div className="h-12 w-12 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full"></div>
                <div className="ml-4">
                  <h4 className="font-semibold text-gray-900">David Wilson</h4>
                  <p className="text-sm text-gray-600">Entrepreneur</p>
                </div>
              </div>
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 italic">
                "As a startup founder, Business Fundamentals course provided exactly what I needed. 
                Structured, comprehensive, and perfectly paced."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 md:p-12 text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Transform Your Career?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join professionals already learning on Bizika LMS
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleGetStarted}
                className="px-8 py-4 bg-white text-blue-600 rounded-xl hover:bg-gray-100 transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-xl font-semibold flex items-center justify-center gap-2"
              >
                Start Learning Free
                <ArrowRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => navigate("/login")}
                className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-xl hover:bg-white/10 transition-all duration-300 font-semibold"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              {/* Logo - Simple replacement */}

  
    
   
              <div className="flex items-center mb-6">
                <div className="h-10 w-10 bg-gray-200 rounded-xl flex items-center justify-center">
                  <img 
      src="/logo4.png" 
      alt="Pavoc LMS Logo" 
      className="h-12 w-10 rounded-xl object-cover"
    />
                </div>
                <span className="text-xl font-bold text-white ml-3">Pavoc LMS</span>
              </div>
              <p className="text-gray-400">
                Empowering professionals with practical and relevant education for real-world success across domains.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Platform</h4>
              <ul className="space-y-3">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#courses" className="hover:text-white transition-colors">Courses</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-3">
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/help" className="hover:text-white transition-colors">Terms and Conditions</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Connect</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>Global Community</span>
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>Secure Platform</span>
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>10+ Students</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500">
            <p>© {new Date().getFullYear()} Pavoc LMS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Private Route wrapper
const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        setUser(authUser);
        // Get user role from Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", authUser.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role);
          }
        } catch (error) {
          console.error("Error getting user role:", error);
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    // Redirect based on user role
    if (userRole === 'admin') {
      return <Navigate to="/admin" />;
    } else {
      return <Navigate to="/student" />;
    }
  }

  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/terms" element={<TermsConditions />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/courses" element={<CourseCatalog />} />
        <Route path="/course-details/:courseId" element={<CourseDetails />} />
        <Route path="/emails" element={<EmailActionHandler />} />
        <Route path="/reset-password" element={<PasswordReset />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/course/:courseId/quiz" element={<TakeQuiz />} />
        <Route path="/course/:courseId/quiz-results" element={<QuizResults />} />
        <Route path="/course/:courseId/quiz/:quizId" element={<TakeQuiz />} />


        {/* Protected admin routes */}
        <Route path="/admin/*" element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </PrivateRoute>
        } />
        // Add these routes

<Route path="/admin/quizzes" element={<QuizManager />} />
<Route path="/admin/create-quiz" element={<CreateQuiz />} />
<Route path="/admin/create-quiz/:courseId" element={<CreateQuiz />} />
<Route path="/admin/quiz-details/:courseId/:userId" element={<QuizDetails />} />
ro
        
        
        {/* Protected student/tutor routes */}
        <Route path="/student/*" element={
          <PrivateRoute allowedRoles={['student']}>
            <StudentDashboard />
          
          </PrivateRoute>
        } />
          
        <Route path="/course/:courseId" element={
          <PrivateRoute allowedRoles={['student', 'admin']}>
            <CoursePage />
          </PrivateRoute>
        } />
        {/* Catch all route - redirect to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;

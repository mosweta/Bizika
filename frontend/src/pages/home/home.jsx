import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from 'react';
import { auth, db } from '../../firebase/config';
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
  X,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Home as HomeIcon,
  BookMarked
} from "lucide-react";

export default function Home() {
  const [courses, setCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loadingEnrolled, setLoadingEnrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    students: 10,
    courses: 42,
    completionRate: 94,
    satisfaction: 98
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Listen to authentication state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      
      // If user exists, fetch their enrolled courses
      if (currentUser) {
        fetchUserEnrolledCourses(currentUser.uid);
      } else {
        setEnrolledCourses([]);
      }
    });

    return () => unsubscribe();
  }, []);

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

  const fetchUserEnrolledCourses = async (userId) => {
    setLoadingEnrolled(true);
    try {
      const enrollmentsRef = collection(db, "enrollments");
      const q = query(
        enrollmentsRef,
        where("userId", "==", userId),
        where("status", "==", "active")
      );
      const snapshot = await getDocs(q);
      
      const courseIds = snapshot.docs.map(doc => doc.data().courseId);
      
      // Fetch course details for each enrolled course
      const coursePromises = courseIds.map(async (courseId) => {
        const courseDoc = await getDoc(doc(db, "courses", courseId));
        if (courseDoc.exists()) {
          // Get enrollment progress
          const enrollmentDoc = snapshot.docs.find(d => d.data().courseId === courseId);
          const enrollmentData = enrollmentDoc.data();
          
          return {
            id: courseId,
            ...courseDoc.data(),
            progress: enrollmentData.progress || 0,
            lastAccessed: enrollmentData.lastAccessed,
            enrollmentId: enrollmentDoc.id
          };
        }
        return null;
      });
      
      const courses = await Promise.all(coursePromises);
      setEnrolledCourses(courses.filter(course => course !== null));
    } catch (error) {
      console.error("Error fetching enrolled courses:", error);
    } finally {
      setLoadingEnrolled(false);
    }
  };

  // Handle enrollment
  const handleEnroll = async (courseId) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      navigate("/login", { state: { redirectTo: `/course/${courseId}` } });
      return;
    }

    try {
      // Check if already enrolled
      const enrollmentsRef = collection(db, "enrollments");
      const existingEnrollmentQuery = query(
        enrollmentsRef, 
        where("userId", "==", currentUser.uid),
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
        userId: currentUser.uid,
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
      const userRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userRef);
      const currentCourses = userDoc.data()?.enrolledCourses || [];
      
      if (!currentCourses.includes(courseId)) {
        await updateDoc(userRef, {
          enrolledCourses: [...currentCourses, courseId],
          updatedAt: serverTimestamp()
        });
      }

      // Refresh enrolled courses
      fetchUserEnrolledCourses(currentUser.uid);
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

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setEnrolledCourses([]);
      setMobileMenuOpen(false);
      navigate('/');
    } catch (error) {
      console.error("Error signing out:", error);
      alert("Failed to sign out. Please try again.");
    }
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return "Recently";
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // FIXED: Dashboard navigation function
  const handleDashboardNavigation = async () => {
    try {
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        navigate("/login");
        return;
      }

      // Get user role from Firestore
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      
      if (!userDoc.exists()) {
        console.warn(`User ${currentUser.uid} authenticated but not in Firestore`);
        await auth.signOut();
        navigate("/login");
        return;
      }

      const userData = userDoc.data();
      const role = userData.role?.toLowerCase() || 'student';
      
      // Navigate to correct dashboard based on role
      if (role === "admin") {
        navigate("/admin/dashboard");
      } else if (role === "student") {
        navigate("/student/dashboard");
      } else {
        // Default fallback for unknown roles
        navigate("/student/dashboard");
      }
      
    } catch (error) {
      console.error("Dashboard navigation error:", error);
      
      // Fallback to login if error occurs
      navigate("/login");
    }
  };

  // CourseCard component
  const CourseCard = ({ course }) => {
    const currentUser = auth.currentUser;

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
            {currentUser ? "Enroll Now" : "Start Learning"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  // EnrolledCourseCard component - FIXED: Added missing image URL handling
  const EnrolledCourseCard = ({ course }) => (
    <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="relative h-48">
        {course.thumbnailUrl ? (
          <img 
            src={course.thumbnailUrl} 
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
            <BookOpen className="h-12 w-12 text-white opacity-80" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className="px-2 py-1 text-xs bg-white/90 text-gray-800 rounded">
            {course.category || "Course"}
          </span>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
            course.level === 'beginner' ? 'bg-green-100 text-green-800' :
            course.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {course.level?.charAt(0).toUpperCase() + course.level?.slice(1) || "All Levels"}
          </span>
          
          <span className="text-sm font-medium text-blue-600">
            {Math.round(course.progress || 0)}% Complete
          </span>
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-3">
          {course.title}
        </h3>
        
        {/* Progress bar */}
        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
              style={{ width: `${course.progress || 0}%` }}
            ></div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {course.lastAccessed ? 
              `Last visited: ${formatRelativeTime(course.lastAccessed)}` : 
              'Start learning'
            }
          </span>
          <button
            onClick={() => navigate(`/course/${course.id}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-sm z-50 border-b border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
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
              
              {/* Show "My Learning" only when logged in */}
              {user && (
                <a
                  href="#learning"
                  className="text-gray-700 hover:text-blue-600 transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('learning')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  My Learning
                </a>
              )}
              
              <a href="#testimonials" className="text-gray-700 hover:text-blue-600 transition-colors">
                Testimonials
              </a>
              
              <div className="flex items-center space-x-4">
                {user ? (
                  /* User is logged in - show profile dropdown */
                  <div className="relative group">
                    <button className="flex items-center space-x-3 focus:outline-none">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-medium">
                        {user.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <span className="text-gray-700 font-medium">
                        {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
                      </span>
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </button>
                    
                    {/* Dropdown Menu - FIXED: Use onClick instead of Link for dashboard navigation */}
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 hidden group-hover:block z-50">
                      <div className="py-2">
                        <button
                          onClick={handleDashboardNavigation}
                          className="flex items-center gap-2 w-full text-left px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer"
                        >
                          <HomeIcon className="h-4 w-4" />
                          Dashboard
                        </button>
                        <Link
                          to="/courses"
                          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                        >
                          <BookMarked className="h-4 w-4" />
                          Courses
                        </Link>
                        <div className="border-t my-1"></div>
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-red-600 cursor-pointer"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* User is not logged in - show sign in/sign up */
                  <>
                    <button
                      onClick={handleLogin}
                      className="px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={handleGetStarted}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                    >
                      Get Started
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu - FIXED: Use buttons instead of Links for navigation actions */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100">
            <div className="px-4 py-3 space-y-3">
              <button
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg cursor-pointer"
              >
                Features
              </button>
              <button
                onClick={() => {
                  document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' });
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg cursor-pointer"
              >
                Courses
              </button>
              
              {/* Show My Learning only when logged in */}
              {user && (
                <button
                  onClick={() => {
                    document.getElementById('learning')?.scrollIntoView({ behavior: 'smooth' });
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg cursor-pointer"
                >
                  My Learning
                </button>
              )}
              
              <button
                onClick={() => {
                  document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' });
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg cursor-pointer"
              >
                Testimonials
              </button>
              
              <div className="pt-4 space-y-3 border-t border-gray-100">
                {user ? (
                  <>
                    <div className="flex items-center space-x-3 px-3 py-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-medium">
                        {user.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        handleDashboardNavigation();
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full text-left px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg cursor-pointer"
                    >
                      Dashboard
                    </button>
                    <Link
                      to="/courses"
                      className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Courses
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        handleLogin();
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-gray-700 hover:text-blue-600 cursor-pointer"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => {
                        handleGetStarted();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                    >
                      Get Started
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section - FIXED: Dashboard button navigation */}
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
              {user ? (
                <button
                  onClick={handleDashboardNavigation}
                  className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  Go to Dashboard
                  <ArrowRight className="h-5 w-5" />
                </button>
              ) : (
                <button
                  onClick={handleGetStarted}
                  className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  Start Learning Free
                  <ArrowRight className="h-5 w-5" />
                </button>
              )}
              <button
                onClick={() => document.getElementById('courses').scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-white text-gray-700 border border-gray-300 rounded-xl hover:border-blue-300 hover:text-blue-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Play className="h-5 w-5" />
                {user ? "Explore More Courses" : "View Courses"}
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

      {/* Continue Learning Section - Only show if user has enrolled courses */}
      {user && enrolledCourses.length > 0 && (
        <section id="learning" className="py-16 bg-gradient-to-b from-white to-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Continue Your Learning
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Pick up where you left off and continue your journey
              </p>
            </div>
            
            {loadingEnrolled ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading your courses...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {enrolledCourses.slice(0, 3).map((course) => (
                    <EnrolledCourseCard key={course.id} course={course} />
                  ))}
                </div>
                
                {enrolledCourses.length > 3 && (
                  <div className="text-center mt-8">
                    <button
                      onClick={handleDashboardNavigation}
                      className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:border-blue-300 hover:text-blue-700 transition-colors cursor-pointer"
                    >
                      View All My Courses
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* Features Section */}
      <section id="features" className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Pavoc LMS?
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

      {/* Courses Section */}
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
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
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
                  className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:border-blue-300 hover:text-blue-700 transition-colors cursor-pointer"
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

      {/* CTA Section - FIXED: Dashboard button navigation */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 md:p-12 text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Transform Your Career?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join professionals already learning on Pavoc LMS
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <>
                  <button
                    onClick={handleDashboardNavigation}
                    className="px-8 py-4 bg-white text-blue-600 rounded-xl hover:bg-gray-100 transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-xl font-semibold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Go to Dashboard
                    <ArrowRight className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => document.getElementById('courses').scrollIntoView({ behavior: 'smooth' })}
                    className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-xl hover:bg-white/10 transition-all duration-300 font-semibold cursor-pointer"
                  >
                    Explore More Courses
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleGetStarted}
                    className="px-8 py-4 bg-white text-blue-600 rounded-xl hover:bg-gray-100 transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-xl font-semibold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Start Learning Free
                    <ArrowRight className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleLogin}
                    className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-xl hover:bg-white/10 transition-all duration-300 font-semibold cursor-pointer"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
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
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms and Conditions</Link></li>
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
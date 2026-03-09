import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../firebase/config";
import { signOut } from "firebase/auth";
import { 
  collection, 
  query, 
  where, 
  getDocs,
  getDoc,
  doc,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import {
  BookOpen,
  Clock,
  Award,
  Calendar,
  Play,
  CheckCircle,
  Search,
  LogOut,
  User,
  BarChart3,
  ChevronRight
} from "lucide-react";

export default function AdminLearnDashboard() {
  const [user, setUser] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedLessons: 0,
    totalActiveLessons: 0,
    learningHours: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchAdminData(currentUser.uid);
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // ========== PROGRESS CALCULATION FUNCTIONS ==========
  
  /**
   * Calculate progress based on ACTIVE lessons only
   * @param {Object} enrollment - The enrollment document
   * @param {Array} activeLessons - Array of active lesson objects
   * @returns {number} - Progress percentage (0-100)
   */
  const calculateActiveProgress = (enrollment, activeLessons) => {
    if (!enrollment || !activeLessons || activeLessons.length === 0) return 0;
    
    // Count only completions that match ACTIVE lessons
    const completedActive = activeLessons.filter(lesson => 
      enrollment.completedLessons?.includes(lesson.id)
    ).length;
    
    // Progress based ONLY on active lessons
    return Math.round((completedActive / activeLessons.length) * 100);
  };

  /**
   * Get completion stats separating active and archived lessons
   * @param {Object} enrollment - The enrollment document
   * @param {Array} activeLessons - Array of active lesson objects
   * @param {Array} archivedLessons - Array of archived lesson objects
   * @returns {Object} - Completion statistics
   */
  const getCompletionStats = (enrollment, activeLessons, archivedLessons = []) => {
    if (!enrollment) return { 
      active: { completed: 0, total: 0 }, 
      archived: 0 
    };
    
    const completedActive = activeLessons.filter(lesson => 
      enrollment.completedLessons?.includes(lesson.id)
    ).length;
    
    const completedArchived = archivedLessons.filter(lesson => 
      enrollment.completedLessons?.includes(lesson.id)
    ).length;
    
    return {
      active: {
        completed: completedActive,
        total: activeLessons.length
      },
      archived: completedArchived
    };
  };

  const fetchAdminData = async (userId) => {
    try {
      setLoading(true);
      
      // Get user profile
      const userDoc = await getDoc(doc(db, "users", userId));
      const userData = userDoc.exists() ? userDoc.data() : null;
      setUser(prev => ({ ...prev, ...userData }));

      // Get user's enrollments
      const enrollmentsRef = collection(db, "enrollments");
      const enrollmentsQuery = query(enrollmentsRef, where("userId", "==", userId));
      const enrollmentsSnap = await getDocs(enrollmentsQuery);
      
      const enrollments = enrollmentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get course details for each enrollment
      const coursesData = await Promise.all(
        enrollments.map(async (enrollment) => {
          const courseDoc = await getDoc(doc(db, "courses", enrollment.courseId));
          if (courseDoc.exists()) {
            // Get ALL lessons for this course
            const lessonsRef = collection(db, "courses", enrollment.courseId, "lessons");
            const lessonsSnap = await getDocs(lessonsRef);
            const allLessons = lessonsSnap.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));

            // Separate active and archived lessons
            const activeLessons = allLessons.filter(lesson => lesson.status !== 'archived');
            const archivedLessons = allLessons.filter(lesson => lesson.status === 'archived');

            // Calculate progress using ONLY active lessons
            const progressPercent = calculateActiveProgress(enrollment, activeLessons);
            
            // Get completion stats
            const completionStats = getCompletionStats(enrollment, activeLessons, archivedLessons);

            return {
              id: courseDoc.id,
              ...courseDoc.data(),
              enrollmentDate: enrollment.enrolledAt?.toDate?.() || new Date(),
              progress: progressPercent,
              activeLessons: activeLessons,
              archivedLessons: archivedLessons,
              totalActiveLessons: activeLessons.length,
              completedActiveLessons: completionStats.active.completed,
              completedArchivedLessons: completionStats.archived,
              lastAccessed: enrollment.lastAccessed?.toDate?.() || null
            };
          }
          return null;
        })
      );

      const validCourses = coursesData.filter(course => course !== null);
      setEnrolledCourses(validCourses);

      // Calculate stats based on ACTIVE lessons only
      const totalActiveLessons = validCourses.reduce((sum, course) => sum + course.totalActiveLessons, 0);
      const completedActiveLessons = validCourses.reduce((sum, course) => sum + course.completedActiveLessons, 0);
      
      setStats({
        totalCourses: validCourses.length,
        completedLessons: completedActiveLessons,
        totalActiveLessons: totalActiveLessons,
        learningHours: Math.round(completedActiveLessons * 0.5) // Estimate 30min per completed lesson
      });

    } catch (error) {
      console.error("Error fetching student data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const markLessonComplete = async (courseId, lessonId) => {
    try {
      // Find the enrollment
      const enrollmentsRef = collection(db, "enrollments");
      const enrollmentQuery = query(
        enrollmentsRef, 
        where("userId", "==", user.uid),
        where("courseId", "==", courseId)
      );
      const enrollmentSnap = await getDocs(enrollmentQuery);
      
      if (!enrollmentSnap.empty) {
        const enrollmentDoc = enrollmentSnap.docs[0];
        const enrollmentData = enrollmentDoc.data();
        const completedLessons = enrollmentData.completedLessons || [];
        
        if (!completedLessons.includes(lessonId)) {
          const newCompletedLessons = [...completedLessons, lessonId];
          
          // Find the course to get active lessons
          const course = enrolledCourses.find(c => c.id === courseId);
          const activeLessons = course?.activeLessons || [];
          
          // Calculate progress based on ACTIVE lessons only
          const completedActive = activeLessons.filter(lesson => 
            newCompletedLessons.includes(lesson.id)
          ).length;
          
          const newProgress = activeLessons.length > 0 
            ? Math.round((completedActive / activeLessons.length) * 100)
            : 0;
          
          await updateDoc(doc(db, "enrollments", enrollmentDoc.id), {
            completedLessons: newCompletedLessons,
            progress: newProgress,
            lastAccessed: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          // Update local state
          setEnrolledCourses(prev => prev.map(course => {
            if (course.id === courseId) {
              const newCompletedActive = course.completedActiveLessons + 1;
              return {
                ...course,
                completedActiveLessons: newCompletedActive,
                progress: newProgress
              };
            }
            return course;
          }));

          // Update stats
          setStats(prev => ({
            ...prev,
            completedLessons: prev.completedLessons + 1
          }));
        }
      }
    } catch (error) {
      console.error("Error marking lesson complete:", error);
    }
  };

  const CourseCard = ({ course }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-40 bg-gradient-to-r from-blue-500 to-indigo-600 relative">
        {course.thumbnailUrl ? (
          <img 
            src={course.thumbnailUrl} 
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="h-12 w-12 text-white opacity-80" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className="px-2 py-1 text-xs font-medium bg-white/90 text-gray-800 rounded-full">
            {course.category || 'General'}
          </span>
        </div>
        <div className="absolute bottom-3 left-3">
          <span className="px-2 py-1 text-xs font-medium bg-black/70 text-white rounded-full">
            {course.level || 'All Levels'}
          </span>
        </div>
      </div>
      
      <div className="p-5">
        <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-1">{course.title}</h3>
        <p className="text-sm text-gray-600 line-clamp-2 mb-4">
          {course.shortDescription || course.description?.substring(0, 100) || 'No description available'}...
        </p>
        
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span className="font-medium text-gray-700">{course.progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${course.progress}%` }}
            />
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Play size={14} className="text-gray-400" />
              <span>{course.totalActiveLessons} active lessons</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={14} className="text-gray-400" />
              <span>{course.duration || "Self-paced"}</span>
            </div>
          </div>
          
          <button
            onClick={() => navigate(`/course/${course.id}`)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Continue
            <ChevronRight size={16} className="ml-1" />
          </button>
        </div>

        {/* Show archived lessons count if any */}
        {course.completedArchivedLessons > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              <span className="font-medium">{course.completedArchivedLessons}</span> completed lessons from archived content
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const EmptyState = () => (
    <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-200">
      <div className="h-20 w-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <BookOpen className="h-10 w-10 text-blue-500" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No courses enrolled yet
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Browse our catalog and start your learning journey today!
      </p>
      <button
        onClick={() => navigate("/courses")}
        className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        Browse Courses
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center space-x-3">
                <img 
                  src="/logo4.png" 
                  alt="Pavoc LMS Logo" 
                  className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl object-cover"
                />
                <div className="hidden sm:block">
                  <span className="text-xl font-bold text-gray-900">Pavoc LMS</span>
                  <p className="text-xs text-gray-500">Admin Learning Dashboard</p>
                </div>
              </Link>
            </div>
            
            {/* User Menu */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-medium text-sm">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.fullName || 'Admin User'}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                Welcome back, {user?.firstName || 'Admin'}!
              </h2>
              <p className="text-blue-100 text-sm sm:text-base">
                Track your progress and continue learning. You have {stats.totalCourses} enrolled course{stats.totalCourses !== 1 ? 's' : ''}.
              </p>
            </div>
            <div className="sm:text-right">
              <div className="text-3xl sm:text-4xl font-bold">
                {stats.completedLessons}/{stats.totalActiveLessons}
              </div>
              <div className="text-sm text-blue-200">Active lessons completed</div>
            </div>
          </div>
        </div>

        {/* Stats Cards - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Enrolled Courses</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.totalCourses}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed Lessons</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600">{stats.completedLessons}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Learning Hours</p>
                <p className="text-2xl sm:text-3xl font-bold text-purple-600">{stats.learningHours}h</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completion Rate</p>
                <p className="text-2xl sm:text-3xl font-bold text-orange-600">
                  {stats.totalActiveLessons > 0 
                    ? `${Math.round((stats.completedLessons / stats.totalActiveLessons) * 100)}%`
                    : "0%"}
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <Award className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* My Courses Section */}
        <div className="mb-8">
          {enrolledCourses.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">My Courses</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrolledCourses.map(course => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Recent Activity */}
        {enrolledCourses.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Continue Learning</h3>
            <div className="space-y-3">
              {enrolledCourses
                .sort((a, b) => (b.lastAccessed?.getTime() || 0) - (a.lastAccessed?.getTime() || 0))
                .slice(0, 3)
                .map(course => (
                  <div 
                    key={course.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                    onClick={() => navigate(`/course/${course.id}`)}
                  >
                    <div className="flex items-center mb-3 sm:mb-0">
                      <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        {course.thumbnailUrl ? (
                          <img 
                            src={course.thumbnailUrl} 
                            alt={course.title}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ) : (
                          <BookOpen className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <div className="ml-4 flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{course.title}</div>
                        <div className="text-sm text-gray-500">
                          {course.completedActiveLessons} of {course.totalActiveLessons} active lessons completed
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end sm:gap-6">
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">{course.progress}%</div>
                        <div className="text-xs text-gray-500">Progress</div>
                      </div>
                      <ChevronRight className="text-gray-400 ml-2 flex-shrink-0" />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Browse Courses Button */}
        <div className="mt-6 text-center sm:text-left">
          <button 
            onClick={() => navigate("/courses")}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse More Courses
            <ChevronRight size={18} className="ml-2" />
          </button>
        </div>
      </main>
    </div>
  );
}
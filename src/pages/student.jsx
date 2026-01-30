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

export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({});
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedLessons: 0,
    totalLessons: 0,
    learningHours: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchStudentData(currentUser.uid);
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchStudentData = async (userId) => {
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
            // Get lessons for this course
            const lessonsRef = collection(db, "courses", enrollment.courseId, "lessons");
            const lessonsSnap = await getDocs(lessonsRef);
            const lessons = lessonsSnap.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));

            // Calculate progress
            const completedLessons = enrollment.completedLessons || [];
            const progressPercent = lessons.length > 0 
              ? Math.round((completedLessons.length / lessons.length) * 100)
              : 0;

            return {
              id: courseDoc.id,
              ...courseDoc.data(),
              enrollmentDate: enrollment.enrolledAt?.toDate?.() || new Date(),
              progress: progressPercent,
              totalLessons: lessons.length,
              completedLessons: completedLessons.length,
              lastAccessed: enrollment.lastAccessed?.toDate?.() || null
            };
          }
          return null;
        })
      );

      const validCourses = coursesData.filter(course => course !== null);
      setEnrolledCourses(validCourses);

      // Calculate stats
      const totalLessons = validCourses.reduce((sum, course) => sum + course.totalLessons, 0);
      const completedLessons = validCourses.reduce((sum, course) => sum + course.completedLessons, 0);
      
      setStats({
        totalCourses: validCourses.length,
        completedLessons,
        totalLessons,
        learningHours: Math.round(totalLessons * 0.5) // Estimate 30min per lesson
      });

      // Store progress in state
      const progressMap = {};
      validCourses.forEach(course => {
        progressMap[course.id] = course.progress;
      });
      setProgress(progressMap);

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
          
          await updateDoc(doc(db, "enrollments", enrollmentDoc.id), {
            completedLessons: newCompletedLessons,
            progress: Math.round((newCompletedLessons.length / enrollmentData.totalLessons) * 100),
            lastAccessed: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          // Update local state
          setEnrolledCourses(prev => prev.map(course => {
            if (course.id === courseId) {
              return {
                ...course,
                completedLessons: course.completedLessons + 1,
                progress: Math.round(((course.completedLessons + 1) / course.totalLessons) * 100)
              };
            }
            return course;
          }));
        }
      }
    } catch (error) {
      console.error("Error marking lesson complete:", error);
    }
  };

  const CourseCard = ({ course }) => (
    <div className="bg-white rounded-xl shadow border overflow-hidden hover:shadow-md transition-shadow">
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
          <span className="px-2 py-1 text-xs bg-white/90 text-gray-800 rounded">
            {course.category}
          </span>
        </div>
        <div className="absolute bottom-3 left-3">
          <span className="px-2 py-1 text-xs bg-black/70 text-white rounded">
            {course.level}
          </span>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate">{course.title}</h3>
        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
          {course.shortDescription || course.description?.substring(0, 100)}...
        </p>
        
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{course.progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${course.progress}%` }}
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Play size={12} />
              <span>{course.totalLessons} lessons</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{course.duration || "Self-paced"}</span>
            </div>
          </div>
          
          <button
            onClick={() => navigate(`/course/${course.id}`)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1"
          >
            Continue <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  const EmptyState = () => (
    <div className="bg-white rounded-2xl p-8 text-center shadow border">
      <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <BookOpen className="h-8 w-8 text-blue-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No courses enrolled yet
      </h3>
      <p className="text-gray-600 mb-6">
        Browse available courses and start your learning journey!
      </p>
      <button
        onClick={() => navigate("/courses")}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Browse Courses
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center space-x-3">
                <img 
                  src="/logo4.png" 
                  alt="Pavoc LMS Logo" 
                  className="h-15 w-15 rounded-xl object-cover"
                />
                <span className="text-xl font-bold text-gray-900">Pavoc LMS</span>
                <p className="text-xs text-gray-500">Student Dashboard</p>
              </Link>
            </div>
            {/* <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Bizika Learning</h1>
                
              </div>
            </div> */}
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-medium">
                    {user?.email?.[0]?.toUpperCase()}
                  </span>
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.fullName || "Student"}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                Welcome back, {user?.firstName || "Student"}!
              </h2>
              <p className="text-blue-100">
                Continue your learning journey. You have {stats.totalCourses} enrolled courses.
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <div className="text-3xl font-bold">
                {stats.completedLessons}/{stats.totalLessons}
              </div>
              <div className="text-sm text-blue-200">Lessons completed</div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Enrolled Courses</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalCourses}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed Lessons</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.completedLessons}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Learning Hours</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{stats.learningHours}h</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {stats.totalLessons > 0 
                    ? `${Math.round((stats.completedLessons / stats.totalLessons) * 100)}%`
                    : "0%"}
                </p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map(course => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {enrolledCourses.length > 0 && (
          <div className="bg-white rounded-xl shadow border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Continue Learning</h3>
            <div className="space-y-4">
              {enrolledCourses
                .sort((a, b) => b.lastAccessed - a.lastAccessed)
                .slice(0, 3)
                .map(course => (
                  <div 
                    key={course.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg cursor-pointer"
                    onClick={() => navigate(`/course/${course.id}`)}
                  >
                    <div className="flex items-center">
                      <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
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
                      <div className="ml-4">
                        <div className="font-medium text-gray-900">{course.title}</div>
                        <div className="text-sm text-gray-500">
                          {course.completedLessons} of {course.totalLessons} lessons completed
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">{course.progress}%</div>
                        <div className="text-xs text-gray-500">Progress</div>
                      </div>
                      <ChevronRight className="text-gray-400" />
                    </div>
                    
                  </div>
                  
                ))}
                
            </div>
            
          </div>
          
        )}
        <button 
        onClick={() => navigate("/courses")}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mt-6"
      >
        Browse Courses
      </button>
      </main>
    </div>
  );
}
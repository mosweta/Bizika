import { useState, useEffect } from "react";
import { useNavigate,Link } from "react-router-dom";
import { db, auth } from "../firebase/config";
import { 
  collection, 
  query, 
  where, 
  getDocs,
  getDoc,
  doc,
  serverTimestamp,
  addDoc,
  updateDoc
} from "firebase/firestore";
import {
  Search,
  Filter,
  Star,
  Clock,
  Users,
  BookOpen,
  ChevronRight,
  CheckCircle,
  ArrowLeft, // Add this import
  ChevronLeft
} from "lucide-react";

export default function CourseCatalog() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [user, setUser] = useState(null);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchEnrolledCourses(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [categoryFilter, levelFilter]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const coursesRef = collection(db, "courses");
      
      // Only show published courses
      let q = query(coursesRef, where("published", "==", true));
      
      const snapshot = await getDocs(q);
      const coursesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Apply filters
      let filtered = coursesData;
      
      if (categoryFilter !== "all") {
        filtered = filtered.filter(course => course.category === categoryFilter);
      }
      
      if (levelFilter !== "all") {
        filtered = filtered.filter(course => course.level === levelFilter);
      }
      
      setCourses(filtered);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrolledCourses = async (userId) => {
    try {
      const enrollmentsRef = collection(db, "enrollments");
      const enrollmentQuery = query(enrollmentsRef, where("userId", "==", userId));
      const enrollmentSnap = await getDocs(enrollmentQuery);
      
      const enrolledIds = enrollmentSnap.docs.map(doc => doc.data().courseId);
      setEnrolledCourseIds(enrolledIds);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
    }
  };

const enrollInCourse = async (courseId) => {
  if (!user) {
    navigate("/login");
    return;
  }

  // Check local state
  if (enrolledCourseIds.includes(courseId)) {
    navigate(`/course/${courseId}`);
    return;
  }

  try {
    // Refresh token
    await auth.currentUser.getIdToken(true);
    
    // Create enrollment (silently handle errors)
    const enrollmentData = {
      userId: user.uid,
      courseId,
      enrolledAt: serverTimestamp(),
      progress: 0,
      completedLessons: [],
      status: "active"
    };

    try {
      await addDoc(collection(db, "enrollments"), enrollmentData);
    } catch (addError) {
      console.log("Note: addDoc threw error (might be false):", addError.message);
    }
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // 🔥 Always verify enrollment exists
    const enrollmentsRef = collection(db, "enrollments");
    const verifyQuery = query(
      enrollmentsRef,
      where("userId", "==", user.uid),
      where("courseId", "==", courseId)
    );
    const verifySnap = await getDocs(verifyQuery);
    
    if (verifySnap.empty) {
      // Really failed
      alert("Failed to enroll. Please try again.");
      return;
    }
    
    // ✅ Success!
    setEnrolledCourseIds(prev => [...prev, courseId]);
    navigate(`/course/${courseId}`);
    
  } catch (error) {
    console.error("Enrollment process error:", error);
    alert("Failed to enroll. Please try again.");
  }
};

    // Update CourseCard to navigate to course details page
  const CourseCard = ({ course }) => {
    const isEnrolled = enrolledCourseIds.includes(course.id);
    const isFree = course.isFree !== false && course.price === 0;

    return (
      <div className="bg-white rounded-xl shadow border overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
        {/* Make the entire card clickable */}
        <div onClick={() => navigate(`/course-details/${course.id}`)}>
          <div className="h-48 bg-gradient-to-r from-blue-500 to-indigo-600 relative">
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
            {isFree && (
              <div className="absolute top-3 left-3">
                <span className="px-2 py-1 text-xs bg-green-600 text-white rounded">
                  FREE
                </span>
              </div>
            )}
          </div>
          
          <div className="p-5">
            <h3 className="font-semibold text-gray-900 text-lg mb-2">{course.title}</h3>
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {course.shortDescription || course.description?.substring(0, 120)}...
            </p>
            
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>{course.duration || "Self-paced"}</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpen size={14} />
                <span>{course.lessonCount || 0} lessons</span>
              </div>
              <div className="flex items-center gap-1">
                <Users size={14} />
                <span>{course.enrolledCount || 0} students</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-5 pt-0">
          <div className="flex items-center justify-between">
            <div>
              {isFree ? (
                <span className="text-lg font-bold text-green-600">Free</span>
              ) : (
                <span className="text-lg font-bold text-gray-900">${course.price || 0}</span>
              )}
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click
                isEnrolled ? navigate(`/course/${course.id}`) : enrollInCourse(course.id);
              }}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                isEnrolled
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isEnrolled ? (
                <>
                  <CheckCircle size={16} />
                  Continue Learning
                </>
              ) : (
                <>
                  Enroll Now
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    
    <div className="min-h-screen bg-gray-50">
          
      {/* Add Back Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <button
          onClick={() => navigate(-1)} // Go back in history
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
      </div>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Learn Something New</h1>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Browse our catalog of courses and start your learning journey today
            </p>
            
            {/* <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search for courses, topics, or instructors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-lg text-gray-900"
                />
              </div>
            </div> */}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow border p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Categories</option>
                <option value="business">Business</option>
                <option value="technology">Technology</option>
                <option value="marketing">Marketing</option>
                <option value="finance">Finance</option>
                <option value="leadership">Leadership</option>
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Level
              </label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            
            {/* <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                <option>Most Popular</option>
                <option>Newest</option>
                <option>Highest Rated</option>
              </select>
            </div> */}
          </div>
        </div>

        {/* Course Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Available Courses ({courses.length})
            </h2>
          </div>
          
          {courses.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow border">
              <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No courses found
              </h3>
              <p className="text-gray-600">
                Try adjusting your filters or check back later for new courses
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.map(course => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
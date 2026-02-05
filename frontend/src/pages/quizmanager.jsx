// src/components/admin/QuizManager.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where, getDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";
import { 
  BookOpen, 
  Users, 
  FileText, 
  ChevronRight, 
  Search, 
  Filter,
  Menu,
  X,
  Eye,
  Plus,
  Download,
  MoreVertical
} from "lucide-react";

export default function QuizManager() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses();
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const checkMobile = () => {
    setIsMobile(window.innerWidth < 768);
  };

  const fetchCourses = async () => {
    try {
      const coursesRef = collection(db, "courses");
      const coursesSnap = await getDocs(coursesRef);
      const coursesData = coursesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(coursesData);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseStudents = async (courseId) => {
    try {
      setLoading(true);
      // Fetch enrollments for this course
      const enrollmentsRef = collection(db, "enrollments");
      const enrollmentQuery = query(
        enrollmentsRef,
        where("courseId", "==", courseId)
      );
      const enrollmentsSnap = await getDocs(enrollmentQuery);
      
      const studentsData = [];
      for (const enrollmentDoc of enrollmentsSnap.docs) {
        const enrollment = enrollmentDoc.data();
        
        // Get user data
        const userDoc = await getDoc(doc(db, "users", enrollment.userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Get quiz results if any
          const quizResultsRef = collection(
            db, 
            "courses", 
            courseId, 
            "quizResults"
          );
          const quizQuery = query(
            quizResultsRef,
            where("userId", "==", enrollment.userId)
          );
          const quizSnap = await getDocs(quizQuery);
          
          let quizData = null;
          if (!quizSnap.empty) {
            const latestQuiz = quizSnap.docs.sort((a, b) => 
              b.data().submittedAt?.toDate() - a.data().submittedAt?.toDate()
            )[0];
            quizData = {
              id: latestQuiz.id,
              ...latestQuiz.data()
            };
          }
          
          studentsData.push({
            id: enrollment.userId,
            enrollmentId: enrollmentDoc.id,
            name: userData.fullName || userData.email,
            email: userData.email,
            progress: enrollment.progress || 0,
            completedLessons: enrollment.completedLessons?.length || 0,
            totalLessons: courses.find(c => c.id === courseId)?.lessons?.length || 0,
            quizResult: quizData
          });
        }
      }
      
      setStudents(studentsData);
      setSelectedCourse(courseId);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuiz = (courseId) => {
    navigate(`/admin/create-quiz/${courseId}`);
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 px-2 md:px-0">
      <div className="bg-white rounded-xl shadow border p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center justify-between md:justify-start">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Quiz Manager</h2>
              <p className="text-sm md:text-base text-gray-600">View and manage quiz results by course</p>
            </div>
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2"
            >
              {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
          
          
        </div>

        {/* Course List */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Course</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {courses.map(course => (
              <div
                key={course.id}
                className={`border rounded-lg p-3 md:p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedCourse === course.id 
                    ? "border-blue-500 bg-blue-50" 
                    : "border-gray-200"
                }`}
                onClick={() => fetchCourseStudents(course.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm md:text-base truncate mb-1">
                      {course.title}
                    </h3>
                    <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Users size={12} className="md:w-4 md:h-4" />
                        <span>{course.enrolledCount || 0} students</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen size={12} className="md:w-4 md:h-4" />
                        <span>{course.lessonCount || 0} lessons</span>
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={`h-5 w-5 flex-shrink-0 ${
                    selectedCourse === course.id ? "text-blue-600" : "text-gray-400"
                  }`} />
                </div>
                
               <div className="mt-3 flex gap-2">
                  {course.hasQuiz ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewQuizResults(course.id);
                        }}
                        className="flex-1 px-3 py-1.5 text-xs md:text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md flex items-center justify-center gap-1"
                      >
                        <Eye size={14} />
                        View Results
                      </button>
                      
                    </>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateQuiz(course.id);
                      }}
                      className="w-full px-3 py-1.5 text-xs md:text-sm bg-green-50 text-green-700 hover:bg-green-100 rounded-md flex items-center justify-center gap-1"
                    >
                      <Plus size={14} />
                      Add Quiz
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Student Results */}
        {selectedCourse && (
          <div className="mt-6 md:mt-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Student Results for{" "}
                <span className="text-blue-600">
                  {courses.find(c => c.id === selectedCourse)?.title}
                </span>
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 md:flex-none">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <button 
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  title="Filter"
                >
                  <Filter size={18} />
                </button>
              </div>
            </div>

            {/* Mobile Student List */}
            {isMobile ? (
              <div className="space-y-3">
                {filteredStudents.map((student) => (
                  <div key={student.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{student.name}</h4>
                        <p className="text-sm text-gray-500 truncate">{student.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {student.quizResult && (
                          <button
                            onClick={() => navigate(`/admin/quiz-details/${selectedCourse}/${student.id}`)}
                            className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded"
                          >
                            View
                          </button>
                        )}
                        <button className="p-1">
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {/* Progress */}
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium">{student.progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-600 rounded-full"
                            style={{ width: `${student.progress}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Quiz Status */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Quiz Status</span>
                        {student.quizResult ? (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            Completed
                          </span>
                        ) : student.progress >= 70 ? (
                          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                            Eligible
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                            Not Eligible
                          </span>
                        )}
                      </div>
                      
                      {/* Score */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Score</span>
                        {student.quizResult ? (
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${
                              student.quizResult.score >= 70 
                                ? "text-green-600" 
                                : "text-red-600"
                            }`}>
                              {student.quizResult.score}%
                            </span>
                            {student.quizResult.isHighest && (
                              <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                                Highest
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </div>
                      
                      {/* Attempts */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Attempts</span>
                        <span>{student.quizResult?.attempts || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Desktop Table */
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Progress
                        </th>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quiz Status
                        </th>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Score
                        </th>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Attempts
                        </th>
                        <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-4 md:px-6 py-4">
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 truncate">{student.name}</div>
                              <div className="text-sm text-gray-500 truncate">{student.email}</div>
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 md:w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-green-600 rounded-full"
                                  style={{ width: `${student.progress}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-700 whitespace-nowrap">{student.progress}%</span>
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            {student.quizResult ? (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full whitespace-nowrap">
                                Completed
                              </span>
                            ) : student.progress >= 70 ? (
                              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full whitespace-nowrap">
                                Eligible
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full whitespace-nowrap">
                                Not Eligible
                              </span>
                            )}
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            {student.quizResult ? (
                              <div className="flex items-center gap-2">
                                <span className={`text-sm md:text-lg font-semibold ${
                                  student.quizResult.score >= 70 
                                    ? "text-green-600" 
                                    : "text-red-600"
                                }`}>
                                  {student.quizResult.score}%
                                </span>
                                {student.quizResult.isHighest && (
                                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                                    Highest
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            {student.quizResult?.attempts || 0}
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            {student.quizResult && (
                              <button
                                onClick={() => navigate(`/admin/quiz-details/${selectedCourse}/${student.id}`)}
                                className="px-3 py-1 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md whitespace-nowrap"
                              >
                                View Details
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Empty State */}
            {filteredStudents.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-2">
                  <Users size={48} className="mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No students found</h3>
                <p className="text-gray-600">
                  {searchTerm ? "Try adjusting your search terms" : "No students enrolled in this course yet"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
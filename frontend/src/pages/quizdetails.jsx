// src/components/admin/QuizDetails.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Calendar, 
  Clock, 
  Award, 
  CheckCircle,
  XCircle,
  BarChart,
  Download,
  Printer
} from "lucide-react";

export default function QuizDetails() {
  const { courseId, userId } = useParams();
  const navigate = useNavigate();
  const [quizResult, setQuizResult] = useState(null);
  const [user, setUser] = useState(null);
  const [course, setCourse] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [allAttempts, setAllAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [courseId, userId]);

  const fetchData = async () => {
    try {
      // Fetch user data
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        setUser({ id: userDoc.id, ...userDoc.data() });
      }

      // Fetch course data
      const courseDoc = await getDoc(doc(db, "courses", courseId));
      if (courseDoc.exists()) {
        setCourse({ id: courseDoc.id, ...courseDoc.data() });
      }

      // Fetch quiz data
      const quizDoc = await getDoc(doc(db, "courses", courseId, "quizzes", "main"));
      if (quizDoc.exists()) {
        setQuiz({ id: quizDoc.id, ...quizDoc.data() });
      }

      // Fetch all quiz attempts for this user
      const quizResultsRef = collection(db, "courses", courseId, "quizResults");
      const quizQuery = query(
        quizResultsRef,
        where("userId", "==", userId)
      );
      const quizSnap = await getDocs(quizQuery);
      
      const attempts = quizSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => b.submittedAt?.toDate() - a.submittedAt?.toDate());
      
      setAllAttempts(attempts);
      setQuizResult(attempts[0]); // Latest attempt

    } catch (error) {
      console.error("Error fetching quiz details:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate();
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const calculateStats = () => {
    if (allAttempts.length === 0) return {};
    
    const scores = allAttempts.map(attempt => attempt.score);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const passedCount = allAttempts.filter(a => a.isPassed).length;
    
    return {
      average: Math.round(average),
      highest: highest,
      lowest: lowest,
      passedCount: passedCount,
      totalAttempts: allAttempts.length,
      passRate: Math.round((passedCount / allAttempts.length) * 100)
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!quizResult) {
    return (
      <div className="text-center py-12">
        <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Quiz Attempts Found</h3>
        <p className="text-gray-600 mb-6">This student hasn't taken the quiz yet.</p>
        <button
          onClick={() => navigate("/admin/quizzes")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Quizzes
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin/quizzes")}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Quiz Details</h2>
              <div className="flex flex-wrap items-center gap-2 text-gray-600">
                <span>{course?.title}</span>
                <span>•</span>
                <span>{user?.name || user?.email}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Printer size={16} />
              Print
            </button>
            <button className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {/* User Info Card */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">{user?.name || "No Name"}</div>
                <div className="text-sm text-gray-500">Student</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900">{user?.email}</div>
                <div className="text-sm text-gray-500">Email</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900">
                  {formatDate(quizResult.submittedAt)}
                </div>
                <div className="text-sm text-gray-500">Last Attempt</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">Latest Score</div>
            <div className={`text-2xl font-bold ${
              quizResult.isPassed ? "text-green-600" : "text-red-600"
            }`}>
              {quizResult.score}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {quizResult.isPassed ? "Passed" : "Failed"} ({quiz.passingScore}% to pass)
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">Time Taken</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatTime(quizResult.timeSpent)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {quiz?.timeLimit} min limit
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">Highest Score</div>
            <div className="text-2xl font-bold text-blue-600">
              {stats.highest}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Best of {stats.totalAttempts} attempts
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">Average Score</div>
            <div className="text-2xl font-bold text-purple-600">
              {stats.average}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.passRate}% pass rate
            </div>
          </div>
        </div>

        {/* Attempt History */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Attempt History</h3>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attempt #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time Taken
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Highest
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allAttempts.map((attempt, index) => (
                    <tr 
                      key={attempt.id} 
                      className={`cursor-pointer hover:bg-gray-50 ${
                        attempt.id === quizResult.id ? "bg-blue-50" : ""
                      }`}
                      onClick={() => setQuizResult(attempt)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 flex items-center justify-center rounded-full ${
                            attempt.isHighest ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                          }`}>
                            {allAttempts.length - index}
                          </div>
                          <span className="font-medium">Attempt {allAttempts.length - index}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(attempt.submittedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-lg font-semibold ${
                          attempt.isPassed ? "text-green-600" : "text-red-600"
                        }`}>
                          {attempt.score}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {attempt.isPassed ? (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full flex items-center gap-1 w-fit">
                            <CheckCircle size={12} />
                            Passed
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full flex items-center gap-1 w-fit">
                            <XCircle size={12} />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTime(attempt.timeSpent)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {attempt.isHighest && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                            Highest
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Question Analysis */}
        {quiz && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Analysis</h3>
            <div className="space-y-4">
              {quiz.questions.map((question, qIndex) => {
                const studentAnswer = quizResult.answers?.[qIndex];
                const isCorrect = studentAnswer === question.correctAnswer;
                
                return (
                  <div key={qIndex} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 ${
                          isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {qIndex + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-2">{question.text}</h4>
                          <div className="space-y-2">
                            {question.options.map((option, oIndex) => (
                              <div
                                key={oIndex}
                                className={`p-3 border rounded-lg ${
                                  oIndex === question.correctAnswer
                                    ? "border-green-500 bg-green-50"
                                    : oIndex === studentAnswer && !isCorrect
                                    ? "border-red-500 bg-red-50"
                                    : "border-gray-200"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-6 h-6 flex items-center justify-center rounded-full ${
                                    oIndex === question.correctAnswer
                                      ? "bg-green-500 text-white"
                                      : oIndex === studentAnswer && !isCorrect
                                      ? "bg-red-500 text-white"
                                      : "bg-gray-100 text-gray-600"
                                  }`}>
                                    {String.fromCharCode(65 + oIndex)}
                                  </div>
                                  <span className={
                                    oIndex === question.correctAnswer
                                      ? "font-medium text-green-700"
                                      : oIndex === studentAnswer && !isCorrect
                                      ? "font-medium text-red-700"
                                      : ""
                                  }>
                                    {option}
                                  </span>
                                  <div className="ml-auto">
                                    {oIndex === question.correctAnswer && (
                                      <span className="text-xs text-green-600 font-medium">Correct Answer</span>
                                    )}
                                    {oIndex === studentAnswer && !isCorrect && (
                                      <span className="text-xs text-red-600 font-medium">Student's Answer</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end ml-4">
                        <span className="text-sm text-gray-500">Points</span>
                        <span className={`text-lg font-semibold ${
                          isCorrect ? "text-green-600" : "text-red-600"
                        }`}>
                          {isCorrect ? question.points : 0}/{question.points}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
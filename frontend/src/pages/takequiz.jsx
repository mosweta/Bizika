// src/components/student/TakeQuiz.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/config";
import { 
  doc, 
  getDoc, 
  collection, 
  addDoc, 
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp 
} from "firebase/firestore";
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft,
  Award,
  Hash,
  Save,
  Send
} from "lucide-react";

export default function TakeQuiz() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [previousAttempts, setPreviousAttempts] = useState([]);
  const [startedAt, setStartedAt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        navigate("/login");
        return;
      }
      setUser(currentUser);
      await fetchQuiz(currentUser.uid);
    });

    return () => unsubscribe();
  }, [courseId, navigate]);

  const fetchQuiz = async (userId) => {
    try {
      // Fetch quiz
      const quizRef = doc(db, "courses", courseId, "quizzes", "main");
      const quizDoc = await getDoc(quizRef);
      
      if (!quizDoc.exists()) {
        navigate(`/course/${courseId}`);
        return;
      }
      
      setQuiz({
        id: quizDoc.id,
        ...quizDoc.data()
      });
      setTimeLeft(quizDoc.data().timeLimit * 60); // Convert minutes to seconds
      setStartedAt(new Date());

      // Initialize answers
      const initialAnswers = {};
      quizDoc.data().questions.forEach((question, index) => {
        initialAnswers[index] = null;
      });
      setAnswers(initialAnswers);

      // Fetch previous attempts
      const quizResultsRef = collection(db, "courses", courseId, "quizResults");
      const attemptsQuery = query(
        quizResultsRef,
        where("userId", "==", userId)
      );
      const attemptsSnap = await getDocs(attemptsQuery);
      const attemptsData = attemptsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPreviousAttempts(attemptsData);

    } catch (error) {
      console.error("Error fetching quiz:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleAnswerSelect = (questionIndex, answerIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answerIndex
    }));
  };

  const handleSubmit = async () => {
    if (submitting) return;

    // Check if all questions are answered
    const unansweredQuestions = Object.values(answers).filter(answer => answer === null).length;
    if (unansweredQuestions > 0 && !window.confirm(
      `You have ${unansweredQuestions} unanswered questions. Submit anyway?`
    )) {
      return;
    }

    setSubmitting(true);
    try {
      // Calculate score
      let totalPoints = 0;
      let earnedPoints = 0;
      
      quiz.questions.forEach((question, index) => {
        totalPoints += question.points;
        if (answers[index] === question.correctAnswer) {
          earnedPoints += question.points;
        }
      });
      
      const score = Math.round((earnedPoints / totalPoints) * 100);
      const isPassed = score >= quiz.passingScore;

      // Check if this is the highest score
      const previousHighest = previousAttempts.length > 0 
        ? Math.max(...previousAttempts.map(attempt => attempt.score))
        : 0;
      
      const isHighest = score > previousHighest;

      // Save quiz result
      const quizResult = {
        userId: user.uid,
        userName: user.displayName || user.email,
        userEmail: user.email,
        quizId: quiz.id,
        courseId: courseId,
        score: score,
        earnedPoints: earnedPoints,
        totalPoints: totalPoints,
        isPassed: isPassed,
        isHighest: isHighest,
        answers: answers,
        timeSpent: quiz.timeLimit * 60 - timeLeft,
        startedAt: startedAt,
        submittedAt: serverTimestamp(),
        attempts: (previousAttempts.length || 0) + 1
      };

      await addDoc(
        collection(db, "courses", courseId, "quizResults"),
        quizResult
      );

      // Update user's enrollment to mark quiz as completed
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

        const previousHighestScore =
          typeof enrollmentData.highestQuizScore === "number"
            ? enrollmentData.highestQuizScore
            : 0;

        const newHighestScore = Math.max(previousHighestScore, score);

        await updateDoc(doc(db, "enrollments", enrollmentDoc.id), {
          quizCompleted: true,
          quizScore: score,
          highestQuizScore: newHighestScore,
          lastQuizAttempt: serverTimestamp()
        });

      }

      // Navigate to results page
      navigate(`/course/${courseId}/quiz-results`, {
        state: {
          score,
          isPassed,
          quiz,
          answers,
          timeSpent: quiz.timeLimit * 60 - timeLeft,
          isHighest
        }
      });

    } catch (error) {
      console.error("Error submitting quiz:", error);
      alert("Failed to submit quiz. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Quiz not found</h2>
          <button
            onClick={() => navigate(`/course/${courseId}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Course
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/course/${courseId}`)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">{quiz.title}</h1>
                <p className="text-sm text-gray-500">{quiz.description}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Timer */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                timeLeft < 300 ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
              }`}>
                <Clock className="h-4 w-4" />
                <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
              </div>
              
              {/* Previous attempts */}
              {previousAttempts.length > 0 && (
                <div className="hidden sm:block">
                  <div className="text-sm text-gray-600">
                    Best: {Math.max(...previousAttempts.map(a => a.score))}%
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Quiz Info Card */}
        <div className="bg-white rounded-xl shadow border p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Hash className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="text-sm text-gray-600">Questions</div>
              <div className="font-semibold text-lg">{quiz.questions.length}</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <Award className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="text-sm text-gray-600">Passing Score</div>
              <div className="font-semibold text-lg">{quiz.passingScore}%</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <Clock className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <div className="text-sm text-gray-600">Time Limit</div>
              <div className="font-semibold text-lg">{quiz.timeLimit} min</div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-600 mb-3">
              Read each question carefully and select the best answer. You can change your answers before submitting.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <CheckCircle className="h-4 w-4" />
              <span>All questions are multiple choice with one correct answer</span>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4 sm:space-y-6">
          {quiz.questions.map((question, questionIndex) => (
            <div key={questionIndex} className="bg-white rounded-xl shadow border p-4 sm:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold">
                    {questionIndex + 1}
                  </div>
                  <h3 className="font-medium text-gray-900">{question.text}</h3>
                </div>
                <span className="px-2 py-1 text-sm bg-gray-100 text-gray-800 rounded-full">
                  {question.points} points
                </span>
              </div>

              <div className="ml-0 sm:ml-11 space-y-3">
                {question.options.map((option, optionIndex) => (
                  <button
                    key={optionIndex}
                    onClick={() => handleAnswerSelect(questionIndex, optionIndex)}
                    className={`w-full text-left p-3 sm:p-4 border rounded-lg transition-all ${
                      answers[questionIndex] === optionIndex
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 ${
                        answers[questionIndex] === optionIndex
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {String.fromCharCode(65 + optionIndex)}
                      </div>
                      <span className={answers[questionIndex] === optionIndex ? "font-medium text-blue-700" : ""}>
                        {option}
                      </span>
                      {answers[questionIndex] === optionIndex && (
                        <span className="ml-auto text-xs text-blue-600 font-medium hidden sm:block">
                          Selected
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Submission Section */}
        <div className="mt-8 bg-white rounded-xl shadow border p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <div className="text-sm text-gray-600 mb-1">
                Questions Answered: {Object.values(answers).filter(a => a !== null).length} / {quiz.questions.length}
              </div>
              <div className="text-sm text-gray-600">
                Time Remaining: <span className="font-mono">{formatTime(timeLeft)}</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send size={20} />
                )}
                Submit Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
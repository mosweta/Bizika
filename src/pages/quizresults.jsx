// src/components/student/QuizResults.jsx
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { CheckCircle, XCircle, Award, Clock, BookOpen } from "lucide-react";

export default function QuizResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { score, isPassed, quiz, answers, timeSpent, isHighest } = location.state || {};

  if (!location.state) {
    navigate(`/course/${courseId}`);
    return null;
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl border overflow-hidden">
          {/* Header */}
          <div className={`p-8 text-center ${
            isPassed ? "bg-gradient-to-r from-green-50 to-emerald-50" : "bg-gradient-to-r from-red-50 to-orange-50"
          }`}>
            {isPassed ? (
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            ) : (
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            )}
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isPassed ? "Congratulations!" : "Quiz Completed"}
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              {isPassed 
                ? "You have successfully passed the quiz!" 
                : "You need to score 70% to pass. You can retake the quiz."}
            </p>
            
            {/* Score Circle */}
            <div className="inline-flex items-center justify-center">
              <div className="relative">
                <div className="h-40 w-40 rounded-full border-8 border-gray-200 flex items-center justify-center">
                  <div className="text-center">
                    <div className={`text-5xl font-bold ${
                      isPassed ? "text-green-600" : "text-red-600"
                    }`}>
                      {score}%
                    </div>
                    <div className="text-sm text-gray-500">SCORE</div>
                  </div>
                </div>
                <div 
                  className="absolute top-0 left-0 h-40 w-40 rounded-full border-8 border-transparent"
                  style={{
                    borderTopColor: isPassed ? "#10b981" : "#ef4444",
                    borderRightColor: isPassed ? "#10b981" : "#ef4444",
                    transform: `rotate(${score * 3.6}deg)`
                  }}
                ></div>
              </div>
            </div>
            
            {isHighest && (
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full">
                <Award className="h-4 w-4" />
                <span className="font-medium">New High Score!</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Clock className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{formatTime(timeSpent)}</div>
                <div className="text-sm text-gray-600">Time Taken</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <BookOpen className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{quiz?.questions.length}</div>
                <div className="text-sm text-gray-600">Questions</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Award className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{quiz?.passingScore}%</div>
                <div className="text-sm text-gray-600">Passing Score</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate(`/course/${courseId}`)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Back to Course
              </button>
              <button
                onClick={() => navigate(`/course/${courseId}/quiz`)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retake Quiz
              </button>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
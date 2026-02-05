// src/components/admin/CreateQuiz.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft, 
  BookOpen, 
  Hash,
  Edit2,
  Eye,
  AlertCircle,
  Clock,
  Award,
  Users,
  FileText
} from "lucide-react";

export default function CreateQuiz() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [isEditMode, setIsEditMode] = useState(false);
  const [course, setCourse] = useState(null);
  const [quiz, setQuiz] = useState({
    title: "",
    description: "",
    passingScore: 70,
    timeLimit: 30,
    questions: [],
    totalPoints: 100,
    isActive: true,
    courseId: courseId
  });
  const [newQuestion, setNewQuestion] = useState({
    text: "",
    type: "multiple-choice",
    points: 10,
    options: ["", "", "", ""],
    correctAnswer: 0
  });
  const [saving, setSaving] = useState(false);
  const [quizStats, setQuizStats] = useState(null);

  useEffect(() => {
    if (courseId) {
      fetchCourse();
      fetchExistingQuiz();
      checkEditMode();
    }
  }, [courseId, location]);

  const checkEditMode = () => {
    const params = new URLSearchParams(location.search);
    setIsEditMode(params.get('edit') === 'true');
  };

  const fetchCourse = async () => {
    try {
      const courseDoc = await getDoc(doc(db, "courses", courseId));
      if (courseDoc.exists()) {
        setCourse({ id: courseDoc.id, ...courseDoc.data() });
      }
    } catch (error) {
      console.error("Error fetching course:", error);
    }
  };

  const fetchExistingQuiz = async () => {
    try {
      const quizRef = doc(db, "courses", courseId, "quizzes", "main");
      const quizDoc = await getDoc(quizRef);
      
      if (quizDoc.exists()) {
        const quizData = quizDoc.data();
        setQuiz({
          ...quizData,
          courseId
        });
        
        // Fetch quiz statistics if in edit mode
        if (isEditMode) {
          await fetchQuizStats();
        }
      }
    } catch (error) {
      console.error("Error fetching quiz:", error);
    }
  };

  const fetchQuizStats = async () => {
    try {
      const quizResultsRef = collection(db, "courses", courseId, "quizResults");
      const quizResultsSnap = await getDocs(quizResultsRef);
      
      if (quizResultsSnap.size > 0) {
        const results = quizResultsSnap.docs.map(doc => doc.data());
        const totalAttempts = results.length;
        const scores = results.map(r => r.score || 0);
        const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        const passedCount = results.filter(r => r.score >= quiz.passingScore).length;
        const highestScore = Math.max(...scores);
        
        setQuizStats({
          totalAttempts,
          averageScore,
          passedCount,
          highestScore,
          passRate: Math.round((passedCount / totalAttempts) * 100)
        });
      }
    } catch (error) {
      console.error("Error fetching quiz stats:", error);
    }
  };

  const addQuestion = () => {
    if (!newQuestion.text.trim() || newQuestion.options.some(opt => !opt.trim())) {
      alert("Please fill in all fields for the question");
      return;
    }

    setQuiz(prev => ({
      ...prev,
      questions: [...prev.questions, { 
        ...newQuestion, 
        id: Date.now().toString() 
      }]
    }));

    setNewQuestion({
      text: "",
      type: "multiple-choice",
      points: 10,
      options: ["", "", "", ""],
      correctAnswer: 0
    });
  };

  const removeQuestion = (index) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const updateQuestion = (index, field, value) => {
    const updatedQuestions = [...quiz.questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: value
    };
    setQuiz(prev => ({ ...prev, questions: updatedQuestions }));
  };

  const saveQuiz = async () => {
    if (!quiz.title.trim()) {
      alert("Please enter a quiz title");
      return;
    }

    if (quiz.questions.length === 0) {
      alert("Please add at least one question");
      return;
    }

    if (quiz.questions.some(q => q.points <= 0)) {
      alert("All questions must have positive points");
      return;
    }

    setSaving(true);
    try {
      const quizRef = doc(db, "courses", courseId, "quizzes", "main");
      const quizData = {
        ...quiz,
        updatedAt: new Date(),
        totalPoints: quiz.questions.reduce((sum, q) => sum + q.points, 0),
        questionCount: quiz.questions.length
      };

      if (!isEditMode) {
        quizData.createdAt = new Date();
      }

      await setDoc(quizRef, quizData);

      // Update course to indicate it has a quiz
      await setDoc(doc(db, "courses", courseId), {
        hasQuiz: true
      }, { merge: true });

      alert(isEditMode ? "Quiz updated successfully!" : "Quiz created successfully!");
      navigate("/admin/quizzes");
    } catch (error) {
      console.error("Error saving quiz:", error);
      alert(`Failed to ${isEditMode ? 'update' : 'save'} quiz: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteQuiz = async () => {
    if (!window.confirm("Are you sure you want to delete this quiz? This action cannot be undone.")) {
      return;
    }

    try {
      // Delete the quiz
      const quizRef = doc(db, "courses", courseId, "quizzes", "main");
      await deleteDoc(quizRef);

      // Delete all quiz results
      const quizResultsRef = collection(db, "courses", courseId, "quizResults");
      const quizResultsSnap = await getDocs(quizResultsRef);
      const deletePromises = quizResultsSnap.docs.map(docSnap => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);

      // Update course
      await setDoc(doc(db, "courses", courseId), {
        hasQuiz: false
      }, { merge: true });

      alert("Quiz deleted successfully!");
      navigate("/admin/quizzes");
    } catch (error) {
      console.error("Error deleting quiz:", error);
      alert("Failed to delete quiz. Please try again.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-2 md:px-0">
      {/* Header */}
      <div className="bg-white rounded-xl shadow border p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin/quizzes")}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                {isEditMode ? "Edit Quiz" : "Create Quiz"}
              </h2>
              <div className="flex items-center gap-2 text-gray-600">
                <BookOpen size={16} />
                <span className="text-sm md:text-base">{course?.title || "Loading..."}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {isEditMode && quizStats && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Users size={14} />
                  <span>{quizStats.totalAttempts} attempts</span>
                </div>
                <div className="flex items-center gap-1">
                  <Award size={14} />
                  <span>Avg: {quizStats.averageScore}%</span>
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              {isEditMode && (
                <button
                  onClick={deleteQuiz}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <Trash2 size={18} />
                  <span className="hidden md:inline">Delete Quiz</span>
                </button>
              )}
              <button
                onClick={saveQuiz}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save size={18} />
                )}
                <span>{isEditMode ? "Update Quiz" : "Save Quiz"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quiz Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quiz Title *
            </label>
            <input
              type="text"
              value={quiz.title}
              onChange={(e) => setQuiz(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Final Assessment"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Passing Score (%) *
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={quiz.passingScore}
              onChange={(e) => setQuiz(prev => ({ ...prev, passingScore: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Limit (minutes) *
            </label>
            <input
              type="number"
              min="1"
              value={quiz.timeLimit}
              onChange={(e) => setQuiz(prev => ({ ...prev, timeLimit: parseInt(e.target.value) || 30 }))}
              className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quiz Status
            </label>
            <select
              value={quiz.isActive ? "active" : "inactive"}
              onChange={(e) => setQuiz(prev => ({ ...prev, isActive: e.target.value === "active" }))}
              className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={quiz.description}
              onChange={(e) => setQuiz(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe what this quiz covers..."
            />
          </div>
        </div>

        {/* Add New Question */}
        <div className="bg-gray-50 rounded-lg p-4 md:p-6 mb-6 md:mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Question</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Text *
              </label>
              <input
                type="text"
                value={newQuestion.text}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, text: e.target.value }))}
                className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter the question..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Points *
                </label>
                <input
                  type="number"
                  min="1"
                  value={newQuestion.points}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, points: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correct Answer *
                </label>
                <select
                  value={newQuestion.correctAnswer}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, correctAnswer: parseInt(e.target.value) }))}
                  className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {newQuestion.options.map((_, index) => (
                    <option key={index} value={index}>
                      Option {index + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Options (4 required) *
              </label>
              <div className="space-y-2">
                {newQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100">
                      <span className="text-xs font-medium">{index + 1}</span>
                    </div>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...newQuestion.options];
                        newOptions[index] = e.target.value;
                        setNewQuestion(prev => ({ ...prev, options: newOptions }));
                      }}
                      className="flex-1 px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={`Option ${index + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={addQuestion}
              className="w-full md:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Add Question
            </button>
          </div>
        </div>

        {/* Questions List */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Questions ({quiz.questions.length})
            </h3>
            <div className="text-gray-600">
              Total Points: {quiz.questions.reduce((sum, q) => sum + q.points, 0)}
            </div>
          </div>

          {quiz.questions.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <Hash className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No questions added yet</p>
              <p className="text-sm text-gray-400">Add your first question above</p>
            </div>
          ) : (
            <div className="space-y-4">
              {quiz.questions.map((question, index) => (
                <div key={question.id || index} className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold flex-shrink-0">
                          {index + 1}
                        </div>
                        <h4 className="font-medium text-gray-900">{question.text}</h4>
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full flex-shrink-0">
                          {question.points} points
                        </span>
                      </div>
                      
                      <div className="ml-0 md:ml-11 space-y-2">
                        {question.options.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className={`p-3 border rounded-lg ${
                              optIndex === question.correctAnswer
                                ? "border-green-500 bg-green-50"
                                : "border-gray-200"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 ${
                                optIndex === question.correctAnswer
                                  ? "bg-green-500 text-white"
                                  : "bg-gray-100 text-gray-600"
                              }`}>
                                {String.fromCharCode(65 + optIndex)}
                              </div>
                              <span className={optIndex === question.correctAnswer ? "font-medium text-green-700" : ""}>
                                {option}
                              </span>
                              {optIndex === question.correctAnswer && (
                                <span className="ml-auto text-xs text-green-600 font-medium">
                                  Correct Answer
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => removeQuestion(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg self-start md:self-center"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                  
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Points:</label>
                      <input
                        type="number"
                        min="1"
                        value={question.points}
                        onChange={(e) => updateQuestion(index, "points", parseInt(e.target.value) || 1)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Correct Answer:</label>
                      <select
                        value={question.correctAnswer}
                        onChange={(e) => updateQuestion(index, "correctAnswer", parseInt(e.target.value))}
                        className="px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      >
                        {question.options.map((_, optIndex) => (
                          <option key={optIndex} value={optIndex}>
                            Option {optIndex + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
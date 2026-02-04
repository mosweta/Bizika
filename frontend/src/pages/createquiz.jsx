// src/components/admin/CreateQuiz.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, collection, addDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { Plus, Trash2, Save, ArrowLeft, BookOpen, Hash } from "lucide-react";

export default function CreateQuiz() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [quiz, setQuiz] = useState({
    title: "",
    description: "",
    passingScore: 70,
    timeLimit: 30, // in minutes
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

  useEffect(() => {
    if (courseId) {
      fetchCourse();
      fetchExistingQuiz();
    }
  }, [courseId]);

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
        setQuiz({ ...quizDoc.data(), courseId });
      }
    } catch (error) {
      console.error("Error fetching quiz:", error);
    }
  };

  const addQuestion = () => {
    if (!newQuestion.text.trim() || newQuestion.options.some(opt => !opt.trim())) {
      alert("Please fill in all fields for the question");
      return;
    }

    setQuiz(prev => ({
      ...prev,
      questions: [...prev.questions, { ...newQuestion, id: Date.now().toString() }]
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
      await setDoc(quizRef, {
        ...quiz,
        createdAt: new Date(),
        updatedAt: new Date(),
        totalPoints: quiz.questions.reduce((sum, q) => sum + q.points, 0),
        questionCount: quiz.questions.length
      });

      // Update course to indicate it has a quiz
      await updateDoc(doc(db, "courses", courseId), {
        hasQuiz: true
      });

      alert("Quiz saved successfully!");
      navigate("/admin/quizzes");
    } catch (error) {
      console.error("Error saving quiz:", error);
      alert("Failed to save quiz");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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
              <h2 className="text-2xl font-bold text-gray-900">Create Quiz</h2>
              <div className="flex items-center gap-2 text-gray-600">
                <BookOpen size={16} />
                <span>{course?.title || "Loading..."}</span>
              </div>
            </div>
          </div>
          <button
            onClick={saveQuiz}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save size={20} />
            )}
            Save Quiz
          </button>
        </div>

        {/* Quiz Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quiz Title *
            </label>
            <input
              type="text"
              value={quiz.title}
              onChange={(e) => setQuiz(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              onChange={(e) => setQuiz(prev => ({ ...prev, passingScore: parseInt(e.target.value) }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={quiz.description}
              onChange={(e) => setQuiz(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe what this quiz covers..."
            />
          </div>
        </div>

        {/* Add New Question */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, points: parseInt(e.target.value) }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correct Answer *
                </label>
                <select
                  value={newQuestion.correctAnswer}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, correctAnswer: parseInt(e.target.value) }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <div className="flex items-center justify-between mb-4">
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
                <div key={question.id || index} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold">
                          {index + 1}
                        </div>
                        <h4 className="font-medium text-gray-900">{question.text}</h4>
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                          {question.points} points
                        </span>
                      </div>
                      
                      <div className="ml-11 space-y-2">
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
                              <div className={`w-6 h-6 flex items-center justify-center rounded-full ${
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
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg ml-4"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Points:</label>
                      <input
                        type="number"
                        min="1"
                        value={question.points}
                        onChange={(e) => updateQuestion(index, "points", parseInt(e.target.value))}
                        className="w-20 ml-2 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Correct Answer:</label>
                      <select
                        value={question.correctAnswer}
                        onChange={(e) => updateQuestion(index, "correctAnswer", parseInt(e.target.value))}
                        className="ml-2 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
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
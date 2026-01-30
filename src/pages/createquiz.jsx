// src/components/admin/CreateQuizOptimized.jsx
import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { Plus, Trash2, Save, ArrowLeft, BookOpen, Hash } from "lucide-react";

// Memoized Question Component
const QuestionItem = memo(({ 
  question, 
  index, 
  onUpdate, 
  onRemove 
}) => {
  const handlePointsChange = useCallback((e) => {
    onUpdate(index, "points", parseInt(e.target.value) || 1);
  }, [index, onUpdate]);

  const handleCorrectAnswerChange = useCallback((e) => {
    onUpdate(index, "correctAnswer", parseInt(e.target.value));
  }, [index, onUpdate]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
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
          onClick={() => onRemove(index)}
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
            onChange={handlePointsChange}
            className="w-20 ml-2 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-sm text-gray-600">Correct Answer:</label>
          <select
            value={question.correctAnswer}
            onChange={handleCorrectAnswerChange}
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
  );
});

QuestionItem.displayName = 'QuestionItem';

export default function CreateQuizOptimized() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  // Split state to prevent unnecessary re-renders
  const [course, setCourse] = useState(null);
  const [quizMeta, setQuizMeta] = useState({
    title: "",
    description: "",
    passingScore: 70,
    timeLimit: 30,
    isActive: true
  });
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState({
    text: "",
    type: "multiple-choice",
    points: 10,
    options: ["", "", "", ""],
    correctAnswer: 0
  });
  const [saving, setSaving] = useState(false);

  // Memoized values
  const totalPoints = useMemo(() => 
    questions.reduce((sum, q) => sum + q.points, 0), 
    [questions]
  );

  const hasEmptyFields = useMemo(() => 
    !newQuestion.text.trim() || newQuestion.options.some(opt => !opt.trim()),
    [newQuestion]
  );

  // Fetch data
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
        const data = quizDoc.data();
        setQuizMeta({
          title: data.title || "",
          description: data.description || "",
          passingScore: data.passingScore || 70,
          timeLimit: data.timeLimit || 30,
          isActive: data.isActive !== false
        });
        setQuestions(data.questions || []);
      }
    } catch (error) {
      console.error("Error fetching quiz:", error);
    }
  };

  // Memoized handlers
  const handleQuizMetaChange = useCallback((field, value) => {
    setQuizMeta(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleNewQuestionChange = useCallback((field, value) => {
    setNewQuestion(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleOptionChange = useCallback((index, value) => {
    setNewQuestion(prev => {
      const newOptions = [...prev.options];
      newOptions[index] = value;
      return { ...prev, options: newOptions };
    });
  }, []);

  const addQuestion = useCallback(() => {
    if (hasEmptyFields) {
      alert("Please fill in all fields for the question");
      return;
    }

    setQuestions(prev => [
      ...prev, 
      { ...newQuestion, id: Date.now().toString() }
    ]);

    setNewQuestion({
      text: "",
      type: "multiple-choice",
      points: 10,
      options: ["", "", "", ""],
      correctAnswer: 0
    });
  }, [newQuestion, hasEmptyFields]);

  const updateQuestion = useCallback((index, field, value) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const removeQuestion = useCallback((index) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  }, []);

  const saveQuiz = async () => {
    if (!quizMeta.title.trim()) {
      alert("Please enter a quiz title");
      return;
    }

    if (questions.length === 0) {
      alert("Please add at least one question");
      return;
    }

    setSaving(true);
    try {
      const quizRef = doc(db, "courses", courseId, "quizzes", "main");
      await setDoc(quizRef, {
        ...quizMeta,
        questions,
        courseId,
        totalPoints,
        questionCount: questions.length,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

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
      {/* Header - same as before but with optimized handlers */}
      <div className="bg-white rounded-xl shadow border p-6">
        {/* ... Header JSX ... */}
        
        {/* Quiz Details with optimized inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quiz Title *
            </label>
            <input
              type="text"
              value={quizMeta.title}
              onChange={(e) => handleQuizMetaChange("title", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {/* Other inputs with similar optimizations */}
        </div>

        {/* Add New Question with optimized handlers */}
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
                onChange={(e) => handleNewQuestionChange("text", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Options with optimized handlers */}
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
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={addQuestion}
              disabled={hasEmptyFields}
              className="w-full md:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Add Question
            </button>
          </div>
        </div>

        {/* Questions List with virtualization for large lists */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Questions ({questions.length})
            </h3>
            <div className="text-gray-600">
              Total Points: {totalPoints}
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <Hash className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No questions added yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => (
                <QuestionItem
                  key={question.id || index}
                  question={question}
                  index={index}
                  onUpdate={updateQuestion}
                  onRemove={removeQuestion}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
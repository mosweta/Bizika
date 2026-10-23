// src/pages/createquiz.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, deleteDoc, collection, getCountFromServer } from "firebase/firestore";
import { db } from "../firebase/config";
import {
  ArrowLeft, Plus, Trash2, Save, Loader2, AlertCircle,
  CheckCircle, ChevronDown, ChevronUp, GripVertical, X,
} from "lucide-react";
import { SkeletonBar } from "../components/Skeletons";

// ─────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────
function validateQuiz(quiz) {
  const errors = {};
  if (!quiz.title?.trim()) errors.title = "Title is required";
  if (quiz.questions.length === 0) errors.questions = "Add at least one question";
  quiz.questions.forEach((q, i) => {
    if (!q.text?.trim()) errors[`q${i}_text`] = `Question ${i + 1} text required`;
    const filled = q.options.filter((o) => o.trim());
    if (filled.length < 2) errors[`q${i}_options`] = `Question ${i + 1} needs at least 2 options`;
    if (!q.options[q.correctAnswer]?.trim()) {
      errors[`q${i}_answer`] = `Question ${i + 1} has no correct answer`;
    }
  });
  return errors;
}

// ─────────────────────────────────────────────────────────────
// Question card
// ─────────────────────────────────────────────────────────────
function QuestionCard({
  question,
  index,
  onUpdate,
  onDelete,
  onMove,
  isFirst,
  isLast,
}) {
  const [expanded, setExpanded] = useState(true);

  const setField = (key, value) =>
    onUpdate({ ...question, [key]: value });

  const setOption = (optIndex, value) => {
    const options = [...question.options];
    options[optIndex] = value;
    setField("options", options);
  };

  const addOption = () => {
    if (question.options.length >= 6) return;
    setField("options", [...question.options, ""]);
  };

  const removeOption = (optIndex) => {
    if (question.options.length <= 2) return;
    const options = question.options.filter((_, i) => i !== optIndex);
    let correct = question.correctAnswer;
    if (optIndex === correct) correct = 0;
    else if (optIndex < correct) correct -= 1;
    onUpdate({ ...question, options, correctAnswer: correct });
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <GripVertical className="h-4 w-4 text-slate-300" />
        <span className="text-xs font-medium text-slate-500 tabular-nums w-6">
          {index + 1}
        </span>
        <span className="flex-1 text-sm text-slate-700 truncate">
          {question.text || <span className="text-slate-400 italic">Untitled question</span>}
        </span>
        <span className="text-xs text-slate-400 tabular-nums">
          {question.points} pt
        </span>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-1 text-slate-400 hover:text-slate-700 rounded"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-slate-400 hover:text-red-600 rounded"
          title="Delete question"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Question text */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Question
            </label>
            <textarea
              value={question.text}
              onChange={(e) => setField("text", e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-800 resize-y"
              placeholder="What do you want to ask?"
            />
          </div>

          {/* Options */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-600">
                Options
              </label>
              <span className="text-xs text-slate-400">
                Click the circle to mark correct
              </span>
            </div>
            <div className="space-y-2">
              {question.options.map((opt, i) => {
                const isCorrect = i === question.correctAnswer;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setField("correctAnswer", i)}
                      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 flex-shrink-0 transition-colors ${
                        isCorrect
                          ? "border-green-600 bg-green-600 text-white"
                          : "border-slate-300 hover:border-slate-400"
                      }`}
                      title={isCorrect ? "Correct answer" : "Mark as correct"}
                    >
                      {isCorrect && <CheckCircle className="h-3.5 w-3.5" />}
                    </button>
                    <span className="text-xs text-slate-400 w-4 tabular-nums">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => setOption(i, e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-800"
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    />
                    {question.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(i)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded flex-shrink-0"
                        title="Remove option"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {question.options.length < 6 && (
              <button
                type="button"
                onClick={addOption}
                className="mt-2 inline-flex items-center gap-1 text-xs text-blue-800 hover:text-blue-900"
              >
                <Plus className="h-3 w-3" />
                Add option
              </button>
            )}
          </div>

          {/* Explanation + points */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Explanation <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={question.explanation || ""}
                onChange={(e) => setField("explanation", e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-800"
                placeholder="Shown to students after they answer"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Points
              </label>
              <input
                type="number"
                min="1"
                value={question.points}
                onChange={(e) =>
                  setField("points", Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-800 tabular-nums"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SkeletonBar className="h-8 w-8 rounded-lg" />
        <div className="flex-1">
          <SkeletonBar className="h-5 w-48" />
          <SkeletonBar className="mt-2 h-3 w-64" />
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
        <SkeletonBar className="h-10 w-full" />
        <SkeletonBar className="h-10 w-full" />
        <div className="grid grid-cols-3 gap-4">
          <SkeletonBar className="h-10 w-full" />
          <SkeletonBar className="h-10 w-full" />
          <SkeletonBar className="h-10 w-full" />
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
        <SkeletonBar className="h-14 w-full" />
        <SkeletonBar className="h-14 w-full" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────
const EMPTY_QUESTION = () => ({
  id: crypto.randomUUID(),
  text: "",
  type: "multiple-choice",
  points: 10,
  options: ["", "", "", ""],
  correctAnswer: 0,
  explanation: "",
});

const EMPTY_QUIZ = (courseId) => ({
  title: "",
  description: "",
  passingScore: 70,
  timeLimit: 30,
  questions: [],
  isActive: true,
  isDraft: true,
  courseId,
});

export default function CreateQuiz() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [course, setCourse] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Track whether this is the first load or an edit
  const isNewRef = useRef(true);
  const savedQuizRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const mountedRef = useRef(true);

  // ── Load ─────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [courseDoc, quizDoc] = await Promise.all([
          getDoc(doc(db, "courses", courseId)),
          getDoc(doc(db, "courses", courseId, "quizzes", "main")),
        ]);

        if (!mountedRef.current) return;

        if (courseDoc.exists()) {
          setCourse({ id: courseDoc.id, ...courseDoc.data() });
        } else {
          setError("Course not found");
          setLoading(false);
          return;
        }

        if (quizDoc.exists()) {
          const data = quizDoc.data();
          setQuiz({ ...EMPTY_QUIZ(courseId), ...data });
          savedQuizRef.current = JSON.stringify(data);
          isNewRef.current = false;
        } else {
          setQuiz(EMPTY_QUIZ(courseId));
          isNewRef.current = true;
        }
      } catch (e) {
        console.error("CreateQuiz load error:", e);
        if (mountedRef.current) setError("Couldn't load the quiz.");
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }

    load();
    return () => {
      mountedRef.current = false;
    };
  }, [courseId]);

  // ── Autosave ─────────────────────────────────────────────
  const saveDraft = useCallback(
    async (quizData) => {
      if (!quizData || saving) return;
      try {
        setSaving(true);
        const payload = {
          ...quizData,
          totalPoints: quizData.questions.reduce(
            (sum, q) => sum + (q.points || 0),
            0
          ),
          questionCount: quizData.questions.length,
          updatedAt: new Date(),
        };
        if (isNewRef.current) {
          payload.createdAt = new Date();
          isNewRef.current = false;
        }
        await setDoc(
          doc(db, "courses", courseId, "quizzes", "main"),
          payload,
          { merge: true }
        );
        savedQuizRef.current = JSON.stringify(quizData);
        setLastSaved(new Date());
      } catch (e) {
        console.error("Autosave failed:", e);
      } finally {
        if (mountedRef.current) setSaving(false);
      }
    },
    [courseId, saving]
  );

  // Trigger autosave 1.5s after the last change
  useEffect(() => {
    if (!quiz || loading) return;
    const current = JSON.stringify(quiz);
    if (current === savedQuizRef.current) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveDraft(quiz);
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [quiz, loading, saveDraft]);

  // Warn on unload if there are unsaved changes
  useEffect(() => {
    const handler = (e) => {
      if (quiz && JSON.stringify(quiz) !== savedQuizRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [quiz]);

  // ── Handlers ─────────────────────────────────────────────
  const updateQuiz = (patch) => setQuiz((prev) => ({ ...prev, ...patch }));

  const updateQuestion = (index, next) => {
    setQuiz((prev) => {
      const questions = [...prev.questions];
      questions[index] = next;
      return { ...prev, questions };
    });
  };

  const addQuestion = () => {
    setQuiz((prev) => ({
      ...prev,
      questions: [...prev.questions, EMPTY_QUESTION()],
    }));
  };

  const deleteQuestion = (index) => {
    if (!window.confirm("Delete this question?")) return;
    setQuiz((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  const moveQuestion = (index, direction) => {
    setQuiz((prev) => {
      const questions = [...prev.questions];
      const target = index + direction;
      if (target < 0 || target >= questions.length) return prev;
      [questions[index], questions[target]] = [questions[target], questions[index]];
      return { ...prev, questions };
    });
  };

  const handlePublish = async () => {
    const errors = validateQuiz(quiz);
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("Fix the highlighted issues before publishing.");
      return;
    }

    try {
      setSaving(true);
      await setDoc(
        doc(db, "courses", courseId, "quizzes", "main"),
        {
          ...quiz,
          isDraft: false,
          updatedAt: new Date(),
          publishedAt: new Date(),
          totalPoints: quiz.questions.reduce((s, q) => s + (q.points || 0), 0),
          questionCount: quiz.questions.length,
        },
        { merge: true }
      );
      await setDoc(
        doc(db, "courses", courseId),
        { hasQuiz: true },
        { merge: true }
      );
      alert("Quiz published.");
      navigate("/admin/quizzes");
    } catch (e) {
      console.error("publish error:", e);
      setError("Failed to publish.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSaving(true);
      await deleteDoc(doc(db, "courses", courseId, "quizzes", "main"));
      await setDoc(
        doc(db, "courses", courseId),
        { hasQuiz: false },
        { merge: true }
      );
      alert("Quiz deleted.");
      navigate("/admin/quizzes");
    } catch (e) {
      console.error("delete error:", e);
      setError("Failed to delete.");
    } finally {
      setSaving(false);
    }
  };

  // ── Derived ──────────────────────────────────────────────
  const totalPoints = quiz?.questions.reduce((s, q) => s + (q.points || 0), 0) || 0;
  const isDraft = quiz?.isDraft !== false;

  // ── Render ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <PageSkeleton />
      </div>
    );
  }

  if (error && !quiz) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <AlertCircle className="mx-auto h-6 w-6 text-slate-400" />
          <p className="mt-3 text-sm text-slate-500">
            {error || "Could not load the quiz."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded flex-shrink-0 mt-0.5"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-slate-900 truncate">
              {isDraft ? "Create quiz" : "Edit quiz"}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 truncate">
              {course?.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {saving && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving…
            </span>
          )}
          {!saving && lastSaved && (
            <span className="hidden sm:inline text-xs text-slate-400">
              Saved
            </span>
          )}
          {!isDraft && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded border border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}
          <button
            onClick={handlePublish}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded bg-blue-800 text-white hover:bg-blue-900 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isDraft ? "Publish quiz" : "Save changes"}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="p-1 rounded hover:bg-red-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Quiz settings */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Quiz settings</h2>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Title
          </label>
          <input
            type="text"
            value={quiz.title}
            onChange={(e) => updateQuiz({ title: e.target.value })}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
              validationErrors.title
                ? "border-red-300 focus:border-red-500"
                : "border-slate-200 focus:border-blue-800"
            }`}
            placeholder="e.g. Final assessment"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Description <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            value={quiz.description}
            onChange={(e) => updateQuiz({ description: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-800 resize-y"
            placeholder="What does this quiz cover?"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Passing score (%)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={quiz.passingScore}
              onChange={(e) =>
                updateQuiz({
                  passingScore: Math.min(
                    100,
                    Math.max(1, parseInt(e.target.value, 10) || 1)
                  ),
                })
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-800 tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Time limit (min)
            </label>
            <input
              type="number"
              min="1"
              value={quiz.timeLimit}
              onChange={(e) =>
                updateQuiz({
                  timeLimit: Math.max(1, parseInt(e.target.value, 10) || 1),
                })
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-800 tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Status
            </label>
            <div className="flex items-center h-10 px-3 rounded-lg border border-slate-200 bg-slate-50">
              <span className="text-sm text-slate-600">
                {isDraft ? "Draft" : "Published"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Questions</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {quiz.questions.length}{" "}
              {quiz.questions.length === 1 ? "question" : "questions"} ·{" "}
              {totalPoints} {totalPoints === 1 ? "point" : "points"}
            </p>
          </div>
          <button
            onClick={addQuestion}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            Add question
          </button>
        </div>

        {validationErrors.questions && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {validationErrors.questions}
          </div>
        )}

        {quiz.questions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-12 text-center">
            <p className="text-sm text-slate-500">
              No questions yet. Add your first question to get started.
            </p>
            <button
              onClick={addQuestion}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded bg-blue-800 text-white hover:bg-blue-900"
            >
              <Plus className="h-4 w-4" />
              Add question
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {quiz.questions.map((q, i) => (
              <QuestionCard
                key={q.id || i}
                question={q}
                index={i}
                onUpdate={(next) => updateQuestion(i, next)}
                onDelete={() => deleteQuestion(i)}
                onMove={(dir) => moveQuestion(i, dir)}
                isFirst={i === 0}
                isLast={i === quiz.questions.length - 1}
              />
            ))}
          </div>
        )}

        {quiz.questions.length > 0 && (
          <button
            onClick={addQuestion}
            className="w-full rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500 hover:text-slate-900 hover:border-slate-400 transition-colors"
          >
            <Plus className="mx-auto h-4 w-4" />
          </button>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="bg-white rounded-lg border border-slate-200 max-w-sm w-full p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                Delete quiz
              </h3>
              <p className="mt-1.5 text-sm text-slate-500">
                This will permanently delete the quiz and all its results. This
                cannot be undone.
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 text-sm rounded border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// src/pages/quizdetails.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase/config";
import {
  doc, getDoc, collection, query, where, getDocs,
} from "firebase/firestore";
import {
  ArrowLeft, User, Mail, Calendar, Clock,
  CheckCircle, XCircle, Loader2, AlertCircle,
} from "lucide-react";
import { SkeletonBar, SkeletonCircle } from "../components/Skeletons";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function formatDate(value) {
  if (!value) return "—";
  const d = value.toDate ? value.toDate() : new Date(value);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(seconds) {
  if (typeof seconds !== "number" || seconds < 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

// ─────────────────────────────────────────────────────────────
// Stat tile
// ─────────────────────────────────────────────────────────────
function StatTile({ label, value, accent, sublabel }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-semibold ${accent || "text-slate-900"}`}>
        {value}
      </div>
      {sublabel && <div className="mt-1 text-xs text-slate-400">{sublabel}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Question breakdown
// ─────────────────────────────────────────────────────────────
function QuestionCard({ question, index, studentAnswer }) {
  const isCorrect = studentAnswer === question.correctAnswer;
  const points = question.points || 1;

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3 border-b border-slate-100">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium flex-shrink-0 ${
            isCorrect
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900">{question.text}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isCorrect ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <span className="text-xs text-slate-500 tabular-nums">
            {isCorrect ? points : 0}/{points}
          </span>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {question.options.map((option, oIndex) => {
          const isCorrectOption = oIndex === question.correctAnswer;
          const isStudentOption = oIndex === studentAnswer;
          const state = isCorrectOption
            ? "correct"
            : isStudentOption
            ? "wrong"
            : "neutral";

          const rowCls = {
            correct: "border-green-200 bg-green-50/50",
            wrong: "border-red-200 bg-red-50/50",
            neutral: "border-slate-200",
          }[state];

          const bubbleCls = {
            correct: "bg-green-600 text-white",
            wrong: "bg-red-600 text-white",
            neutral: "bg-slate-100 text-slate-600",
          }[state];

          return (
            <div
              key={oIndex}
              className={`flex items-center gap-3 rounded-lg border p-2.5 ${rowCls}`}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium flex-shrink-0 ${bubbleCls}`}
              >
                {String.fromCharCode(65 + oIndex)}
              </div>
              <span
                className={`flex-1 text-sm ${
                  isCorrectOption
                    ? "text-green-900"
                    : isStudentOption
                    ? "text-red-900"
                    : "text-slate-700"
                }`}
              >
                {option}
              </span>
              {isCorrectOption && (
                <span className="text-xs text-green-700 font-medium flex-shrink-0">
                  Correct
                </span>
              )}
              {!isCorrectOption && isStudentOption && (
                <span className="text-xs text-red-700 font-medium flex-shrink-0">
                  Student's answer
                </span>
              )}
            </div>
          );
        })}

        {question.explanation && (
          <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-600 leading-relaxed">
            <span className="font-medium text-slate-700">Explanation: </span>
            {question.explanation}
          </div>
        )}
      </div>
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
        <SkeletonCircle className="h-8 w-8" />
        <div className="flex-1">
          <SkeletonBar className="h-4 w-48" />
          <SkeletonBar className="mt-2 h-3 w-64" />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-4">
          <SkeletonCircle className="h-12 w-12" />
          <div className="flex-1 space-y-2">
            <SkeletonBar className="h-4 w-40" />
            <SkeletonBar className="h-3 w-56" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-5">
            <SkeletonBar className="h-3 w-24" />
            <SkeletonBar className="mt-3 h-7 w-16" />
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <SkeletonBar className="h-4 w-40" />
        </div>
        <div className="p-5 space-y-3">
          {[...Array(4)].map((_, i) => (
            <SkeletonBar key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────
export default function QuizDetails() {
  const { courseId, userId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [user, setUser] = useState(null);
  const [course, setCourse] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [selectedAttemptId, setSelectedAttemptId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        // Fetch everything in parallel
        const [userDoc, courseDoc, quizDoc, resultsSnap] = await Promise.all([
          getDoc(doc(db, "users", userId)),
          getDoc(doc(db, "courses", courseId)),
          getDoc(doc(db, "courses", courseId, "quizzes", "main")),
          getDocs(
            query(
              collection(db, "courses", courseId, "quizResults"),
              where("userId", "==", userId)
            )
          ),
        ]);

        if (cancelled) return;

        if (userDoc.exists()) {
          const data = userDoc.data();
          setUser({
            id: userDoc.id,
            ...data,
            name: data.fullName || data.email?.split("@")[0] || "Unknown",
          });
        }

        if (courseDoc.exists()) {
          setCourse({ id: courseDoc.id, ...courseDoc.data() });
        }

        if (quizDoc.exists()) {
          setQuiz({ id: quizDoc.id, ...quizDoc.data() });
        }

        const attemptList = resultsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const at = a.submittedAt?.toDate?.()?.getTime() || 0;
            const bt = b.submittedAt?.toDate?.()?.getTime() || 0;
            return bt - at;
          });

        setAttempts(attemptList);
        if (attemptList.length > 0) {
          setSelectedAttemptId(attemptList[0].id);
        }
      } catch (e) {
        console.error("quizDetails load error:", e);
        if (!cancelled) setError("Couldn't load quiz details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [courseId, userId]);

  // ── Derived ──────────────────────────────────────────────
  const selectedAttempt = attempts.find((a) => a.id === selectedAttemptId);
  const scores = attempts.map((a) => a.score || 0);
  const stats = attempts.length
    ? {
        latest: attempts[0].score || 0,
        highest: Math.max(...scores),
        average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        passedCount: attempts.filter((a) => a.isPassed).length,
      }
    : null;

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

  if (error || !user || !quiz) {
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
            {error || "No quiz attempts found for this student."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded flex-shrink-0 mt-0.5"
            title="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-slate-900 truncate">
              Quiz details
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 truncate">
              {course?.title} · {user.name}
            </p>
          </div>
        </div>
      </div>

      {/* Student info */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-800 text-white font-semibold flex-shrink-0">
            {(user.name || user.email || "U")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900 truncate">
              {user.name}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3" />
                <span className="truncate">{user.email}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Last attempt: {formatDate(attempts[0]?.submittedAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile
          label="Latest score"
          value={`${stats.latest}%`}
          accent={attempts[0]?.isPassed ? "text-green-700" : "text-red-600"}
          sublabel={attempts[0]?.isPassed ? "Passed" : "Failed"}
        />
        <StatTile
          label="Highest"
          value={`${stats.highest}%`}
          sublabel={`of ${attempts.length} ${attempts.length === 1 ? "attempt" : "attempts"}`}
        />
        <StatTile
          label="Average"
          value={`${stats.average}%`}
          sublabel={`${stats.passedCount} passed`}
        />
        <StatTile
          label="Passing score"
          value={`${quiz.passingScore || 70}%`}
          sublabel={`Time limit: ${quiz.timeLimit || "—"} min`}
        />
      </div>

      {/* Attempt history */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">
            Attempt history
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/60 border-b border-slate-100">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  #
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Submitted
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Score
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Time taken
                </th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((attempt, i) => {
                const isSelected = attempt.id === selectedAttemptId;
                return (
                  <tr
                    key={attempt.id}
                    onClick={() => setSelectedAttemptId(attempt.id)}
                    className={`cursor-pointer border-b border-slate-100 transition-colors ${
                      isSelected ? "bg-blue-50/50" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-slate-500 tabular-nums">
                      {attempts.length - i}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {formatDate(attempt.submittedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm font-medium tabular-nums ${
                          attempt.isPassed ? "text-green-700" : "text-red-600"
                        }`}
                      >
                        {attempt.score}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                          attempt.isPassed
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {attempt.isPassed ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {attempt.isPassed ? "Passed" : "Failed"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 inline-flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {formatTime(attempt.timeSpent)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Question breakdown */}
      {selectedAttempt && quiz.questions && (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Question breakdown
            </h2>
            <span className="text-xs text-slate-500">
              Attempt {attempts.length - attempts.findIndex((a) => a.id === selectedAttemptId)} ·{" "}
              {formatDate(selectedAttempt.submittedAt)}
            </span>
          </div>

          {quiz.questions.map((question, index) => {
            const answer = selectedAttempt.answers?.[index];
            return (
              <QuestionCard
                key={index}
                question={question}
                index={index}
                studentAnswer={answer}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
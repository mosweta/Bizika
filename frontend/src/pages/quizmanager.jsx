// src/pages/quizmanager.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/config";
import {
  collection, query, where, orderBy, limit, getDocs,
} from "firebase/firestore";
import {
  Search, Plus, Eye, Loader2, X, ChevronLeft,
  BookOpen, Users,
} from "lucide-react";
import {
  SkeletonCard, SkeletonBar, SkeletonCircle,
} from "../components/Skeletons";

// ─────────────────────────────────────────────────────────────
// Batched user fetch — Firestore `in` supports up to 30 IDs
// ─────────────────────────────────────────────────────────────
async function fetchUsersByIds(userIds) {
  if (userIds.length === 0) return new Map();
  const unique = Array.from(new Set(userIds));
  const chunks = [];
  for (let i = 0; i < unique.length; i += 30) {
    chunks.push(unique.slice(i, i + 30));
  }
  const snaps = await Promise.all(
    chunks.map((chunk) =>
      getDocs(query(collection(db, "users"), where("__name__", "in", chunk)))
    )
  );
  const map = new Map();
  snaps.forEach((s) => s.docs.forEach((d) => map.set(d.id, d.data())));
  return map;
}

// ─────────────────────────────────────────────────────────────
// Course card
// ─────────────────────────────────────────────────────────────
function CourseCard({ course, selected, onSelect, onAddQuiz }) {
  const hasQuiz = Boolean(course.hasQuiz);
  const enrolled = course.enrolledCount || 0;

  return (
    <div
      onClick={onSelect}
      className={`rounded-lg border bg-white p-4 cursor-pointer transition-colors ${
        selected
          ? "border-blue-800 ring-1 ring-blue-800"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-slate-900 truncate">
            {course.title}
          </h3>
          <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {enrolled} enrolled
            </span>
            <span className="inline-flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {course.lessonCount || 0} lessons
            </span>
          </div>
        </div>
        {hasQuiz && (
          <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-800 flex-shrink-0">
            Quiz
          </span>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100">
        {hasQuiz ? (
          <span className="text-xs text-blue-800 inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            Results shown below
          </span>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddQuiz();
            }}
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-blue-800 text-white hover:bg-blue-900"
          >
            <Plus className="h-3.5 w-3.5" />
            Add quiz
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Student result row
// ─────────────────────────────────────────────────────────────
function StudentRow({ row, courseId, onViewDetails }) {
  const status = row.quizResult
    ? row.quizResult.isPassed
      ? { label: "Passed", cls: "bg-green-50 text-green-700" }
      : { label: "Failed", cls: "bg-red-50 text-red-700" }
    : row.progress >= 70
    ? { label: "Eligible", cls: "bg-slate-100 text-slate-700" }
    : { label: "Not eligible", cls: "bg-slate-100 text-slate-500" };

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 text-slate-700 text-xs font-semibold">
            {(row.name || row.email || "U")[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm text-slate-900 truncate">{row.name}</div>
            <div className="text-xs text-slate-500 truncate">{row.email}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-800"
              style={{ width: `${row.progress}%` }}
            />
          </div>
          <span className="text-xs text-slate-600 tabular-nums">
            {row.progress}%
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-block text-xs px-2 py-0.5 rounded ${status.cls}`}>
          {status.label}
        </span>
      </td>
      <td className="px-4 py-3">
        {row.quizResult ? (
          <span className="text-sm font-medium text-slate-900 tabular-nums">
            {row.quizResult.score}%
          </span>
        ) : (
          <span className="text-sm text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600 tabular-nums">
        {row.quizResult?.attempts || 0}
      </td>
      <td className="px-4 py-3">
        {row.quizResult && (
          <button
            onClick={() => onViewDetails(courseId, row.userId)}
            className="text-xs px-2.5 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            View
          </button>
        )}
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────
// Course list skeleton
// ─────────────────────────────────────────────────────────────
function CourseListSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
          <SkeletonBar className="h-4 w-3/4" />
          <SkeletonBar className="mt-2 h-3 w-1/2" />
          <div className="mt-3 pt-3 border-t border-slate-100">
            <SkeletonBar className="h-6 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function StudentTableSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <table className="w-full">
        <tbody>
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <SkeletonCircle className="h-8 w-8" />
                  <div className="flex-1">
                    <SkeletonBar className="h-3.5 w-32" />
                    <SkeletonBar className="mt-1.5 h-3 w-40" />
                  </div>
                </div>
              </td>
              <td className="px-4 py-3"><SkeletonBar className="h-3 w-24" /></td>
              <td className="px-4 py-3"><SkeletonBar className="h-5 w-16" /></td>
              <td className="px-4 py-3"><SkeletonBar className="h-4 w-10" /></td>
              <td className="px-4 py-3"><SkeletonBar className="h-4 w-8" /></td>
              <td className="px-4 py-3"><SkeletonBar className="h-6 w-12" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────
export default function QuizManager() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [students, setStudents] = useState(null);

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim().toLowerCase()), 150);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Load courses once
  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(
          query(collection(db, "courses"), orderBy("createdAt", "desc"), limit(50))
        );
        setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("loadCourses error:", e);
        setCourses([]);
      }
    }
    load();
  }, []);

  // Load students for the selected course — 3 + N/30 queries total
  const loadStudents = useCallback(async (courseId) => {
    setStudents(null);
    try {
      const course = courses?.find((c) => c.id === courseId);

      // 1. All enrollments for this course
      const enrollSnap = await getDocs(
        query(collection(db, "enrollments"), where("courseId", "==", courseId))
      );
      const enrollments = enrollSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // 2. All users in one batched call
      const usersMap = await fetchUsersByIds(enrollments.map((e) => e.userId));

      // 3. All quiz results for this course
      let resultsMap = new Map();
      if (course?.hasQuiz) {
        const resultsSnap = await getDocs(
          collection(db, "courses", courseId, "quizResults")
        );
        resultsSnap.docs.forEach((d) => {
          const data = d.data();
          if (!data.userId) return;
          const existing = resultsMap.get(data.userId);
          // Keep the highest-scoring / most recent attempt
          if (!existing || (data.score || 0) > (existing.score || 0)) {
            resultsMap.set(data.userId, data);
          }
        });
      }

      // 4. Join in memory
      const rows = enrollments.map((e) => {
        const userData = usersMap.get(e.userId) || {};
        return {
          userId: e.userId,
          name: userData.fullName || userData.email?.split("@")[0] || "Unknown",
          email: userData.email || "",
          progress: e.progress || 0,
          completedLessons: e.completedLessons?.length || 0,
          quizResult: resultsMap.get(e.userId) || null,
        };
      });

      setStudents(rows);
    } catch (e) {
      console.error("loadStudents error:", e);
      setStudents([]);
    }
  }, [courses]);

  const handleSelectCourse = (course) => {
    setSelectedCourse(course.id);
    setSearchInput("");
    setSearchQuery("");
    loadStudents(course.id);
  };

  const handleBack = () => {
    setSelectedCourse(null);
    setStudents(null);
  };

  const selectedCourseData = courses?.find((c) => c.id === selectedCourse);

  const visibleStudents = searchQuery && students
    ? students.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery) ||
          s.email.toLowerCase().includes(searchQuery)
      )
    : students;

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Quiz manager</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {selectedCourse
              ? `Viewing results for ${selectedCourseData?.title || ""}`
              : "Select a course to view quiz results"}
          </p>
        </div>
        {selectedCourse && (
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to courses
          </button>
        )}
      </div>

      {/* Courses or student results */}
      {!selectedCourse ? (
        <>
          {!courses ? (
            <CourseListSkeleton />
          ) : courses.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-12 text-center">
              <BookOpen className="mx-auto h-6 w-6 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">
                No courses yet. Create a course before adding a quiz.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  selected={false}
                  onSelect={() => handleSelectCourse(course)}
                  onAddQuiz={() => navigate(`/admin/create-quiz/${course.id}`)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Search */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Filter students…"
                className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-800"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          {!students ? (
            <StudentTableSkeleton />
          ) : visibleStudents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-12 text-center">
              <Users className="mx-auto h-6 w-6 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">
                {searchQuery ? "No students match this filter." : "No students enrolled yet."}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/60 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Student
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Progress
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Score
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Attempts
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStudents.map((row) => (
                      <StudentRow
                        key={row.userId}
                        row={row}
                        courseId={selectedCourse}
                        onViewDetails={(cid, uid) =>
                          navigate(`/admin/quiz-details/${cid}/${uid}`)
                        }
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
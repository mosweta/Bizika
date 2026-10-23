// src/pages/student.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../firebase/config";
import { signOut } from "firebase/auth";
import { SkeletonBar } from "../components/Skeletons";
import {
  collection, query, where, getDocs, getDoc, doc,
} from "firebase/firestore";
import { BookOpen, ChevronRight, LogOut, Loader2 } from "lucide-react";
import {
  computeCourseProgress, formatHours, progressCta,
} from "../utils/courseProgress";

// ─────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────
function StatCard({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Course card
// ─────────────────────────────────────────────────────────────
function CourseCard({ course, onOpen }) {
  const cta = progressCta(course.progress);
  const hasThumb = Boolean(course.thumbnailUrl);

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden flex flex-col">
      {/* Thumbnail */}
      {hasThumb ? (
        <div className="aspect-video bg-slate-100">
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="aspect-video bg-slate-50 flex items-center justify-center border-b border-slate-100">
          <BookOpen className="h-8 w-8 text-slate-300" />
        </div>
      )}

      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-base font-semibold text-slate-900 line-clamp-2">
          {course.title}
        </h3>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span>
              {course.completedActive} of {course.activeLessons.length}{" "}
              {course.activeLessons.length === 1 ? "lesson" : "lessons"}
            </span>
            <span className="font-medium text-slate-700">{course.progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                course.progress === 100 ? "bg-green-600" : "bg-blue-800"
              }`}
              style={{ width: `${course.progress}%` }}
            />
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400 truncate">
            {course.lastAccessedLabel}
          </span>
          <button
            onClick={() => onOpen(course.id)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-800 px-4 py-2 text-xs font-medium text-white hover:bg-blue-900 transition-colors flex-shrink-0"
          >
            {cta} <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Empty states
// ─────────────────────────────────────────────────────────────
function EmptyState({ variant, onBrowse }) {
  if (variant === "all-complete") {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
          <BookOpen className="h-5 w-5 text-green-700" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900">
          You've completed everything.
        </h3>
        <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
          Nice work. When you're ready, browse the catalog for something new.
        </p>
        <button
          onClick={onBrowse}
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-300"
        >
          Browse courses
        </button>
      </div>
    );
  }

  // variant === "no-enrollments"
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white border border-slate-200">
        <BookOpen className="h-5 w-5 text-slate-400" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">
        No courses yet
      </h3>
      <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
        You haven't enrolled in any courses. Browse the catalog to get started.
      </p>
      <button
        onClick={onBrowse}
        className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-900"
      >
        Browse courses <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) return navigate("/login");
      setUser(u);
      await loadDashboard(u.uid);
    });
    return () => unsub();
  }, [navigate]);

  const loadDashboard = async (userId) => {
    try {
      setLoading(true);

      // Profile
      const userSnap = await getDoc(doc(db, "users", userId));
      if (userSnap.exists()) setProfile(userSnap.data());

      // Enrollments
      const enrSnap = await getDocs(
        query(collection(db, "enrollments"), where("userId", "==", userId))
      );
      const enrollments = enrSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // For each enrollment, fetch course + lessons, compute progress
      const rows = await Promise.all(
        enrollments.map(async (enr) => {
          const courseSnap = await getDoc(doc(db, "courses", enr.courseId));
          if (!courseSnap.exists()) return null;

          const lessonsSnap = await getDocs(
            collection(db, "courses", enr.courseId, "lessons")
          );
          const allLessons = lessonsSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));

          const stats = computeCourseProgress(enr, allLessons);
          const course = { id: courseSnap.id, ...courseSnap.data() };

          return {
            id: course.id,
            title: course.title,
            thumbnailUrl: course.thumbnailUrl,
            // from progress util
            ...stats,
            lastAccessed: enr.lastAccessed,
          };
        })
      );

      setCourses(rows.filter(Boolean));
    } catch (e) {
      console.error("student dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  // ── Derived ────────────────────────────────────────────────
  const totalEnrolled = courses.length;
  const totalCompletedLessons = courses.reduce(
    (sum, c) => sum + c.completedTotal,
    0
  );
  const totalLearningMinutes = courses.reduce(
    (sum, c) => sum + c.learningMinutes,
    0
  );
  const coursesFinished = courses.filter((c) => c.isComplete).length;

  const allComplete =
    courses.length > 0 && courses.every((c) => c.isComplete);

  const firstName =
    profile?.firstName ||
    profile?.fullName?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";

  // ── Render ─────────────────────────────────────────────────
if (loading) {
  return (
    <div className="space-y-8">
      {/* Welcome skeleton */}
      <div>
        <SkeletonBar className="h-7 w-64" />
        <SkeletonBar className="mt-3 h-4 w-96" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-5">
            <SkeletonBar className="h-3 w-24" />
            <SkeletonBar className="mt-3 h-7 w-16" />
          </div>
        ))}
      </div>

      {/* Course grid skeleton */}
      <div>
        <SkeletonBar className="h-6 w-32 mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <div className="aspect-video bg-slate-100 animate-pulse" />
              <div className="p-5 space-y-3">
                <SkeletonBar className="h-4 w-3/4" />
                <SkeletonBar className="h-3 w-1/2" />
                <SkeletonBar className="h-1.5 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-800">
                <BookOpen className="h-5 w-5 text-white" />
              </span>
              <span className="text-lg font-semibold tracking-tight">
                Bizika LMS
              </span>
            </Link>

            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-slate-900">
                  {profile?.fullName || user?.email?.split("@")[0]}
                </p>
                <p className="text-xs text-slate-500 truncate max-w-[180px]">
                  {user?.email}
                </p>
              </div>
              <div className="h-9 w-9 rounded-full bg-blue-800 flex items-center justify-center text-white text-xs font-semibold">
                {(user?.email || "S")[0].toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Welcome */}
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Welcome back, {firstName}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {courses.length === 0
              ? "Let's get you started with your first course."
              : allComplete
              ? "You've completed every course you're enrolled in."
              : `You're enrolled in ${totalEnrolled} ${
                  totalEnrolled === 1 ? "course" : "courses"
                }.`}
          </p>
        </header>

        {/* Stats */}
        {courses.length > 0 && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <StatCard label="Enrolled" value={totalEnrolled} />
            <StatCard label="Lessons complete" value={totalCompletedLessons} />
            <StatCard
              label="Learning time"
              value={formatHours(totalLearningMinutes)}
            />
            <StatCard label="Courses finished" value={coursesFinished} />
          </section>
        )}

        {/* Courses */}
        <section>
          <div className="flex items-end justify-between mb-5">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              My courses
            </h2>
            {courses.length > 0 && (
              <button
                onClick={() => navigate("/courses")}
                className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-blue-800 hover:text-blue-900"
              >
                Browse all <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {courses.length === 0 ? (
            <EmptyState
              variant="no-enrollments"
              onBrowse={() => navigate("/courses")}
            />
          ) : allComplete ? (
            <EmptyState
              variant="all-complete"
              onBrowse={() => navigate("/courses")}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={{
                    ...course,
                    lastAccessedLabel: course.lastAccessed
                      ? "Recently accessed"
                      : "Not started",
                  }}
                  onOpen={(id) => navigate(`/course/${id}`)}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
// src/pages/home/home.jsx
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db } from "../../firebase/config";
import {
  doc, getDoc, collection, query, where, getDocs, limit,
  addDoc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import {
  ArrowRight, BookOpen, Clock, Users, CheckCircle,
  ChevronRight, Menu, X, ChevronDown, LogOut, Home as HomeIcon,
  BookMarked, PlayCircle, Award, TrendingUp,
} from "lucide-react";
import Footer from "./footer";

export default function Home() {
  const [courses, setCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loadingEnrolled, setLoadingEnrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) fetchUserEnrolledCourses(currentUser.uid);
      else setEnrolledCourses([]);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    fetchFeaturedCourses();
  }, []);

  const fetchFeaturedCourses = async () => {
    try {
      const q = query(
        collection(db, "courses"),
        where("published", "==", true),
        limit(6)
      );
      const snap = await getDocs(q);
      setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching featured courses:", err);
    }
  };

  const fetchUserEnrolledCourses = async (userId) => {
    setLoadingEnrolled(true);
    try {
      const q = query(
        collection(db, "enrollments"),
        where("userId", "==", userId),
        where("status", "==", "active")
      );
      const snap = await getDocs(q);
      const courseIds = snap.docs.map((d) => d.data().courseId);
      const courses = await Promise.all(
        courseIds.map(async (courseId) => {
          const courseDoc = await getDoc(doc(db, "courses", courseId));
          if (!courseDoc.exists()) return null;
          const enrollmentDoc = snap.docs.find((d) => d.data().courseId === courseId);
          const enrollmentData = enrollmentDoc.data();
          return {
            id: courseId,
            ...courseDoc.data(),
            progress: enrollmentData.progress || 0,
            lastAccessed: enrollmentData.lastAccessed,
          };
        })
      );
      setEnrolledCourses(courses.filter(Boolean));
    } catch (err) {
      console.error("Error fetching enrolled courses:", err);
    } finally {
      setLoadingEnrolled(false);
    }
  };

  const handleEnroll = async (courseId) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return navigate("/login", { state: { redirectTo: `/course/${courseId}` } });
    try {
      const existing = await getDocs(
        query(
          collection(db, "enrollments"),
          where("userId", "==", currentUser.uid),
          where("courseId", "==", courseId)
        )
      );
      if (!existing.empty) return navigate(`/course/${courseId}`);

      await addDoc(collection(db, "enrollments"), {
        userId: currentUser.uid,
        courseId,
        enrolledAt: serverTimestamp(),
        progress: 0,
        completedLessons: [],
        status: "active",
        lastAccessed: serverTimestamp(),
      });
      const courseRef = doc(db, "courses", courseId);
      const courseDoc = await getDoc(courseRef);
      await updateDoc(courseRef, {
        enrolledCount: (courseDoc.data()?.enrolledCount || 0) + 1,
        updatedAt: serverTimestamp(),
      });
      navigate(`/course/${courseId}`);
    } catch (err) {
      console.error("Enroll error:", err);
      alert("Failed to enroll. Please try again.");
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    setMobileMenuOpen(false);
    navigate("/");
  };

  const goToDashboard = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return navigate("/login");
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (!userDoc.exists()) return navigate("/login");
    const role = userDoc.data().role?.toLowerCase() || "student";
    navigate(role === "admin" ? "/admin/dashboard" : "/student/dashboard");
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return "Recently";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffMs = Date.now() - date;
    const m = Math.floor(diffMs / 60000);
    const h = Math.floor(diffMs / 3600000);
    const d = Math.floor(diffMs / 86400000);
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (d < 7) return `${d}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // ==================== COMPONENTS ====================
  const CourseCard = ({ course }) => (
    <Link
      to={`/course-details/${course.id}`}
      className="group flex flex-col rounded-lg border border-slate-200 bg-white overflow-hidden hover:border-slate-300 transition-colors"
    >
      <div className="aspect-video bg-slate-100 relative overflow-hidden">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <BookOpen className="h-12 w-12" />
          </div>
        )}
        {course.isFree || course.price === 0 ? (
          <span className="absolute top-3 left-3 rounded bg-white/95 px-2 py-0.5 text-xs font-medium text-slate-700">
            Free
          </span>
        ) : null}
      </div>
      <div className="flex flex-col flex-1 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-blue-800">
          {course.category || "Course"}
        </p>
        <h3 className="mt-2 text-base font-semibold text-slate-900 line-clamp-2 group-hover:text-blue-800 transition-colors">
          {course.title}
        </h3>
        <p className="mt-2 text-sm text-slate-500 line-clamp-2">
          {course.shortDescription || course.description?.substring(0, 100)}
        </p>
        <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {course.lessonCount || 0} lessons
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {course.duration || "Self-paced"}
          </span>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Users className="h-3.5 w-3.5" />
            {course.enrolledCount || 0}
          </span>
          <span className="text-sm font-medium text-blue-800 group-hover:underline">
            View course →
          </span>
        </div>
      </div>
    </Link>
  );

  const EnrolledCourseCard = ({ course }) => (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden flex flex-col">
      <div className="aspect-video bg-slate-100 relative">
        {course.thumbnailUrl ? (
          <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <BookOpen className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">
          {course.title}
        </h3>
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span>{Math.round(course.progress || 0)}% complete</span>
            <span>{formatRelativeTime(course.lastAccessed)}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-600"
              style={{ width: `${course.progress || 0}%` }}
            />
          </div>
        </div>
        <button
          onClick={() => navigate(`/course/${course.id}`)}
          className="mt-4 inline-flex items-center gap-1 rounded-lg bg-green-700 px-3 py-2 text-xs font-medium text-white hover:bg-green-800 self-start transition-colors"
        >
          Resume <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );

  const ProductPreview = () => (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <div className="ml-3 h-5 flex-1 rounded-sm bg-white border border-slate-200" />
      </div>
      <div className="flex">
        <div className="hidden sm:block w-32 border-r border-slate-200 bg-slate-50/60 p-3 space-y-2">
          <div className="h-2 w-16 rounded bg-slate-200" />
          <div className="h-2 w-20 rounded bg-blue-800/30" />
          <div className="h-2 w-14 rounded bg-slate-200" />
          <div className="h-2 w-20 rounded bg-slate-200" />
          <div className="h-2 w-16 rounded bg-slate-200" />
        </div>
        <div className="flex-1 p-4">
          <div className="flex items-center justify-between">
            <div className="h-3 w-24 rounded bg-slate-200" />
            <div className="h-3 w-10 rounded bg-blue-800" />
          </div>
          <div className="mt-3 h-1.5 w-full rounded bg-slate-100 overflow-hidden">
            <div className="h-full w-2/3 rounded bg-green-600" />
          </div>
          <div className="mt-4 space-y-2.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle className={`h-4 w-4 ${i < 2 ? "text-green-600" : "text-slate-200"}`} />
                <div className={`h-2.5 rounded ${i < 2 ? "w-40 bg-slate-300" : "w-32 bg-slate-200"}`} />
              </div>
            ))}
          </div>
          <div className="mt-4 aspect-video rounded border border-slate-200 bg-slate-50 flex items-center justify-center">
            <PlayCircle className="h-8 w-8 text-blue-800" />
          </div>
        </div>
      </div>
    </div>
  );

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-800">
                <BookOpen className="h-5 w-5 text-white" />
              </span>
              <span className="text-lg font-semibold tracking-tight">Bizika LMS</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <a href="#courses" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Courses
              </a>
              <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Why Bizika
              </a>

              {user ? (
                <div className="relative group">
                  <button className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <span className="h-8 w-8 rounded-full bg-blue-800 text-white text-xs font-semibold flex items-center justify-center">
                      {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                    </span>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </button>
                  <div className="absolute right-0 mt-2 w-52 origin-top-right rounded-lg border border-slate-200 bg-white opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <button
                      onClick={goToDashboard}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-t-lg"
                    >
                      <HomeIcon className="h-4 w-4" /> Dashboard
                    </button>
                    <Link
                      to="/courses"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <BookMarked className="h-4 w-4" /> Browse courses
                    </Link>
                    <div className="border-t border-slate-100" />
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate("/login")}
                    className="text-sm font-medium text-slate-700 hover:text-slate-900"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => navigate("/signup")}
                    className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 transition-colors"
                  >
                    Get started
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-700"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 md:hidden">
            <div className="px-4 py-4 space-y-1">
              <a
                href="#courses"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
              >
                Courses
              </a>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
              >
                Why Bizika
              </a>
              {user ? (
                <>
                  <button
                    onClick={() => {
                      goToDashboard();
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <button
                    onClick={() => {
                      navigate("/login");
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => {
                      navigate("/signup");
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full rounded-lg bg-blue-800 px-3 py-2 text-sm font-medium text-white"
                  >
                    Get started
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            <div className="lg:col-span-6">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                New: Reading lessons with rich content
              </span>
              <h1 className="mt-5 text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1]">
                Learn practical skills,
                <br />
                at your own pace.
              </h1>
              <p className="mt-5 text-base md:text-lg text-slate-600 leading-relaxed max-w-lg">
                Bizika LMS is a focused learning platform for professionals. Short
                lessons, real projects, and progress you can see.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                {user ? (
                  <button
                    onClick={goToDashboard}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-800 px-6 py-3 text-sm font-medium text-white hover:bg-blue-900 transition-colors"
                  >
                    Go to dashboard <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => navigate("/signup")}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-800 px-6 py-3 text-sm font-medium text-white hover:bg-blue-900 transition-colors"
                  >
                    Start learning free <ArrowRight className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() =>
                    document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 hover:border-slate-300 transition-colors"
                >
                  Browse courses
                </button>
              </div>

              <div className="mt-8 flex items-center gap-6 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Free to start
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Self-paced
                </span>
                <span className="hidden sm:flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Certificate on completion
                </span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <ProductPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Continue Learning */}
      {user && enrolledCourses.length > 0 && (
        <section className="border-b border-slate-200 bg-slate-50/60">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-14">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Continue learning</h2>
                <p className="mt-1 text-sm text-slate-500">Pick up where you left off</p>
              </div>
              <button
                onClick={goToDashboard}
                className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-blue-800 hover:text-blue-900"
              >
                All courses <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {loadingEnrolled ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-lg border border-slate-200 bg-white h-64 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrolledCourses.slice(0, 3).map((course) => (
                  <EnrolledCourseCard key={course.id} course={course} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Featured Courses */}
      <section id="courses" className="border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="max-w-2xl mb-10">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Courses</h2>
            <p className="mt-3 text-base text-slate-600">
              Practical, focused lessons designed for busy professionals.
            </p>
          </div>

          {courses.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-12 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-slate-400" />
              <h3 className="mt-4 text-base font-medium">No courses yet</h3>
              <p className="mt-1 text-sm text-slate-500">
                New courses are being added regularly. Check back soon.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
              <div className="mt-10">
                <button
                  onClick={() => navigate("/courses")}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-300"
                >
                  Browse all courses <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Why Bizika */}
      <section id="features" className="border-b border-slate-200 bg-slate-50/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Why Bizika</h2>
            <p className="mt-3 text-base text-slate-600">
              Built for people who want to learn without the noise.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { icon: PlayCircle, title: "Video and reading lessons", body: "Switch between formats to match how you learn best." },
              { icon: TrendingUp, title: "Clear progress tracking", body: "See exactly what you've completed and what's next." },
              { icon: Award, title: "Certificates on completion", body: "Finish a course and get a verifiable certificate." },
            ].map((f) => (
              <div key={f.title}>
                <f.icon className="h-5 w-5 text-blue-800" />
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-800 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              {user ? "Ready to keep going?" : "Start your first course today."}
            </h2>
            <p className="mt-3 text-base text-blue-100 leading-relaxed">
              {user
                ? "Your dashboard has everything waiting for you."
                : "Create a free account and start learning in under a minute."}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              {user ? (
                <button
                  onClick={goToDashboard}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-blue-800 hover:bg-slate-100"
                >
                  Go to dashboard <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate("/signup")}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-blue-800 hover:bg-slate-100"
                  >
                    Create free account <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigate("/login")}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-700 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
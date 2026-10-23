// src/pages/catalog.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/config";
import {
  collection, query, where, getDocs, doc, getDoc,
  serverTimestamp, addDoc, updateDoc,
} from "firebase/firestore";
import {
  BookOpen, Clock, Users, ChevronRight, ArrowLeft, CheckCircle,
} from "lucide-react";

export default function CourseCatalog() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [user, setUser] = useState(null);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchEnrolledCourses(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [categoryFilter, levelFilter]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, "courses"), where("published", "==", true));
      const snapshot = await getDocs(q);
      let data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (categoryFilter !== "all") data = data.filter((c) => c.category === categoryFilter);
      if (levelFilter !== "all") data = data.filter((c) => c.level === levelFilter);
      setCourses(data);
    } catch (err) {
      console.error("Error fetching courses:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrolledCourses = async (userId) => {
    try {
      const q = query(collection(db, "enrollments"), where("userId", "==", userId));
      const snap = await getDocs(q);
      setEnrolledCourseIds(snap.docs.map((d) => d.data().courseId));
    } catch (err) {
      console.error("Error fetching enrollments:", err);
    }
  };

  const enrollInCourse = async (courseId) => {
    if (!user) return navigate("/login");
    if (enrolledCourseIds.includes(courseId)) return navigate(`/course/${courseId}`);

    try {
      await auth.currentUser.getIdToken(true);
      await addDoc(collection(db, "enrollments"), {
        userId: user.uid,
        courseId,
        enrolledAt: serverTimestamp(),
        progress: 0,
        completedLessons: [],
        status: "active",
      });
      await new Promise((r) => setTimeout(r, 400));
      const verify = await getDocs(
        query(
          collection(db, "enrollments"),
          where("userId", "==", user.uid),
          where("courseId", "==", courseId)
        )
      );
      if (verify.empty) return alert("Failed to enroll. Please try again.");
      setEnrolledCourseIds((prev) => [...prev, courseId]);
      navigate(`/course/${courseId}`);
    } catch (err) {
      console.error("Enrollment error:", err);
      alert("Failed to enroll. Please try again.");
    }
  };

  const CourseCard = ({ course }) => {
    const isEnrolled = enrolledCourseIds.includes(course.id);
    const isFree = course.isFree !== false && course.price === 0;

    return (
      <div className="group rounded-lg border border-slate-200 bg-white overflow-hidden hover:border-slate-300 transition-colors">
        <div
          onClick={() => navigate(`/course-details/${course.id}`)}
          className="cursor-pointer"
        >
          <div className="aspect-video bg-slate-100 relative overflow-hidden">
            {course.thumbnailUrl ? (
              <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <BookOpen className="h-12 w-12" />
              </div>
            )}
            {isFree && (
              <span className="absolute top-3 left-3 rounded bg-white/95 px-2 py-0.5 text-xs font-medium text-slate-700">
                Free
              </span>
            )}
          </div>

          <div className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-800">
              {course.category || "Course"}
            </p>
            <h3 className="mt-2 text-base font-semibold text-slate-900 line-clamp-2 group-hover:text-blue-800 transition-colors">
              {course.title}
            </h3>
            <p className="mt-2 text-sm text-slate-500 line-clamp-2">
              {course.shortDescription || course.description?.substring(0, 120)}
            </p>

            <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {course.duration || "Self-paced"}
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" />
                {course.lessonCount || 0} lessons
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {course.enrolledCount || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5">
          <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-900">
              {isFree ? "Free" : `$${course.price || 0}`}
            </span>
            <button
              onClick={() =>
                isEnrolled ? navigate(`/course/${course.id}`) : enrollInCourse(course.id)
              }
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isEnrolled
                  ? "bg-green-700 text-white hover:bg-green-800"
                  : "bg-blue-800 text-white hover:bg-blue-900"
              }`}
            >
              {isEnrolled ? (
                <>
                  <CheckCircle className="h-3.5 w-3.5" />
                  Continue
                </>
              ) : (
                <>
                  Enroll
                  <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="text-base font-semibold tracking-tight">Bizika LMS</div>
          </div>
        </div>
      </nav>

      {/* Header — royal blue band */}
      <section className="bg-blue-800 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Courses
          </h1>
          <p className="mt-3 text-base text-blue-100 max-w-2xl">
            Browse every course on Bizika LMS. Filter by category and level to find
            what fits you.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-800"
              >
                <option value="all">All categories</option>
                <option value="business">Business</option>
                <option value="technology">Technology</option>
                <option value="marketing">Marketing</option>
                <option value="finance">Finance</option>
                <option value="leadership">Leadership</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5">
                Level
              </label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-800"
              >
                <option value="all">All levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-slate-500">
            {courses.length} {courses.length === 1 ? "course" : "courses"}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-white h-80 animate-pulse" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-12 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-slate-400" />
            <h3 className="mt-4 text-base font-medium">No courses found</h3>
            <p className="mt-1 text-sm text-slate-500">
              Try a different filter, or check back soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
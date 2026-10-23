// src/pages/coursehome.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/config";
import {
  doc, getDoc, collection, getDocs, query, orderBy, where,
  onSnapshot, addDoc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import {
  BookOpen, Clock, Users, CheckCircle, Circle,
  ChevronDown, ChevronRight, Play, FileText,
  Loader2, Download, AlertCircle,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Progress ring
// ─────────────────────────────────────────────────────────────
function ProgressRing({ value }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative flex-shrink-0">
      <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
        <circle
          cx="36" cy="36" r={r} strokeWidth="6"
          stroke="currentColor" className="text-blue-700"
          fill="transparent"
        />
        <circle
          cx="36" cy="36" r={r} strokeWidth="6"
          stroke="currentColor"
          className="text-white transition-all duration-500"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white">
        {value}%
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────────────────────
function CourseHero({ course, lessonsCount, progress, nextLesson, courseId, enrollment, onEnroll, navigate }) {
  const cta = enrollment
    ? progress === 0
      ? "Start course"
      : progress === 100
      ? "Review course"
      : "Continue learning"
    : "Enroll now";

  const handleCta = () => {
    if (!enrollment) return onEnroll();
    if (nextLesson) navigate(`/course/${courseId}/lesson/${nextLesson.id}`);
  };

  return (
    <section className="bg-blue-800 text-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
          {/* Left: title + meta */}
          <div className="lg:col-span-8">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-blue-700 px-2.5 py-1 text-blue-100">
                {course?.category || "Course"}
              </span>
              {course?.level && (
                <span className="rounded-full border border-blue-700 px-2.5 py-1 text-blue-100 capitalize">
                  {course.level}
                </span>
              )}
            </div>

            <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
              {course?.title}
            </h1>

            {course?.description && (
              <p className="mt-3 text-base text-blue-100 max-w-2xl leading-relaxed line-clamp-2">
                {course.description}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-blue-100">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {course?.duration || "Self-paced"}
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                {lessonsCount} {lessonsCount === 1 ? "lesson" : "lessons"}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {course?.enrolledCount || 0} enrolled
              </span>
            </div>
          </div>

          {/* Right: progress + CTA */}
          <div className="lg:col-span-4">
            <div className="rounded-lg border border-blue-700 bg-blue-900/40 p-5">
              {enrollment ? (
                <>
                  <div className="flex items-center gap-4">
                    <ProgressRing value={progress} />
                    <div>
                      <div className="text-sm text-blue-100">Course progress</div>
                      <div className="mt-0.5 text-lg font-semibold">
                        {progress}% complete
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleCta}
                    className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-blue-800 hover:bg-slate-100 transition-colors"
                  >
                    <Play className="h-4 w-4" />
                    {cta}
                  </button>

                  {nextLesson && progress > 0 && progress < 100 && (
                    <p className="mt-2 text-xs text-blue-200 truncate">
                      Next: {nextLesson.title}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="text-sm text-blue-100">
                    {lessonsCount} lessons · {course?.duration || "self-paced"}
                  </div>
                  <div className="mt-1 text-lg font-semibold">
                    Ready when you are
                  </div>

                  <button
                    onClick={handleCta}
                    className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-blue-800 hover:bg-slate-100 transition-colors"
                  >
                    <Play className="h-4 w-4" />
                    {cta}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Curriculum
// ─────────────────────────────────────────────────────────────
function CurriculumCard({ modules, lessons, enrollment, courseId, navigate }) {
  const [open, setOpen] = useState({});
  const completed = new Set(enrollment?.completedLessons || []);

  // Auto-expand the first module containing an incomplete lesson
  useEffect(() => {
    const nextModule = modules.find((m) =>
      lessons
        .filter((l) => l.moduleId === m.id)
        .some((l) => !completed.has(l.id))
    );
    if (nextModule) setOpen({ [nextModule.id]: true });
  }, [modules, lessons, enrollment]);

  const getLessonsIn = (moduleId) =>
    lessons
      .filter((l) =>
        moduleId === "ungrouped" ? !l.moduleId : l.moduleId === moduleId
      )
      .sort((a, b) => (a.order || 0) - (b.order || 0));

  const renderLesson = (lesson, index) => {
    const done = completed.has(lesson.id);
    const isNext = !done && index === 0;

    return (
      <button
        key={lesson.id}
        onClick={() => navigate(`/course/${courseId}/lesson/${lesson.id}`)}
        className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
      >
        {done ? (
          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
        ) : isNext ? (
          <Circle className="h-4 w-4 text-blue-800 fill-blue-800 flex-shrink-0" />
        ) : (
          <Circle className="h-4 w-4 text-slate-300 flex-shrink-0" />
        )}

        <span
          className={`flex-1 text-sm truncate ${
            done ? "text-slate-500 line-through" : "text-slate-900"
          }`}
        >
          {lesson.title}
        </span>

        {lesson.videoUrl ? (
          <Play className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
        ) : (
          <FileText className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
        )}

        <span className="text-xs text-slate-400 w-16 text-right flex-shrink-0">
          {lesson.duration || ""}
        </span>
      </button>
    );
  };

  const ungrouped = getLessonsIn("ungrouped");

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold tracking-tight">
          Course content
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {modules.length} {modules.length === 1 ? "module" : "modules"} ·{" "}
          {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}
        </p>
      </div>

      {modules.map((module) => {
        const list = getLessonsIn(module.id);
        if (list.length === 0) return null;
        const doneCount = list.filter((l) => completed.has(l.id)).length;
        const isOpen = !!open[module.id];

        return (
          <div key={module.id} className="border-b border-slate-100 last:border-0">
            <button
              onClick={() =>
                setOpen((p) => ({ ...p, [module.id]: !p[module.id] }))
              }
              className="w-full flex items-center justify-between px-5 py-3 bg-slate-50/60 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                )}
                <span className="text-sm font-medium truncate">
                  {module.title}
                </span>
              </div>
              <span className="text-xs text-slate-500 flex-shrink-0">
                {doneCount}/{list.length}
              </span>
            </button>

            {isOpen && <div>{list.map(renderLesson)}</div>}
          </div>
        );
      })}

      {ungrouped.length > 0 && (
        <div>
          <div className="px-5 py-3 bg-slate-50/60">
            <span className="text-sm font-medium">Additional lessons</span>
          </div>
          {ungrouped.map(renderLesson)}
        </div>
      )}

      {modules.length === 0 && ungrouped.length === 0 && (
        <div className="px-5 py-10 text-center">
          <BookOpen className="mx-auto h-6 w-6 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            No lessons published yet.
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Resources
// ─────────────────────────────────────────────────────────────
function ResourcesList({ resources }) {
  if (!resources.length) return null;

  const visible = resources.slice(0, 5);
  const remaining = resources.length - visible.length;

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold tracking-tight">Resources</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {resources.length} {resources.length === 1 ? "file" : "files"}
        </p>
      </div>

      <ul>
        {visible.map((r, i) => {
          const url = r.url || r.signedUrl;
          return (
            <li
              key={r.id || r.key || i}
              className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 last:border-0"
            >
              <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-900 truncate">
                  {r.name || r.originalName || "Resource"}
                </div>
                {r.lessonTitle && (
                  <div className="text-xs text-slate-400 truncate">
                    {r.lessonTitle}
                  </div>
                )}
              </div>
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-blue-800 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
              )}
            </li>
          );
        })}
      </ul>

      {remaining > 0 && (
        <div className="px-5 py-3 text-xs text-slate-500 border-t border-slate-100">
          + {remaining} more {remaining === 1 ? "file" : "files"}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────
export default function CourseHome() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Course doc — real-time
  useEffect(() => {
    if (!courseId) return;
    const unsub = onSnapshot(doc(db, "courses", courseId), (s) => {
      if (s.exists()) setCourse({ id: s.id, ...s.data() });
      else setError("Course not found.");
    });
    return () => unsub();
  }, [courseId]);

  // Everything else — one pass
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) return navigate("/login");
      try {
        setLoading(true);

        // Modules
        const modsSnap = await getDocs(
          query(collection(db, "courses", courseId, "modules"), orderBy("order"))
        );
        setModules(modsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        // Active lessons
        const lessonsSnap = await getDocs(
          query(collection(db, "courses", courseId, "lessons"), orderBy("order"))
        );
        const active = lessonsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((l) => l.status !== "archived");
        setLessons(active);

        // Enrollment
        const enrSnap = await getDocs(
          query(
            collection(db, "enrollments"),
            where("userId", "==", u.uid),
            where("courseId", "==", courseId)
          )
        );
        if (!enrSnap.empty) {
          setEnrollment({
            id: enrSnap.docs[0].id,
            ...enrSnap.docs[0].data(),
          });
        }

        // Resources — flatten from lessons, de-duplicated by key/url/name
        const seen = new Set();
        const all = [];
        active.forEach((lesson) => {
          const combined = [
            ...(lesson.resources || []),
            ...(lesson.documents || []),
            ...(lesson.slides || []),
            ...(lesson.templates || []),
          ];
          combined.forEach((r) => {
            if (!r) return;
            const k = r.key || r.url || r.name || r.originalName;
            if (!k || seen.has(k)) return;
            seen.add(k);
            all.push({ ...r, lessonTitle: lesson.title });
          });
        });
        setResources(all);
      } catch (e) {
        console.error("coursehome load error:", e);
        setError("Couldn't load this course. Try refreshing.");
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [courseId, navigate]);

  // Derived
  const progress = (() => {
    if (!enrollment || lessons.length === 0) return 0;
    const done = lessons.filter((l) =>
      enrollment.completedLessons?.includes(l.id)
    ).length;
    return Math.round((done / lessons.length) * 100);
  })();

  const nextLesson = (() => {
    if (lessons.length === 0) return null;
    if (!enrollment) return lessons[0];
    const done = new Set(enrollment.completedLessons || []);
    return lessons.find((l) => !done.has(l.id)) || lessons[0];
  })();

  const handleEnroll = async () => {
    const u = auth.currentUser;
    if (!u) return navigate("/login");
    if (enrollment) {
      if (nextLesson) navigate(`/course/${courseId}/lesson/${nextLesson.id}`);
      return;
    }
    try {
      await addDoc(collection(db, "enrollments"), {
        userId: u.uid,
        courseId,
        enrolledAt: serverTimestamp(),
        progress: 0,
        completedLessons: [],
        status: "active",
        lastAccessed: serverTimestamp(),
      });

      // Bump enrolled count on course
      const courseRef = doc(db, "courses", courseId);
      const courseSnap = await getDoc(courseRef);
      const current = courseSnap.exists() ? courseSnap.data().enrolledCount || 0 : 0;
      await updateDoc(courseRef, { enrolledCount: current + 1 });

      if (nextLesson) navigate(`/course/${courseId}/lesson/${nextLesson.id}`);
    } catch (e) {
      console.error(e);
      alert("Couldn't enroll. Please try again.");
    }
  };

  // ─── Render ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-800" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="mx-auto h-8 w-8 text-slate-400" />
          <h1 className="mt-4 text-lg font-semibold text-slate-900">
            {error || "Course not found"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            The course you're looking for may have been removed.
          </p>
          <button
            onClick={() => navigate("/courses")}
            className="mt-6 rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-900 transition-colors"
          >
            Browse courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <CourseHero
        course={course}
        lessonsCount={lessons.length}
        progress={progress}
        nextLesson={nextLesson}
        courseId={courseId}
        enrollment={enrollment}
        onEnroll={handleEnroll}
        navigate={navigate}
      />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CurriculumCard
              modules={modules}
              lessons={lessons}
              enrollment={enrollment}
              courseId={courseId}
              navigate={navigate}
            />
          </div>

          <aside className="space-y-6">
            {enrollment ? (
              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-slate-900">
                    Enrolled
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {enrollment.completedLessons?.length || 0} of {lessons.length}{" "}
                  lessons complete
                </p>
                {progress === 100 && (
                  <p className="mt-3 text-xs text-green-700 font-medium">
                    Course complete
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-slate-900">
                  Enroll to get started
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"} ·{" "}
                  {course.duration || "self-paced"}
                </p>
                <button
                  onClick={handleEnroll}
                  className="mt-4 w-full rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-900 transition-colors"
                >
                  Enroll now
                </button>
              </div>
            )}

            <ResourcesList resources={resources} />
          </aside>
        </div>
      </main>
    </div>
  );
}
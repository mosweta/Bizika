// src/pages/coursepage.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/config";
import EdpuzzleVideoPlayer from "./videoplayer";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  doc, getDoc, collection, getDocs, query, orderBy, where,
  updateDoc, serverTimestamp, onSnapshot,
} from "firebase/firestore";
import {
  BookOpen, Clock, CheckCircle, ChevronLeft, ChevronRight,
  FileText, Download, Loader2, File, Image as ImageIcon,
  Video, Archive, Menu, X, ChevronDown, Play,
  FileSpreadsheet, Presentation, AlertCircle,
} from "lucide-react";
import { ReadingLessonRenderer } from "../features/lessons/renderer/ReadingLessonRenderer";

// ─────────────────────────────────────────────────────────────
// Resource helpers
// ─────────────────────────────────────────────────────────────
const R2_PUBLIC_DOMAIN = import.meta.env.VITE_R2_PUBLIC_DOMAIN;

const FILE_ICONS = {
  pdf: { icon: FileText, color: "text-red-600" },
  doc: { icon: FileText, color: "text-blue-600" },
  docx: { icon: FileText, color: "text-blue-600" },
  xls: { icon: FileSpreadsheet, color: "text-green-600" },
  xlsx: { icon: FileSpreadsheet, color: "text-green-600" },
  ppt: { icon: Presentation, color: "text-orange-600" },
  pptx: { icon: Presentation, color: "text-orange-600" },
  zip: { icon: Archive, color: "text-purple-600" },
  jpg: { icon: ImageIcon, color: "text-pink-600" },
  jpeg: { icon: ImageIcon, color: "text-pink-600" },
  png: { icon: ImageIcon, color: "text-pink-600" },
  gif: { icon: ImageIcon, color: "text-pink-600" },
  mp4: { icon: Video, color: "text-indigo-600" },
  webm: { icon: Video, color: "text-indigo-600" },
  txt: { icon: FileText, color: "text-slate-600" },
  default: { icon: File, color: "text-slate-600" },
};

function getFileType(name) {
  if (!name || typeof name !== "string") return "default";
  const ext = name.split(".").pop()?.toLowerCase();
  return FILE_ICONS[ext] ? ext : "default";
}

function getResourceUrl(resource) {
  if (!resource) return null;
  if (resource.url) return resource.url;
  if (resource.key && R2_PUBLIC_DOMAIN) return `${R2_PUBLIC_DOMAIN}/${resource.key}`;
  return null;
}

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─────────────────────────────────────────────────────────────
// Resource row
// ─────────────────────────────────────────────────────────────
function ResourceRow({ resource, lessonTitle }) {
  const fileType =
    resource.type || getFileType(resource.name || resource.originalName || "");
  const Icon = FILE_ICONS[fileType]?.icon || File;
  const iconColor = FILE_ICONS[fileType]?.color || "text-slate-600";
  const url = getResourceUrl(resource);

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0">
      <Icon className={`h-4 w-4 flex-shrink-0 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-900 truncate">
          {resource.name || resource.originalName || "Resource"}
        </div>
        <div className="text-xs text-slate-400 truncate">
          {lessonTitle} · {fileType.toUpperCase()}
          {resource.size ? ` · ${formatBytes(resource.size)}` : ""}
        </div>
      </div>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="p-1.5 text-blue-800 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
          title="Download"
        >
          <Download className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Reading lesson — legacy markdown renderer
// ─────────────────────────────────────────────────────────────
function MarkdownReadingView({
  lesson, lessonId, enrollment,
  hasNextLesson, hasPreviousLesson,
  onNext, onPrev, onComplete, onTakeQuiz, hasQuiz,
}) {
  const [progress, setProgress] = useState(0);
  const [size, setSize] = useState(
    () =>
      (typeof window !== "undefined" &&
        localStorage.getItem("bizika:reading:size")) ||
      "base"
  );
  const ref = useRef(null);
  const markedRef = useRef(false);
  const completed = enrollment?.completedLessons?.includes(lessonId);

  useEffect(() => {
    localStorage.setItem("bizika:reading:size", size);
  }, [size]);

  useEffect(() => {
    setProgress(0);
    markedRef.current = false;
    if (ref.current) ref.current.scrollTop = 0;
  }, [lessonId]);

  const handleScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    const p = max > 0 ? Math.min(100, Math.round((el.scrollTop / max) * 100)) : 0;
    setProgress(p);
    if (p >= 95 && !markedRef.current && !completed) {
      markedRef.current = true;
      onComplete?.();
    }
  }, [completed, onComplete]);

  const sizeClass = size === "lg" ? "text-lg" : "text-base";

  const nextButton = hasNextLesson
    ? { label: "Next", onClick: onNext }
    : hasQuiz
    ? { label: "Quiz", onClick: onTakeQuiz }
    : null;

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="h-1 bg-slate-100">
        <div
          className="h-full bg-green-600 transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
        <button
          onClick={onPrev}
          disabled={!hasPreviousLesson}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm text-slate-600 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSize(size === "lg" ? "base" : "lg")}
            className="px-2.5 py-1.5 text-sm text-slate-600 rounded hover:bg-slate-50"
            title="Toggle text size"
          >
            <span className={size === "lg" ? "font-semibold" : ""}>Aa</span>
          </button>
          <span className="text-xs text-slate-400 hidden sm:inline">{progress}%</span>
        </div>

        {nextButton ? (
          <button
            onClick={nextButton.onClick}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-sm rounded ${
              !hasNextLesson && hasQuiz
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-blue-800 text-white hover:bg-blue-900"
            }`}
          >
            <span className="hidden sm:inline">{nextButton.label}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <span className="w-[60px]" />
        )}
      </div>

      <div
        ref={ref}
        onScroll={handleScroll}
        className="max-h-[70vh] overflow-y-auto px-6 sm:px-10 py-8"
      >
        <article
          className={`mx-auto max-w-[680px] prose prose-slate ${sizeClass} prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-blue-800 prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-blue-800 prose-blockquote:bg-blue-50/50 prose-code:bg-slate-100 prose-code:text-slate-800 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none prose-pre:bg-slate-900 prose-pre:text-slate-100`}
        >
          {lesson.markdown ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="mt-8 mb-4 text-2xl font-semibold tracking-tight scroll-mt-20">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="mt-8 mb-3 text-xl font-semibold tracking-tight scroll-mt-20">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mt-6 mb-2 text-lg font-semibold tracking-tight scroll-mt-20">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="mb-4 leading-relaxed">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="mb-4 pl-5 space-y-1 list-disc">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-4 pl-5 space-y-1 list-decimal">{children}</ol>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="my-5 border-l-4 border-blue-800 bg-blue-50/50 pl-4 pr-3 py-2 italic text-slate-700">
                    {children}
                  </blockquote>
                ),
                code: ({ inline, children }) =>
                  inline ? (
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-mono text-slate-800">
                      {children}
                    </code>
                  ) : (
                    <code className="block rounded-lg bg-slate-900 p-4 font-mono text-sm text-slate-100 overflow-x-auto">
                      {children}
                    </code>
                  ),
                pre: ({ children }) => (
                  <pre className="my-4 overflow-x-auto rounded-lg bg-slate-900 p-4">
                    {children}
                  </pre>
                ),
                table: ({ children }) => (
                  <div className="my-4 overflow-x-auto">
                    <table className="min-w-full border-collapse">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-slate-200 bg-slate-50 px-4 py-2 text-left font-semibold">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-slate-200 px-4 py-2">{children}</td>
                ),
                hr: () => <hr className="my-8 border-slate-200" />,
                img: ({ src, alt }) => (
                  <img
                    src={src}
                    alt={alt || ""}
                    className="my-5 mx-auto max-w-full rounded-lg border border-slate-200"
                  />
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-800 underline underline-offset-2"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {lesson.markdown}
            </ReactMarkdown>
          ) : (
            <div className="py-16 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">No content available.</p>
            </div>
          )}
        </article>
      </div>

      <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between gap-3">
        <button
          onClick={onPrev}
          disabled={!hasPreviousLesson}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        {!completed ? (
          <button
            onClick={onComplete}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4" />
            Mark complete
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" />
            Completed
          </span>
        )}

        <button
          onClick={nextButton?.onClick}
          disabled={!nextButton}
          className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded disabled:opacity-40 ${
            hasNextLesson
              ? "bg-blue-800 text-white hover:bg-blue-900"
              : hasQuiz
              ? "bg-green-600 text-white hover:bg-green-700"
              : "text-slate-400 border border-slate-200"
          }`}
        >
          {nextButton?.label || "Next"}
          {nextButton && <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Reading lesson — v2 structured renderer wrapper
// ─────────────────────────────────────────────────────────────
function StructuredReadingView({
  lesson, lessonId, enrollment,
  hasNextLesson, hasPreviousLesson,
  onNext, onPrev, onComplete, onTakeQuiz, hasQuiz,
  onSectionComplete,
}) {
  const completed = enrollment?.completedLessons?.includes(lessonId);
  const nextButton = hasNextLesson
    ? { label: "Next lesson", onClick: onNext }
    : hasQuiz
    ? { label: "Take quiz", onClick: onTakeQuiz }
    : null;

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
        <button
          onClick={onPrev}
          disabled={!hasPreviousLesson}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm text-slate-600 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <div className="flex items-center gap-2">
          {completed ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
              <CheckCircle className="h-3 w-3" />
              Completed
            </span>
          ) : (
            <button
              onClick={onComplete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-green-600 text-white hover:bg-green-700"
            >
              <CheckCircle className="h-3 w-3" />
              Mark complete
            </button>
          )}
        </div>

        {nextButton ? (
          <button
            onClick={nextButton.onClick}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-sm rounded ${
              !hasNextLesson && hasQuiz
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-blue-800 text-white hover:bg-blue-900"
            }`}
          >
            <span className="hidden sm:inline">{nextButton.label}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <span className="w-[60px]" />
        )}
      </div>

      {/* Renderer */}
      <div className="px-6 sm:px-8 py-8">
        <ReadingLessonRenderer
          content={lesson.content}
          title={lesson.title}
          objectives={lesson.content?.objectives || []}
          questionAnswers={{}}
          onQuestionAnswered={() => {
            // Persisted in Stage 4
          }}
          onSectionComplete={(sectionId, allCompleted) => {
            onSectionComplete?.(sectionId, allCompleted);
          }}
          completedSections={[]}
          enrollment={enrollment}
        />
      </div>

      {/* Footer */}
      {nextButton && (
        <div className="border-t border-slate-100 px-4 py-3 flex justify-end">
          <button
            onClick={nextButton.onClick}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded ${
              hasNextLesson
                ? "bg-blue-800 text-white hover:bg-blue-900"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {nextButton.label}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Video lesson view
// ─────────────────────────────────────────────────────────────
function VideoLessonView({
  lesson, enrollment,
  hasNextLesson, hasPreviousLesson,
  onNext, onPrev,
  questions, onQuestionAnswered,
  onProgress, onAutoComplete, isAutoCompleting,
  onTakeQuiz, hasQuiz,
}) {
  const completed = enrollment?.completedLessons?.includes(lesson.id);

  const nextButton = hasNextLesson
    ? { label: "Next lesson", onClick: onNext }
    : hasQuiz
    ? { label: "Take quiz", onClick: onTakeQuiz }
    : null;

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-4 sm:px-5 py-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 truncate">
              {lesson.title}
            </h2>
            <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Video className="h-3 w-3" /> Video lesson
              </span>
              {lesson.duration && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {lesson.duration}
                </span>
              )}
            </div>
          </div>

          {completed ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded flex-shrink-0">
              <CheckCircle className="h-3 w-3" />
              Completed
            </span>
          ) : (
            <button
              onClick={onAutoComplete}
              disabled={isAutoCompleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex-shrink-0"
            >
              {isAutoCompleting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle className="h-3 w-3" />
              )}
              Mark complete
            </button>
          )}
        </div>

        {lesson.description && (
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            {lesson.description}
          </p>
        )}
      </div>

      <EdpuzzleVideoPlayer
        videoUrl={lesson.videoUrl}
        lessonTitle={lesson.title}
        lessonId={lesson.id}
        hasNextLesson={hasNextLesson}
        hasPreviousLesson={hasPreviousLesson}
        onNextLesson={onNext}
        onPreviousLesson={onPrev}
        questions={questions}
        onQuestionAnswered={onQuestionAnswered}
        onProgressUpdate={onProgress}
        markLessonComplete={onAutoComplete}
        isLessonCompleted={completed}
        isAutoCompleting={isAutoCompleting}
        autoComplete
      />

      {nextButton && (
        <div className="border-t border-slate-100 px-4 py-3 flex justify-end">
          <button
            onClick={nextButton.onClick}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded ${
              hasNextLesson
                ? "bg-blue-800 text-white hover:bg-blue-900"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {nextButton.label}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Lesson list (sidebar / drawer)
// ─────────────────────────────────────────────────────────────
function LessonList({
  lessons, archived, activeLessonId, enrollment,
  onSelect, onToggleArchived, showArchived,
}) {
  const completed = new Set(enrollment?.completedLessons || []);

  const renderRow = (lesson, index) => {
    const done = completed.has(lesson.id);
    const active = lesson.id === activeLessonId;
    const isNext = !done && index === 0;

    return (
      <button
        key={lesson.id}
        onClick={() => onSelect(lesson)}
        className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0 transition-colors ${
          active ? "bg-blue-50" : "hover:bg-slate-50"
        }`}
      >
        {done ? (
          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
        ) : isNext ? (
          <Play className="h-4 w-4 text-blue-800 fill-blue-800 flex-shrink-0" />
        ) : (
          <span className="h-4 w-4 flex-shrink-0 rounded-full border border-slate-300" />
        )}
        <span
          className={`flex-1 text-sm truncate ${
            active
              ? "text-blue-800 font-medium"
              : done
              ? "text-slate-500"
              : "text-slate-900"
          }`}
        >
          {lesson.title}
        </span>
        <span className="text-xs text-slate-400 flex-shrink-0">
          {lesson.duration || ""}
        </span>
      </button>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-900">Lessons</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          {completed.size} of {lessons.length} complete
        </p>
      </div>

      <div className="max-h-[60vh] overflow-y-auto">
        {lessons.map(renderRow)}

        {archived.length > 0 && (
          <div className="border-t border-slate-200">
            <button
              onClick={onToggleArchived}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-left"
            >
              <span className="inline-flex items-center gap-2 text-xs text-slate-600">
                <Archive className="h-3.5 w-3.5" />
                Archived ({archived.length})
              </span>
              {showArchived ? (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              )}
            </button>
            {showArchived &&
              archived.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex items-center gap-3 px-4 py-2.5 border-t border-slate-100 opacity-70"
                >
                  <Archive className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                  <span className="flex-1 text-xs text-slate-600 truncate">
                    {lesson.title}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────
export default function CoursePage() {
  const { courseId, lessonId: urlLessonId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [activeLessons, setActiveLessons] = useState([]);
  const [archivedLessons, setArchivedLessons] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [resources, setResources] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAutoCompleting, setIsAutoCompleting] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showMobileList, setShowMobileList] = useState(false);
  const completingRef = useRef(null);
  const initialisedRef = useRef(false);

  // ── Navigation helper ─────────────────────────────────────
  const selectLesson = useCallback(
    (lesson, { replace = true } = {}) => {
      if (!lesson) return;
      setActiveLesson(lesson);
      setShowMobileList(false);
      navigate(`/course/${courseId}/lesson/${lesson.id}`, { replace });
    },
    [courseId, navigate]
  );

  // ── Course doc live ───────────────────────────────────────
  useEffect(() => {
    if (!courseId) return;
    const unsub = onSnapshot(doc(db, "courses", courseId), (s) => {
      if (s.exists()) setCourse({ id: s.id, ...s.data() });
    });
    return () => unsub();
  }, [courseId]);

  // ── Initial load ──────────────────────────────────────────
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) return navigate("/login");
      try {
        setLoading(true);

        const lessonsSnap = await getDocs(
          query(collection(db, "courses", courseId, "lessons"), orderBy("order"))
        );
        const all = lessonsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const active = all.filter((l) => l.status !== "archived");
        const archived = all.filter((l) => l.status === "archived");
        setActiveLessons(active);
        setArchivedLessons(archived);

        const enrSnap = await getDocs(
          query(
            collection(db, "enrollments"),
            where("userId", "==", u.uid),
            where("courseId", "==", courseId)
          )
        );
        const enr = enrSnap.empty
          ? null
          : { id: enrSnap.docs[0].id, ...enrSnap.docs[0].data() };
        if (enr) setEnrollment(enr);

        // Pick the initial lesson:
        //   1. URL lessonId if valid
        //   2. First incomplete
        //   3. First lesson
        const completedSet = new Set(enr?.completedLessons || []);
        const fromUrl = urlLessonId
          ? active.find((l) => l.id === urlLessonId)
          : null;
        const firstIncomplete = active.find((l) => !completedSet.has(l.id));
        const target = fromUrl || firstIncomplete || active[0] || null;

        if (target) {
          setActiveLesson(target);
          if (!initialisedRef.current && target.id !== urlLessonId) {
            initialisedRef.current = true;
            navigate(`/course/${courseId}/lesson/${target.id}`, { replace: true });
          } else {
            initialisedRef.current = true;
          }
        }

        // Flatten resources
        const seen = new Set();
        const flat = [];
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
            flat.push({ ...r, lessonTitle: lesson.title });
          });
        });
        setResources(flat);
      } catch (e) {
        console.error("coursepage load error:", e);
        setError("Couldn't load this lesson. Try refreshing.");
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, navigate]);

  // ── React to URL changes (back/forward) ───────────────────
  useEffect(() => {
    if (!initialisedRef.current) return;
    if (!urlLessonId) return;
    if (!activeLessons.length) return;
    if (activeLesson?.id === urlLessonId) return;

    const match = activeLessons.find((l) => l.id === urlLessonId);
    if (match) setActiveLesson(match);
  }, [urlLessonId, activeLessons, activeLesson]);

  // ── Questions for video lessons ───────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function fetchQuestions() {
      if (!activeLesson?.videoUrl) {
        setQuestions([]);
        return;
      }
      try {
        const qs = await getDocs(
          collection(db, "courses", courseId, "lessons", activeLesson.id, "questions")
        );
        if (!cancelled) {
          setQuestions(
            qs.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
          );
        }
      } catch {
        if (!cancelled) setQuestions([]);
      }
    }
    fetchQuestions();
    return () => {
      cancelled = true;
    };
  }, [activeLesson, courseId]);

  // ── Handlers ──────────────────────────────────────────────

  const completeActiveLesson = useCallback(async () => {
    if (!activeLesson || !enrollment) return;
    if (enrollment.completedLessons?.includes(activeLesson.id)) return;
    if (completingRef.current === activeLesson.id) return;

    try {
      completingRef.current = activeLesson.id;
      setIsAutoCompleting(true);

      const next = [...(enrollment.completedLessons || []), activeLesson.id];
      const doneActive = activeLessons.filter((l) => next.includes(l.id)).length;
      const progress = activeLessons.length
        ? Math.min(Math.round((doneActive / activeLessons.length) * 100), 100)
        : 0;

      await updateDoc(doc(db, "enrollments", enrollment.id), {
        completedLessons: next,
        progress,
        totalLessons: activeLessons.length,
        lastAccessed: serverTimestamp(),
      });

      setEnrollment((p) => ({
        ...p,
        completedLessons: next,
        progress,
        totalLessons: activeLessons.length,
      }));
    } catch (e) {
      console.error("complete error:", e);
    } finally {
      setIsAutoCompleting(false);
      setTimeout(() => {
        completingRef.current = null;
      }, 1000);
    }
  }, [activeLesson, enrollment, activeLessons]);

  const handleQuestionAnswered = useCallback(
    async (question) => {
      if (!activeLesson) return;
      try {
        await updateDoc(
          doc(
            db,
            "courses",
            courseId,
            "lessons",
            activeLesson.id,
            "questions",
            question.id
          ),
          {
            userAnswer: question.userAnswer,
            answered: true,
            answeredAt: serverTimestamp(),
          }
        );
        setQuestions((prev) =>
          prev.map((q) => (q.id === question.id ? question : q))
        );
      } catch (e) {
        console.error("question save error:", e);
      }
    },
    [activeLesson, courseId]
  );

  const handleProgress = useCallback(() => {
    // Reserved for future video progress persistence
  }, []);

  const goNext = useCallback(() => {
    const idx = activeLessons.findIndex((l) => l.id === activeLesson?.id);
    if (idx >= 0 && idx < activeLessons.length - 1) {
      selectLesson(activeLessons[idx + 1]);
    }
  }, [activeLessons, activeLesson, selectLesson]);

  const goPrev = useCallback(() => {
    const idx = activeLessons.findIndex((l) => l.id === activeLesson?.id);
    if (idx > 0) {
      selectLesson(activeLessons[idx - 1]);
    }
  }, [activeLessons, activeLesson, selectLesson]);

  // ── Derived ───────────────────────────────────────────────
  const currentIdx = activeLesson
    ? activeLessons.findIndex((l) => l.id === activeLesson.id)
    : -1;
  const hasNextLesson = currentIdx >= 0 && currentIdx < activeLessons.length - 1;
  const hasPreviousLesson = currentIdx > 0;
  const hasQuiz = Boolean(course?.hasQuiz && (enrollment?.progress || 0) >= 70);

  const progress = (() => {
    if (!enrollment || activeLessons.length === 0) return 0;
    const done = activeLessons.filter((l) =>
      enrollment.completedLessons?.includes(l.id)
    ).length;
    return Math.round((done / activeLessons.length) * 100);
  })();

  // ── Render ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-800" />
      </div>
    );
  }

  if (error || !course || !activeLesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="mx-auto h-8 w-8 text-slate-400" />
          <h1 className="mt-4 text-lg font-semibold text-slate-900">
            {error || "Lesson not found"}
          </h1>
          <button
            onClick={() => navigate(`/course/${courseId}`)}
            className="mt-6 rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-900"
          >
            Back to course
          </button>
        </div>
      </div>
    );
  }

  const isReading = !activeLesson.videoUrl;
  const isStructuredReading =
    isReading && activeLesson.contentVersion === 2 && activeLesson.content;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-3">
            <button
              onClick={() => navigate(`/course/${courseId}`)}
              className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline truncate max-w-[240px]">
                {course.title}
              </span>
              <span className="sm:hidden">Back</span>
            </button>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                <span>{progress}% complete</span>
              </div>
              <button
                onClick={() => setShowMobileList(true)}
                className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                aria-label="Open lesson list"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {showMobileList && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setShowMobileList(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 right-0 z-40 w-80 max-w-[90vw] bg-white shadow-xl lg:hidden overflow-y-auto">
            <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 sticky top-0 bg-white">
              <span className="text-sm font-semibold">Lessons</span>
              <button
                onClick={() => setShowMobileList(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <LessonList
              lessons={activeLessons}
              archived={archivedLessons}
              activeLessonId={activeLesson.id}
              enrollment={enrollment}
              onSelect={selectLesson}
              onToggleArchived={() => setShowArchived((v) => !v)}
              showArchived={showArchived}
            />
          </div>
        </>
      )}

      {/* Main */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
        <div
          className={`grid grid-cols-1 gap-6 ${
            isStructuredReading
              ? "lg:grid-cols-[1fr_320px]"
              : isReading
              ? ""
              : "lg:grid-cols-3"
          }`}
        >
          <div
            className={
              isStructuredReading
                ? "lg:col-span-1 min-w-0"
                : isReading
                ? ""
                : "lg:col-span-2"
            }
          >
            {isStructuredReading ? (
              <StructuredReadingView
                lesson={activeLesson}
                lessonId={activeLesson.id}
                enrollment={enrollment}
                hasNextLesson={hasNextLesson}
                hasPreviousLesson={hasPreviousLesson}
                onNext={goNext}
                onPrev={goPrev}
                onComplete={completeActiveLesson}
                onTakeQuiz={() => navigate(`/course/${courseId}/quiz`)}
                hasQuiz={hasQuiz}
                onSectionComplete={(sectionId, allCompleted) => {
                  // Stage 4 will persist this
                  console.log("[coursepage] section complete", sectionId, allCompleted);
                }}
              />
            ) : isReading ? (
              <MarkdownReadingView
                lesson={activeLesson}
                lessonId={activeLesson.id}
                enrollment={enrollment}
                hasNextLesson={hasNextLesson}
                hasPreviousLesson={hasPreviousLesson}
                onNext={goNext}
                onPrev={goPrev}
                onComplete={completeActiveLesson}
                onTakeQuiz={() => navigate(`/course/${courseId}/quiz`)}
                hasQuiz={hasQuiz}
              />
            ) : (
              <VideoLessonView
                lesson={activeLesson}
                enrollment={enrollment}
                hasNextLesson={hasNextLesson}
                hasPreviousLesson={hasPreviousLesson}
                onNext={goNext}
                onPrev={goPrev}
                questions={questions}
                onQuestionAnswered={handleQuestionAnswered}
                onProgress={handleProgress}
                onAutoComplete={completeActiveLesson}
                isAutoCompleting={isAutoCompleting}
                onTakeQuiz={() => navigate(`/course/${courseId}/quiz`)}
                hasQuiz={hasQuiz}
              />
            )}
          </div>

          {/* Sidebar */}
          {!isStructuredReading && !isReading && (
            <aside className="hidden lg:block space-y-6">
              <LessonList
                lessons={activeLessons}
                archived={archivedLessons}
                activeLessonId={activeLesson.id}
                enrollment={enrollment}
                onSelect={selectLesson}
                onToggleArchived={() => setShowArchived((v) => !v)}
                showArchived={showArchived}
              />

              {resources.length > 0 && (
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Resources
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {resources.length} {resources.length === 1 ? "file" : "files"}
                    </p>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {resources.slice(0, 6).map((r, i) => (
                      <ResourceRow
                        key={r.id || r.key || i}
                        resource={r}
                        lessonTitle={r.lessonTitle}
                      />
                    ))}
                  </div>
                  {resources.length > 6 && (
                    <div className="px-4 py-2.5 text-xs text-slate-500 border-t border-slate-100">
                      + {resources.length - 6} more
                    </div>
                  )}
                </div>
              )}
            </aside>
          )}

          {/* Structured reading sidebar — lesson list only, no resources */}
          {isStructuredReading && (
            <aside className="hidden lg:block">
              <div className="sticky top-20 space-y-6">
                <LessonList
                  lessons={activeLessons}
                  archived={archivedLessons}
                  activeLessonId={activeLesson.id}
                  enrollment={enrollment}
                  onSelect={selectLesson}
                  onToggleArchived={() => setShowArchived((v) => !v)}
                  showArchived={showArchived}
                />
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
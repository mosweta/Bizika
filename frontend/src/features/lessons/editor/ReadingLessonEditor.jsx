// src/features/lessons/editor/ReadingLessonEditor.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase/config";
import {
  Eye, Save, Loader2, AlertCircle, CheckCircle, ChevronLeft,
} from "lucide-react";
import { ReadingLessonForm } from "./ReadingLessonForm";
import { LessonPreviewModal } from "./LessonPreviewModal";
import { SkeletonBar } from "../../../components/Skeletons";

const EMPTY_VALUE = {
  title: "",
  description: "",
  duration: "",
  objectives: [],
  sections: [],
};

export function ReadingLessonEditor({ courseId, lessonId, onExit }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [course, setCourse] = useState(null);
  const [lesson, setLesson] = useState(null);

  const [value, setValue] = useState(EMPTY_VALUE);

  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const savedSnapshotRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const mountedRef = useRef(true);

  // ── Load ────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [courseSnap, lessonSnap] = await Promise.all([
          getDoc(doc(db, "courses", courseId)),
          getDoc(doc(db, "courses", courseId, "lessons", lessonId)),
        ]);

        if (!mountedRef.current) return;

        if (!courseSnap.exists()) {
          setError("Course not found.");
          setLoading(false);
          return;
        }
        if (!lessonSnap.exists()) {
          setError("Lesson not found.");
          setLoading(false);
          return;
        }

        const courseData = { id: courseSnap.id, ...courseSnap.data() };
        const lessonData = { id: lessonSnap.id, ...lessonSnap.data() };

        setCourse(courseData);
        setLesson(lessonData);

        const content = lessonData.content || {};
        const loadedValue = {
          title: lessonData.title || "",
          description: lessonData.description || "",
          duration: lessonData.duration || "",
          objectives: content.objectives || [],
          sections: content.sections || [],
        };

        setValue(loadedValue);
        savedSnapshotRef.current = JSON.stringify(loadedValue);
      } catch (e) {
        console.error("editor load error:", e);
        if (mountedRef.current) setError("Couldn't load the lesson.");
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }

    load();
    return () => {
      mountedRef.current = false;
    };
  }, [courseId, lessonId]);

  // ── Change detection ────────────────────────────────────
  const currentSnapshot = JSON.stringify(value);
  const isDirty = savedSnapshotRef.current !== currentSnapshot;

  // ── Autosave ────────────────────────────────────────────
  const persist = useCallback(
    async (silent = false) => {
      if (!lesson) return;
      try {
        if (!silent) setSaving(true);

        await updateDoc(
          doc(db, "courses", courseId, "lessons", lessonId),
          {
            title: value.title.trim(),
            description: value.description.trim(),
            duration: value.duration.trim(),
            content: {
              format: "bizika/blocks/v1",
              objectives: value.objectives,
              sections: value.sections,
            },
            contentVersion: 2,
            lessonType: "reading",
            updatedAt: serverTimestamp(),
          }
        );

        savedSnapshotRef.current = currentSnapshot;
        setLastSavedAt(new Date());
      } catch (e) {
        console.error("save error:", e);
        if (!silent) setError("Failed to save. Check your connection.");
      } finally {
        if (!silent && mountedRef.current) setSaving(false);
      }
    },
    [lesson, courseId, lessonId, value, currentSnapshot]
  );

  // Autosave 2s after last change
  useEffect(() => {
    if (loading || !lesson) return;
    if (!isDirty) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => persist(true), 2000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [currentSnapshot, loading, lesson, isDirty, persist]);

  // Warn on unload if dirty
  useEffect(() => {
    const handler = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const handleSaveNow = () => persist(false);

  const handleExit = () => {
    if (isDirty) {
      if (!window.confirm("You have unsaved changes. Leave without saving?")) {
        return;
      }
    }
    if (onExit) onExit();
    else navigate("/admin");
  };

  // ── Render ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
          <SkeletonBar className="h-6 w-48" />
          <SkeletonBar className="h-10 w-full" />
          <SkeletonBar className="h-24 w-full" />
          <SkeletonBar className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="mx-auto h-8 w-8 text-slate-400" />
          <h1 className="mt-4 text-lg font-semibold text-slate-900">
            {error || "Couldn't load the lesson"}
          </h1>
          <button
            onClick={handleExit}
            className="mt-6 rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-900"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={handleExit}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded flex-shrink-0"
                title="Back"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <div className="text-xs text-slate-500 truncate">
                  {course?.title}
                </div>
                <div className="text-sm font-medium text-slate-900 truncate">
                  {value.title || "Untitled lesson"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {saving && (
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving…
                </span>
              )}
              {!saving && lastSavedAt && !isDirty && (
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-green-700">
                  <CheckCircle className="h-3 w-3" />
                  Saved
                </span>
              )}
              {isDirty && !saving && (
                <span className="hidden sm:inline text-xs text-amber-600">
                  Unsaved changes
                </span>
              )}

              <button
                onClick={() => setShowPreview(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Preview</span>
              </button>

              <button
                onClick={handleSaveNow}
                disabled={saving || !isDirty}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded bg-blue-800 text-white hover:bg-blue-900 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {saving ? "Saving…" : "Save"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        {error && (
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-xs underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <ReadingLessonForm value={value} onChange={setValue} />
      </main>

      {showPreview && (
        <LessonPreviewModal
          title={value.title}
          content={{
            format: "bizika/blocks/v1",
            objectives: value.objectives,
            sections: value.sections,
          }}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
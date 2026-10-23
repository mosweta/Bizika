// src/pages/librarycomponents/modals/addLessonModal.jsx
import { useState } from "react";
import {
  X, Loader2, Video, BookOpen, AlertCircle, Eye,
} from "lucide-react";
import { ReadingLessonForm } from "../../../features/lessons/editor/ReadingLessonForm";
import { LessonPreviewModal } from "../../../features/lessons/editor/LessonPreviewModal";

function validateVideoUrl(url) {
  if (!url) return { valid: true };
  const patterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
    /^https?:\/\/(www\.)?youtu\.be\/[\w-]+/,
    /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
    /^https?:\/\/(www\.)?vimeo\.com\/\d+/,
    /^https?:\/\/.*\.(mp4|webm|mov|avi|mkv)(\?.*)?$/i,
  ];
  return patterns.some((r) => r.test(url))
    ? { valid: true }
    : url.startsWith("http")
    ? { valid: true }
    : { valid: false };
}

const EMPTY_READING_VALUE = {
  title: "",
  description: "",
  duration: "",
  objectives: [],
  sections: [],
};

export function AddLessonModal({ course, module = null, onSave, onClose }) {
  const [lessonType, setLessonType] = useState("video");

  // Video form
  const [videoForm, setVideoForm] = useState({
    title: "",
    description: "",
    duration: "",
    videoUrl: "",
    isPublished: true,
  });

  // Reading form (metadata + content)
  const [readingValue, setReadingValue] = useState(EMPTY_READING_VALUE);
  const [readingPublished, setReadingPublished] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const setVideoField = (key, value) =>
    setVideoForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (lessonType === "video") {
      if (!videoForm.title.trim()) {
        setError("Lesson title is required.");
        return;
      }
      if (videoForm.videoUrl) {
        const v = validateVideoUrl(videoForm.videoUrl);
        if (!v.valid) {
          setError("Please enter a valid video URL.");
          return;
        }
      }

      setSaving(true);
      try {
        await onSave({
          lessonType: "video",
          title: videoForm.title.trim(),
          description: videoForm.description.trim(),
          duration: videoForm.duration,
          videoUrl: videoForm.videoUrl,
          isPublished: videoForm.isPublished,
        });
      } catch (err) {
        console.error("video save error:", err);
        setError(err.message || "Failed to save lesson.");
        setSaving(false);
      }
      return;
    }

    // Reading lesson
    if (!readingValue.title.trim()) {
      setError("Lesson title is required.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        lessonType: "reading",
        title: readingValue.title.trim(),
        description: readingValue.description.trim(),
        duration: readingValue.duration,
        objectives: readingValue.objectives,
        sections: readingValue.sections,
        isPublished: readingPublished,
      });
    } catch (err) {
      console.error("reading save error:", err);
      setError(err.message || "Failed to save lesson.");
      setSaving(false);
    }
  };

  // Whether this lesson is being created as a reading lesson
  const isReading = lessonType === "reading";
  const isReadingLarge = isReading;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-2 sm:p-4"
      onClick={saving ? undefined : onClose}
    >
      <div
        className={`bg-white rounded-lg border border-slate-200 w-full flex flex-col max-h-[95vh] ${
          isReadingLarge ? "max-w-4xl" : "max-w-2xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">Add lesson</h2>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              {course?.title}
              {module ? ` › ${module.title}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <div className="p-5 space-y-5">
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Lesson type toggle */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Lesson type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      id: "video",
                      label: "Video lesson",
                      hint: "YouTube, Vimeo, or direct link",
                      icon: Video,
                    },
                    {
                      id: "reading",
                      label: "Reading lesson",
                      hint: "Build with the visual editor",
                      icon: BookOpen,
                    },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const active = lessonType === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setLessonType(opt.id)}
                        disabled={saving}
                        className={`flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left transition-colors ${
                          active
                            ? "border-blue-800 bg-blue-50/50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 ${
                            active ? "text-blue-800" : "text-slate-400"
                          }`}
                        />
                        <span
                          className={`text-sm font-medium ${
                            active ? "text-blue-800" : "text-slate-900"
                          }`}
                        >
                          {opt.label}
                        </span>
                        <span className="text-xs text-slate-500">{opt.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Video form */}
              {lessonType === "video" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">
                        Title
                      </label>
                      <input
                        type="text"
                        value={videoForm.title}
                        onChange={(e) => setVideoField("title", e.target.value)}
                        disabled={saving}
                        autoFocus
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-800 disabled:bg-slate-50"
                        placeholder="e.g. What is marketing?"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">
                        Duration
                      </label>
                      <input
                        type="text"
                        value={videoForm.duration}
                        onChange={(e) => setVideoField("duration", e.target.value)}
                        disabled={saving}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-800 disabled:bg-slate-50"
                        placeholder="e.g. 15 min"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Description
                    </label>
                    <textarea
                      value={videoForm.description}
                      onChange={(e) => setVideoField("description", e.target.value)}
                      disabled={saving}
                      rows={2}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-800 disabled:bg-slate-50 resize-y"
                      placeholder="What will students learn?"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Video URL
                    </label>
                    <input
                      type="url"
                      value={videoForm.videoUrl}
                      onChange={(e) => setVideoField("videoUrl", e.target.value)}
                      disabled={saving}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-800 disabled:bg-slate-50"
                      placeholder="https://www.youtube.com/watch?v=…"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Supports YouTube, Vimeo, and direct MP4/WebM links.
                    </p>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={videoForm.isPublished}
                      onChange={(e) =>
                        setVideoField("isPublished", e.target.checked)
                      }
                      disabled={saving}
                      className="h-4 w-4 rounded border-slate-300 accent-blue-800"
                    />
                    Publish lesson immediately
                  </label>
                </>
              )}

              {/* Reading form — inline editor */}
              {lessonType === "reading" && (
                <ReadingLessonForm
                  value={readingValue}
                  onChange={setReadingValue}
                  compact
                />
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-slate-200 flex-shrink-0 bg-white">
          {/* Left: preview button (reading only) */}
          <div>
            {isReading && (
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                disabled={saving || !readingValue.title.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Eye className="h-4 w-4" />
                Preview
              </button>
            )}
          </div>

          {/* Right: cancel + submit */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm rounded border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                saving ||
                (lessonType === "video" && !videoForm.title.trim()) ||
                (lessonType === "reading" && !readingValue.title.trim())
              }
              className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded bg-blue-800 text-white hover:bg-blue-900 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? "Saving…" : "Add lesson"}
            </button>
          </div>
        </div>
      </div>

      {/* Preview modal on top of the add modal */}
      {showPreview && isReading && (
        <LessonPreviewModal
          title={readingValue.title}
          content={{
            format: "bizika/blocks/v1",
            objectives: readingValue.objectives,
            sections: readingValue.sections,
          }}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
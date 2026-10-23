// src/pages/librarycomponents/modals/editLessonModal.jsx
import { useState } from "react";
import { doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase/config";
import {
  X, Loader2, AlertCircle, Trash2, Video, BookOpen,
  FileText, Plus, Download,
} from "lucide-react";
import DurationPicker from "../../Admin/durationPicker";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function validateVideoUrl(url) {
  if (!url) return { valid: true, type: null };
  const patterns = {
    youtube: [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^https?:\/\/(www\.)?youtu\.be\/[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
    ],
    vimeo: [
      /^https?:\/\/(www\.)?vimeo\.com\/\d+/,
    ],
    direct: [/^https?:\/\/.*\.(mp4|webm|mov|avi|mkv)(\?.*)?$/i],
  };
  for (const [type, list] of Object.entries(patterns)) {
    if (list.some((re) => re.test(url))) return { valid: true, type };
  }
  if (url.startsWith("http")) return { valid: true, type: "other" };
  return { valid: false, type: "unknown" };
}

export function EditLessonModal({ lesson, courseId, onClose, onSaved, onDeleted }) {
  const [tab, setTab] = useState("details");
  const [form, setForm] = useState({
    title: lesson.title || "",
    description: lesson.description || "",
    duration: lesson.duration || "",
    videoUrl: lesson.videoUrl || "",
    markdown: lesson.markdown || "",
    isPublished: lesson.isPublished !== false,
    status: lesson.status || "active",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isReading = !lesson.videoUrl || lesson.lessonType === "reading";

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!isReading && form.videoUrl) {
      const validation = validateVideoUrl(form.videoUrl);
      if (!validation.valid) {
        setError("Please enter a valid video URL.");
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      const updateData = {
        title: form.title.trim(),
        description: form.description.trim(),
        duration: form.duration,
        isPublished: form.isPublished,
        status: form.status,
        updatedAt: serverTimestamp(),
      };

      if (isReading) {
        updateData.markdown = form.markdown;
      } else {
        updateData.videoUrl = form.videoUrl.trim();
        updateData.videoType = validateVideoUrl(form.videoUrl).type;
      }

      await updateDoc(doc(db, "courses", courseId, "lessons", lesson.id), updateData);
      onSaved?.();
      onClose();
    } catch (err) {
      console.error("EditLessonModal save error:", err);
      setError(err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteDoc(doc(db, "courses", courseId, "lessons", lesson.id));
      onDeleted?.();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to delete.");
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    const reason = window.prompt("Reason for archiving this lesson?");
    if (!reason) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "courses", courseId, "lessons", lesson.id), {
        status: "archived",
        archivedAt: new Date().toISOString(),
        archiveReason: reason,
        updatedAt: serverTimestamp(),
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to archive.");
      setSaving(false);
    }
  };

  const resources = lesson.resources || [];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 truncate">
              Edit lesson
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              {isReading ? "Reading lesson" : "Video lesson"}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 px-5 flex-shrink-0">
          <nav className="flex gap-6">
            {[
              { id: "details", label: "Details" },
              { id: "content", label: isReading ? "Content" : "Video" },
              { id: "resources", label: `Resources (${resources.length})` },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`py-3 text-sm border-b-2 transition-colors ${
                  tab === t.id
                    ? "border-blue-800 text-blue-800 font-medium"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Details tab */}
          {tab === "details" && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  disabled={saving}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-800 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  disabled={saving}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-800 disabled:bg-slate-50 resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Duration
                </label>
                <DurationPicker
                  value={form.duration}
                  onChange={(d) => setForm((p) => ({ ...p, duration: d }))}
                  lessonType={isReading ? "reading" : "video"}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, isPublished: e.target.checked }))
                    }
                    disabled={saving}
                    className="h-4 w-4 rounded border-slate-300 accent-blue-800"
                  />
                  Published
                </label>
              </div>
            </div>
          )}

          {/* Content tab */}
          {tab === "content" && (
            <div className="space-y-4">
              {isReading ? (
                <>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      Lesson content (Markdown)
                    </label>
                    <div className="flex gap-1 text-xs">
                      <button
                        onClick={() => setForm((p) => ({ ...p, _mode: "write" }))}
                        className={`px-2 py-1 rounded ${
                          (form._mode || "write") === "write"
                            ? "bg-blue-50 text-blue-800"
                            : "text-slate-500"
                        }`}
                      >
                        Write
                      </button>
                      <button
                        onClick={() => setForm((p) => ({ ...p, _mode: "preview" }))}
                        className={`px-2 py-1 rounded ${
                          form._mode === "preview"
                            ? "bg-blue-50 text-blue-800"
                            : "text-slate-500"
                        }`}
                      >
                        Preview
                      </button>
                    </div>
                  </div>

                  {(form._mode || "write") === "write" ? (
                    <textarea
                      value={form.markdown}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, markdown: e.target.value }))
                      }
                      disabled={saving}
                      rows={20}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-800 disabled:bg-slate-50 resize-y"
                      placeholder="# Heading&#10;&#10;Write lesson content in markdown…"
                    />
                  ) : (
                    <div className="rounded-lg border border-slate-200 p-5 prose prose-slate prose-sm max-w-none">
                      {form.markdown ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {form.markdown}
                        </ReactMarkdown>
                      ) : (
                        <p className="text-slate-400 italic">Nothing to preview.</p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Video URL
                  </label>
                  <input
                    type="url"
                    value={form.videoUrl}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, videoUrl: e.target.value }))
                    }
                    disabled={saving}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-800 disabled:bg-slate-50"
                    placeholder="https://www.youtube.com/watch?v=…"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Supports YouTube, Vimeo, and direct MP4/WebM links.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Resources tab */}
          {tab === "resources" && (
            <div>
              {resources.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center">
                  <FileText className="mx-auto h-6 w-6 text-slate-300" />
                  <p className="mt-3 text-sm text-slate-500">
                    No resources attached to this lesson.
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Close this modal and use the resource button on the lesson row to add files.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                  {resources.map((r) => (
                    <li
                      key={r.id || r.key}
                      className="flex items-center gap-3 px-4 py-3 bg-white"
                    >
                      <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-900 truncate">
                          {r.name || r.originalName || "Resource"}
                        </div>
                        <div className="text-xs text-slate-400 capitalize">
                          {r.type || "file"}
                        </div>
                      </div>
                      {r.url && (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-blue-800 hover:bg-blue-50 rounded"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-slate-200 flex-shrink-0 bg-white">
          <div className="flex items-center gap-2">
            {form.status !== "archived" && (
              <>
                {confirmDelete ? (
                  <>
                    <span className="text-xs text-red-700 mr-2">
                      Delete permanently?
                    </span>
                    <button
                      onClick={handleDelete}
                      disabled={saving}
                      className="px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                    >
                      Yes, delete
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      disabled={saving}
                      className="px-3 py-1.5 text-xs rounded border border-slate-200 text-slate-600"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleArchive}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-amber-200 text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Archive
                    </button>
                    <button
                      onClick={() => setConfirmDelete(true)}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </>
                )}
              </>
            )}
          </div>

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
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded bg-blue-800 text-white hover:bg-blue-900 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
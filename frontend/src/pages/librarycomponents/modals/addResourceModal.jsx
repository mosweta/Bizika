// src/pages/librarycomponents/modals/addResourceModal.jsx
import { useState, useRef } from "react";
import {
  X, Upload, FileText, Loader2, AlertCircle,
} from "lucide-react";

const TYPE_OPTIONS = [
  { value: "pdf", label: "PDF" },
  { value: "video", label: "Video" },
  { value: "image", label: "Image" },
  { value: "link", label: "Link" },
  { value: "doc", label: "Document" },
  { value: "xls", label: "Spreadsheet" },
  { value: "ppt", label: "Presentation" },
  { value: "zip", label: "ZIP archive" },
  { value: "txt", label: "Text file" },
  { value: "other", label: "Other" },
];

function detectTypeFromFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "image";
  if (["mp4", "webm", "mov", "avi"].includes(ext)) return "video";
  if (["doc", "docx"].includes(ext)) return "doc";
  if (["xls", "xlsx"].includes(ext)) return "xls";
  if (["ppt", "pptx"].includes(ext)) return "ppt";
  if (ext === "zip") return "zip";
  if (["txt", "md"].includes(ext)) return "txt";
  return "other";
}

export function AddResourceModal({ lesson, onSave, onClose }) {
  const [form, setForm] = useState({
    name: "",
    type: "pdf",
    file: null,
    url: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const setField = (key, value) =>
    setForm((p) => ({ ...p, [key]: value }));

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((p) => ({
      ...p,
      file,
      type: detectTypeFromFile(file),
      name: p.name || file.name.replace(/\.[^/.]+$/, ""),
    }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Resource name is required.");
      return;
    }
    if (!form.file && !form.url.trim()) {
      setError("Provide a file or a URL.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: form.name.trim(),
        type: form.type,
        file: form.file,
        url: form.url.trim(),
        description: form.description.trim(),
      });
    } catch (err) {
      console.error("AddResourceModal save error:", err);
      setError(err.message || "Failed to add resource.");
      setSaving(false);
    }
  };

  const canSubmit =
    !saving && form.name.trim() && (form.file || form.url.trim());

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={saving ? undefined : onClose}
    >
      <div
        className="bg-white rounded-lg border border-slate-200 w-full max-w-md max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">Add resource</h2>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              {lesson?.title}
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Resource name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                disabled={saving}
                autoFocus
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-800 disabled:bg-slate-50"
                placeholder="e.g. Worksheet 1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Type
              </label>
              <select
                value={form.type}
                onChange={(e) => setField("type", e.target.value)}
                disabled={saving}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-800 disabled:bg-slate-50"
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Upload file
              </label>
              <div className="rounded-lg border-2 border-dashed border-slate-200 p-4 text-center hover:border-blue-800 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  disabled={saving}
                  className="hidden"
                />
                {form.file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-blue-800 flex-shrink-0" />
                    <span className="text-sm truncate flex-1 text-left">
                      {form.file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setField("file", null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      disabled={saving}
                      className="p-1 hover:bg-slate-100 rounded flex-shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={saving}
                    className="inline-flex flex-col items-center gap-1.5"
                  >
                    <Upload className="h-5 w-5 text-slate-400" />
                    <span className="text-sm text-slate-600">
                      Click to select a file
                    </span>
                    <span className="text-xs text-slate-400">Max 100MB</span>
                  </button>
                )}
              </div>
            </div>

            <div className="relative flex items-center">
              <div className="flex-grow border-t border-slate-200" />
              <span className="px-3 text-xs text-slate-400">OR</span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Resource URL
              </label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setField("url", e.target.value)}
                disabled={saving || Boolean(form.file)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-800 disabled:bg-slate-50"
                placeholder="https://example.com/file.pdf"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Description <span className="text-slate-400">(optional)</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                disabled={saving}
                rows={2}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-800 disabled:bg-slate-50 resize-y"
                placeholder="What is this resource for?"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200 flex-shrink-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm rounded border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded bg-blue-800 text-white hover:bg-blue-900 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? "Saving…" : "Add resource"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
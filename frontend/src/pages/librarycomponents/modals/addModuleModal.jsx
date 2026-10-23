// src/pages/librarycomponents/modals/addModuleModal.jsx
import { useState } from "react";
import { X, Layers, Loader2 } from "lucide-react";

export function AddModuleModal({
  course,
  module = null,           // pass a module to edit; null to create
  onSave,
  onClose,
}) {
  const isEditing = Boolean(module);

  const [form, setForm] = useState({
    title: module?.title || "",
    description: module?.description || "",
    isPublished: module?.isPublished !== false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Module title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: form.title.trim(),
        description: form.description.trim(),
        isPublished: form.isPublished,
      });
    } catch (err) {
      console.error("AddModuleModal save error:", err);
      setError(err.message || "Failed to save module.");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={saving ? undefined : onClose}
    >
      <div
        className="bg-white rounded-lg border border-slate-200 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">
              {isEditing ? "Edit module" : "Add module"}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              {course?.title || ""}
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

        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Module title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                disabled={saving}
                autoFocus
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-800 disabled:bg-slate-50"
                placeholder="e.g. Foundations"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Description <span className="text-slate-400">(optional)</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                disabled={saving}
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-800 disabled:bg-slate-50 resize-y"
                placeholder="What will students learn in this module?"
              />
            </div>

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
              Publish module immediately
            </label>
          </div>

          <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200">
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
              disabled={saving || !form.title.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded bg-blue-800 text-white hover:bg-blue-900 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Layers className="h-3.5 w-3.5" />
                  {isEditing ? "Save changes" : "Add module"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
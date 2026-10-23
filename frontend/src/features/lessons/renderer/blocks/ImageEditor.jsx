// src/features/lessons/editor/blocks/ImageEditor.jsx
import { useState, useRef } from "react";
import { Upload, Link2, Loader2, Trash2, Image as ImageIcon } from "lucide-react";
import { uploadToR2, validateFile } from "../R2UploadHelper";

export function ImageEditor({ block, onChange, lessonId }) {
  const [mode, setMode] = useState(block.url ? "preview" : "choose");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [urlInput, setUrlInput] = useState("");
  const fileRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file, "image");
    if (!validation.valid) {
      setError(validation.error);
      e.target.value = "";
      return;
    }

    setError(null);
    setUploading(true);
    setProgress(0);

    try {
      const result = await uploadToR2(file, {
        folder: "lesson-images",
        lessonId,
        onProgress: setProgress,
      });
      onChange({ ...block, url: result.url, key: result.key });
      setMode("preview");
    } catch (err) {
      console.error("image upload error:", err);
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleUrlInsert = () => {
    const url = urlInput.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setError("Enter a valid URL starting with http:// or https://");
      return;
    }
    onChange({ ...block, url });
    setMode("preview");
    setUrlInput("");
  };

  const handleRemove = () => {
    onChange({ ...block, url: "", key: undefined, alt: "", caption: "" });
    setMode("choose");
  };

  // ── Preview mode ─────────────────────────────────────────
  if (mode === "preview" && block.url) {
    return (
      <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
        <div className="relative group">
          <img
            src={block.url}
            alt={block.alt || ""}
            className="w-full max-h-72 object-contain bg-slate-50"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 rounded bg-slate-900/60 text-white hover:bg-slate-900 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove image"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="p-3 space-y-2 border-t border-slate-100">
          <input
            type="text"
            value={block.alt || ""}
            onChange={(e) => onChange({ ...block, alt: e.target.value })}
            placeholder="Alt text (for accessibility)"
            className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-800"
          />
          <input
            type="text"
            value={block.caption || ""}
            onChange={(e) => onChange({ ...block, caption: e.target.value })}
            placeholder="Caption (optional)"
            className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-800"
          />
        </div>
      </div>
    );
  }

  // ── Choose mode ──────────────────────────────────────────
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      {error && (
        <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}

      {uploading ? (
        <div className="text-center py-4">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-800" />
          <p className="mt-2 text-sm text-slate-600">Uploading…</p>
          <div className="mt-3 h-1.5 bg-slate-200 rounded-full overflow-hidden max-w-xs mx-auto">
            <div
              className="h-full bg-blue-800 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-400">{progress}%</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Add image</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Upload */}
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full inline-flex flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-slate-200 bg-white p-4 text-slate-600 hover:border-blue-800 hover:text-blue-800 transition-colors"
              >
                <Upload className="h-5 w-5" />
                <span className="text-sm">Upload file</span>
                <span className="text-xs text-slate-400">Max 5MB</span>
              </button>
            </div>

            {/* URL */}
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-1.5 mb-2 text-slate-600">
                <Link2 className="h-3.5 w-3.5" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  From URL
                </span>
              </div>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleUrlInsert();
                  }
                }}
                placeholder="https://…"
                className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-800"
              />
              <button
                type="button"
                onClick={handleUrlInsert}
                disabled={!urlInput.trim()}
                className="mt-2 w-full text-xs px-3 py-1.5 rounded bg-blue-800 text-white hover:bg-blue-900 disabled:opacity-50"
              >
                Insert
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
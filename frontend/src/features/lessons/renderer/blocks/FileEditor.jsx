// src/features/lessons/editor/blocks/FileEditor.jsx
import { useState, useRef } from "react";
import { Upload, Link2, Loader2, Trash2, File, Check } from "lucide-react";
import { uploadToR2, validateFile, formatBytes } from "../R2UploadHelper";

export function FileEditor({ block, onChange, lessonId }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [urlInput, setUrlInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const fileRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file, "file");
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
        folder: "lesson-files",
        lessonId,
        onProgress: setProgress,
      });
      onChange({
        ...block,
        url: result.url,
        key: result.key,
        name: result.name,
        size: result.size,
        mimeType: result.contentType,
      });
    } catch (err) {
      console.error("file upload error:", err);
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleUrlInsert = () => {
    const url = urlInput.trim();
    const name = nameInput.trim();
    if (!url || !/^https?:\/\//i.test(url)) {
      setError("Enter a valid URL starting with http:// or https://");
      return;
    }
    if (!name) {
      setError("Enter a display name for the file.");
      return;
    }
    onChange({ ...block, url, name });
  };

  const handleRemove = () => {
    onChange({ ...block, url: "", key: undefined, name: "", size: undefined });
  };

  if (block.url) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 flex-shrink-0">
          <File className="h-5 w-5 text-slate-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-900 truncate">
            {block.name || "Download"}
          </div>
          <div className="text-xs text-slate-500">
            {block.size ? formatBytes(block.size) : "External link"}
          </div>
        </div>
        <button
          type="button"
          onClick={handleRemove}
          className="p-1.5 text-slate-400 hover:text-red-600 rounded flex-shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <File className="h-4 w-4 text-slate-500" />
        <span className="text-sm font-medium text-slate-700">
          Add file attachment
        </span>
      </div>

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
        </div>
      ) : (
        <>
          <input
            ref={fileRef}
            type="file"
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
            <span className="text-xs text-slate-400">Max 50MB</span>
          </button>

          <div className="relative my-3">
            <div className="border-t border-slate-200" />
            <span className="absolute left-1/2 -translate-x-1/2 -top-2 text-xs text-slate-400 bg-slate-50/60 px-2">
              or
            </span>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Display name (e.g. Worksheet 1)"
              className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:border-blue-800"
            />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://…"
              className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:border-blue-800"
            />
            <button
              type="button"
              onClick={handleUrlInsert}
              disabled={!urlInput.trim() || !nameInput.trim()}
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded bg-blue-800 text-white hover:bg-blue-900 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              Add file link
            </button>
          </div>
        </>
      )}
    </div>
  );
}
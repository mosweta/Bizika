// src/features/lessons/renderer/blocks/FileBlock.jsx
import { Download, FileText } from "lucide-react";

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileBlock({ url, name = "Download", size, mimeType }) {
  if (!url) return null;

  return (
    <a
      href={url}
      download
      target="_blank"
      rel="noopener noreferrer"
      className="my-4 flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:border-slate-300 hover:bg-slate-50 transition-colors"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 flex-shrink-0">
        <FileText className="h-5 w-5 text-slate-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-900 truncate">
          {name}
        </div>
        <div className="text-xs text-slate-500">
          {size ? formatBytes(size) : "Download"}
        </div>
      </div>
      <Download className="h-4 w-4 text-slate-400 flex-shrink-0" />
    </a>
  );
}
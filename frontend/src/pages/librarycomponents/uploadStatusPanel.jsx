// src/pages/librarycomponents/uploadStatusPanel.jsx
import { useState, useEffect } from "react";
import {
  CloudUpload, FileUp, CheckCircle, Loader2,
  AlertTriangle, Trash2, HardDrive, X,
} from "lucide-react";

export function UploadStatusPanel({
  uploadQueue,
  uploadProgress,
  storageStats,
  onDismiss,
}) {
  const [now, setNow] = useState(Date.now());

  // Tick once a second only if something is actively uploading
  useEffect(() => {
    const hasActive = uploadQueue.some((item) => item.status === "uploading");
    if (!hasActive) return;

    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [uploadQueue]);

  if (uploadQueue.length === 0 && !storageStats) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 bg-white rounded-lg border border-slate-200 shadow-lg max-h-[400px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <CloudUpload className="h-4 w-4 text-slate-500" />
          <h4 className="text-sm font-semibold text-slate-900">Uploads</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {uploadQueue.length} {uploadQueue.length === 1 ? "item" : "items"}
          </span>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 text-slate-400 hover:text-slate-700 rounded"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Queue */}
      <div className="flex-1 overflow-y-auto">
        {uploadQueue.length === 0 ? (
          <div className="p-6 text-center">
            <FileUp className="mx-auto h-6 w-6 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">No active uploads</p>
          </div>
        ) : (
          uploadQueue.map((item) => (
            <UploadRow
              key={item.id}
              item={item}
              progress={uploadProgress[item.id] || 0}
              now={now}
            />
          ))
        )}
      </div>

      {/* Storage footer */}
      {storageStats && (
        <div className="border-t border-slate-100 px-4 py-2.5 flex-shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <HardDrive className="h-3 w-3" />
              Storage
            </span>
            <span className="text-slate-700">
              {storageStats.formattedSize} · {storageStats.fileCount}{" "}
              {storageStats.fileCount === 1 ? "file" : "files"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Single upload row
// ─────────────────────────────────────────────────────────────
function UploadRow({ item, progress, now }) {
  const statusConfig = {
    queued: {
      icon: <Loader2 className="h-3.5 w-3.5 text-slate-400" />,
      label: "Queued",
      labelCls: "text-slate-500",
    },
    uploading: {
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-800" />,
      label: "Uploading",
      labelCls: "text-blue-800",
    },
    completed: {
      icon: <CheckCircle className="h-3.5 w-3.5 text-green-600" />,
      label: "Done",
      labelCls: "text-green-700",
    },
    failed: {
      icon: <AlertTriangle className="h-3.5 w-3.5 text-red-600" />,
      label: "Failed",
      labelCls: "text-red-700",
    },
    deleting: {
      icon: <Trash2 className="h-3.5 w-3.5 text-slate-500" />,
      label: "Deleting",
      labelCls: "text-slate-500",
    },
  };

  const config = statusConfig[item.status] || statusConfig.queued;
  const elapsed =
    item.startTime && item.status === "uploading"
      ? Math.round((now - item.startTime) / 1000)
      : null;

  return (
    <div className="px-4 py-2.5 border-b border-slate-100 last:border-0">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          {config.icon}
          <span className="text-xs text-slate-700 truncate">
            {item.file?.name || "Resource"}
          </span>
        </div>
        <span className={`text-xs flex-shrink-0 ${config.labelCls}`}>
          {config.label}
        </span>
      </div>

      {item.status === "uploading" && (
        <div>
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-800 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
            <span>{progress}%</span>
            {elapsed !== null && <span>{elapsed}s</span>}
          </div>
        </div>
      )}

      {item.status === "failed" && item.error && (
        <p className="mt-1 text-xs text-red-600 truncate">{item.error}</p>
      )}
    </div>
  );
}
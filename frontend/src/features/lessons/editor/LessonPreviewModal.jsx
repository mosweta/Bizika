// src/features/lessons/editor/LessonPreviewModal.jsx
import { X } from "lucide-react";
import { ReadingLessonRenderer } from "../renderer/ReadingLessonRenderer";

export function LessonPreviewModal({ title, content, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Preview
            </span>
            <span className="text-sm text-slate-900 truncate max-w-md">
              {title || "Untitled lesson"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
            Close
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        <div className="rounded-lg border border-slate-200 bg-white p-6 sm:p-8">
          <ReadingLessonRenderer
            content={content}
            title={title}
            objectives={content.objectives || []}
          />
        </div>
      </div>
    </div>
  );
}
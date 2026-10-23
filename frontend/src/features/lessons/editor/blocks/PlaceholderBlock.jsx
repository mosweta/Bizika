// src/features/lessons/editor/blocks/PlaceholderBlock.jsx
import {
  Image as ImageIcon, Video, File, Minus,
  HelpCircle, Table as TableIcon,
} from "lucide-react";

const META = {
  image: { icon: ImageIcon, label: "Image", hint: "Image editor coming in the next update" },
  video: { icon: Video, label: "Video embed", hint: "Video picker coming soon" },
  file: { icon: File, label: "File attachment", hint: "File picker coming soon" },
  question: { icon: HelpCircle, label: "Question", hint: "Question editor coming soon" },
  table: { icon: TableIcon, label: "Table", hint: "Table editor coming soon" },
  divider: { icon: Minus, label: "Divider", hint: "Renders as a horizontal line" },
};

export function PlaceholderBlock({ block }) {
  const meta = META[block.type] || { icon: File, label: block.type, hint: "" };
  const Icon = meta.icon;

  if (block.type === "divider") {
    return (
      <div className="py-2">
        <hr className="border-slate-200" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-white border border-slate-200 flex-shrink-0">
          <Icon className="h-4 w-4 text-slate-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-700">{meta.label}</div>
          {block.url && (
            <div className="text-xs text-slate-500 truncate mt-0.5">{block.url}</div>
          )}
          {block.name && (
            <div className="text-xs text-slate-500 truncate mt-0.5">{block.name}</div>
          )}
          {block.question && (
            <div className="text-xs text-slate-500 truncate mt-0.5">{block.question}</div>
          )}
          {meta.hint && (
            <div className="text-xs text-slate-400 mt-1">{meta.hint}</div>
          )}
        </div>
      </div>
    </div>
  );
}
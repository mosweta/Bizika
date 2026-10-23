// src/features/lessons/editor/SlashMenu.jsx
import { useEffect, useState, useRef } from "react";
import {
  Type, Heading2, Heading3, Heading4, List, ListOrdered,
  Quote, Minus, Image as ImageIcon, Video, File, HelpCircle, Table as TableIcon,
} from "lucide-react";

const BLOCK_TYPES = [
  { type: "paragraph", label: "Paragraph", icon: Type, hint: "Plain text" },
  { type: "heading", level: 2, label: "Heading 2", icon: Heading2, hint: "Large section heading" },
  { type: "heading", level: 3, label: "Heading 3", icon: Heading3, hint: "Medium section heading" },
  { type: "heading", level: 4, label: "Heading 4", icon: Heading4, hint: "Small section heading" },
  { type: "list", ordered: false, label: "Bulleted list", icon: List, hint: "Unordered list" },
  { type: "list", ordered: true, label: "Numbered list", icon: ListOrdered, hint: "Ordered list" },
  { type: "callout", label: "Callout", icon: Quote, hint: "Info, tip, or warning box" },
  { type: "divider", label: "Divider", icon: Minus, hint: "Horizontal rule" },
  { type: "image", label: "Image", icon: ImageIcon, hint: "Upload or link an image" },
  { type: "video", label: "Video", icon: Video, hint: "Embed a video" },
  { type: "file", label: "File", icon: File, hint: "Attach a downloadable file" },
  { type: "question", label: "Question", icon: HelpCircle, hint: "Interactive quiz block" },
  { type: "table", label: "Table", icon: TableIcon, hint: "Simple data table" },
];

export function SlashMenu({ query, onSelect, onClose }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);

  const filtered = BLOCK_TYPES.filter((b) =>
    b.label.toLowerCase().includes((query || "").toLowerCase())
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const el = containerRef.current?.querySelector(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) onSelect(filtered[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose?.();
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, filtered]);

  if (filtered.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 w-64">
        <p className="text-xs text-slate-500">No blocks match.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="bg-white border border-slate-200 rounded-lg shadow-lg py-1 max-h-72 overflow-y-auto w-64"
    >
      <div className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase tracking-wide border-b border-slate-100 mb-1">
        Blocks
      </div>
      {filtered.map((b, i) => {
        const Icon = b.icon;
        const isActive = i === activeIndex;
        return (
          <button
            key={`${b.type}-${b.level || ""}-${b.ordered ?? ""}-${i}`}
            data-idx={i}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(b);
            }}
            onMouseEnter={() => setActiveIndex(i)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
              isActive ? "bg-blue-50" : ""
            }`}
          >
            <div
              className={`flex h-7 w-7 items-center justify-center rounded border flex-shrink-0 ${
                isActive
                  ? "bg-white border-blue-200 text-blue-800"
                  : "bg-white border-slate-200 text-slate-500"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-900">{b.label}</div>
              <div className="text-xs text-slate-400 truncate">{b.hint}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
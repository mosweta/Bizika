// src/features/lessons/editor/blocks/CalloutEditor.jsx
import { useEffect } from "react";
import { EditorContent } from "@tiptap/react";
import { Info, Lightbulb, AlertTriangle, KeyRound } from "lucide-react";
import { useBlockEditor } from "../useBlockEditor";

const VARIANTS = {
  info: { icon: Info, label: "Info", cls: "border-blue-200 bg-blue-50/60", iconCls: "text-blue-800" },
  tip: { icon: Lightbulb, label: "Tip", cls: "border-amber-200 bg-amber-50/60", iconCls: "text-amber-700" },
  warning: { icon: AlertTriangle, label: "Warning", cls: "border-red-200 bg-red-50/60", iconCls: "text-red-700" },
  key_concept: { icon: KeyRound, label: "Key concept", cls: "border-slate-300 bg-slate-50", iconCls: "text-slate-700" },
};

export function CalloutEditor({ block, onChange, registerEditor, autoFocus }) {
  const variant = block.variant || "info";
  const config = VARIANTS[variant] || VARIANTS.info;
  const Icon = config.icon;

  const editor = useBlockEditor({
    content: block.content || [],
    onChange: (content) => onChange({ ...block, content }),
    placeholder: "Callout body…",
  });

  useEffect(() => {
    if (editor && registerEditor) {
      registerEditor(editor);
      return () => registerEditor(null);
    }
  }, [editor, registerEditor]);

  useEffect(() => {
    if (autoFocus && editor) editor.commands.focus("end");
  }, [autoFocus, editor]);

  if (!editor) return null;

  return (
    <div className={`rounded-lg border ${config.cls} overflow-hidden`}>
      {/* Variant strip */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-200/60">
        <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${config.iconCls}`} />
        <select
          value={variant}
          onChange={(e) => onChange({ ...block, variant: e.target.value })}
          className="text-xs bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-600 font-medium cursor-pointer"
        >
          {Object.entries(VARIANTS).map(([id, v]) => (
            <option key={id} value={id}>
              {v.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={block.title || ""}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
          placeholder="Title (optional)"
          className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
        />
      </div>

      {/* Body */}
      <div className="px-3 py-2">
        <EditorContent
          editor={editor}
          className="text-sm text-slate-700 leading-relaxed [&_.ProseMirror]:outline-none [&_p.is-empty:first-child::before]:text-slate-400 [&_p.is-empty:first-child::before]:content-[attr(data-placeholder)] [&_p.is-empty:first-child::before]:float-left [&_p.is-empty:first-child::before]:pointer-events-none"
        />
      </div>
    </div>
  );
}
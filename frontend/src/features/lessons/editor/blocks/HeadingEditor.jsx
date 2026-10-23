// src/features/lessons/editor/blocks/HeadingEditor.jsx
import { useEffect } from "react";
import { EditorContent } from "@tiptap/react";
import { useBlockEditor } from "../useBlockEditor";
import { handleBlockKeyDown } from "../keyboardFlow";

const LEVEL_CLASSES = {
  2: "text-2xl font-semibold tracking-tight text-slate-900",
  3: "text-xl font-semibold tracking-tight text-slate-900",
  4: "text-lg font-semibold text-slate-900",
};

export function HeadingEditor({
  block,
  onChange,
  onSplit,
  onMerge,
  onFocusPrev,
  onFocusNext,
  registerEditor,
  autoFocus,
}) {
  const level = block.level || 2;
  const levelClass = LEVEL_CLASSES[level] || LEVEL_CLASSES[2];

  const editor = useBlockEditor({
    content: block.content || [],
    onChange: (content) => onChange({ ...block, content }),
    onKeyDown: (event) =>
      handleBlockKeyDown(event, editor, {
        onSplit: () => onSplit?.(editor) ?? false,
        onMerge: () => onMerge?.(editor) ?? false,
        onFocusPrev,
        onFocusNext,
        allowEnter: true, // headings always split on Enter
      }),
    placeholder: `Heading ${level}`,
  });

  useEffect(() => {
    if (editor && registerEditor) {
      registerEditor(editor);
      return () => registerEditor(null);
    }
  }, [editor, registerEditor]);

  useEffect(() => {
    if (autoFocus && editor) {
      editor.commands.focus("end");
    }
  }, [autoFocus, editor]);

  if (!editor) return null;

  return (
    <div className="flex items-start gap-2 group">
      <select
        value={level}
        onChange={(e) => onChange({ ...block, level: Number(e.target.value) })}
        className="mt-2 text-xs border border-slate-200 rounded px-1.5 py-0.5 bg-white text-slate-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        title="Heading level"
      >
        <option value={2}>H2</option>
        <option value={3}>H3</option>
        <option value={4}>H4</option>
      </select>
      <div className={`flex-1 ${levelClass}`}>
        <EditorContent
          editor={editor}
          className="[&_.ProseMirror]:outline-none [&_.ProseMirror]:py-1 [&_p.is-empty:first-child::before]:text-slate-300 [&_p.is-empty:first-child::before]:content-[attr(data-placeholder)] [&_p.is-empty:first-child::before]:float-left [&_p.is-empty:first-child::before]:pointer-events-none"
        />
      </div>
    </div>
  );
}
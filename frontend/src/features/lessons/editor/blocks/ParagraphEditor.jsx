// src/features/lessons/editor/blocks/ParagraphEditor.jsx
import { useEffect } from "react";
import { EditorContent } from "@tiptap/react";
import { useBlockEditor } from "../useBlockEditor";
import { RichToolbar } from "../RichToolbar";
import { handleBlockKeyDown } from "../keyboardFlow";

export function ParagraphEditor({ block, onChange, onSplit, onMerge, onFocusPrev, onFocusNext, registerEditor, autoFocus }) {
  const editor = useBlockEditor({
    content: block.content || [],
    onChange: (content) => onChange({ ...block, content }),
    onKeyDown: (event, view) => {
      // Only handle when selection is a collapsed caret
      return handleBlockKeyDown(event, editor, {
        onSplit: () => {
          if (!onSplit) return false;
          return onSplit(editor);
        },
        onMerge: () => {
          if (!onMerge) return false;
          return onMerge(editor);
        },
        onFocusPrev,
        onFocusNext,
        allowEnter: false, // paragraphs split on Enter when at end
      });
    },
    placeholder: "Type something…",
  });

  // Register this editor with the parent so it can focus it programmatically
  useEffect(() => {
    if (editor && registerEditor) {
      registerEditor(editor);
      return () => registerEditor(null);
    }
  }, [editor, registerEditor]);

  // Autofocus when this block is the freshly created one
  useEffect(() => {
    if (autoFocus && editor) {
      editor.commands.focus("end");
    }
  }, [autoFocus, editor]);

  if (!editor) return null;

  return (
    <div className="rounded-md border border-transparent focus-within:border-slate-200 focus-within:bg-slate-50/40 transition-colors">
      <RichToolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="prose prose-slate max-w-none px-3 py-2 text-base text-slate-700 leading-relaxed [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[1.5em] [&_p.is-empty:first-child::before]:text-slate-400 [&_p.is-empty:first-child::before]:content-[attr(data-placeholder)] [&_p.is-empty:first-child::before]:float-left [&_p.is-empty:first-child::before]:pointer-events-none"
      />
    </div>
  );
}
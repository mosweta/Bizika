// src/features/lessons/editor/blocks/ListEditor.jsx
import { useEffect } from "react";
import { Plus, X, List as ListIcon, ListOrdered } from "lucide-react";

/**
 * Lists are edited as structured items, not as a TipTap document.
 * Each item is a small single-line TipTap editor. Simpler than
 * trying to model a whole list inside one editor.
 */
import { useBlockEditor } from "../useBlockEditor";
import { EditorContent } from "@tiptap/react";

function ListItemEditor({ value, onChange, onEnter, onBackspaceEmpty, autoFocus }) {
  const editor = useBlockEditor({
    content: value || [],
    onChange,
    onKeyDown: (event) => {
      if (event.key === "Enter") {
        onEnter?.();
        return true;
      }
      if (event.key === "Backspace" && editor?.isEmpty) {
        onBackspaceEmpty?.();
        return true;
      }
      return false;
    },
    placeholder: "List item",
  });

  useEffect(() => {
    if (autoFocus && editor) editor.commands.focus("end");
  }, [autoFocus, editor]);

  if (!editor) return null;

  return (
    <EditorContent
      editor={editor}
      className="flex-1 min-w-0 [&_.ProseMirror]:outline-none [&_p.is-empty:first-child::before]:text-slate-300 [&_p.is-empty:first-child::before]:content-[attr(data-placeholder)] [&_p.is-empty:first-child::before]:float-left [&_p.is-empty:first-child::before]:pointer-events-none"
    />
  );
}

export function ListEditor({ block, onChange }) {
  const ordered = Boolean(block.ordered);
  const items = block.items || [[]];

  const updateItem = (i, richText) => {
    const next = [...items];
    next[i] = richText;
    onChange({ ...block, items: next });
  };

  const addItem = (afterIndex) => {
    const next = [...items];
    next.splice(afterIndex + 1, 0, []);
    onChange({ ...block, items: next });
  };

  const removeItem = (i) => {
    if (items.length <= 1) return;
    onChange({ ...block, items: items.filter((_, idx) => idx !== i) });
  };

  const toggleOrdered = () => {
    onChange({ ...block, ordered: !ordered });
  };

  return (
    <div className="group">
      <div className="flex items-center gap-1 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={toggleOrdered}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 px-1.5 py-0.5 rounded hover:bg-slate-100"
          title={ordered ? "Switch to bulleted" : "Switch to numbered"}
        >
          {ordered ? <ListIcon className="h-3 w-3" /> : <ListOrdered className="h-3 w-3" />}
          <span>{ordered ? "Numbered" : "Bulleted"}</span>
        </button>
      </div>

      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 group/item">
            <span className="flex h-6 w-6 items-center justify-center text-xs text-slate-400 flex-shrink-0 select-none">
              {ordered ? `${i + 1}.` : "•"}
            </span>
            <ListItemEditor
              value={item}
              onChange={(v) => updateItem(i, v)}
              onEnter={() => addItem(i)}
              onBackspaceEmpty={() => removeItem(i)}
            />
            <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0 pt-1">
              <button
                type="button"
                onClick={() => addItem(i)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
                title="Insert item below"
              >
                <Plus className="h-3 w-3" />
              </button>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="p-1 text-slate-400 hover:text-red-600 rounded"
                  title="Remove item"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => addItem(items.length - 1)}
        className="mt-1 ml-8 text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
      >
        <Plus className="h-3 w-3" />
        Add item
      </button>
    </div>
  );
}
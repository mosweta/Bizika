// src/features/lessons/editor/RichToolbar.jsx
import { Bold, Italic, Strikethrough, Code, Link as LinkIcon, X } from "lucide-react";
import { useEffect, useState, useRef } from "react";

function ToolbarButton({ onClick, active, children, title }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // keep focus in editor
        onClick?.();
      }}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? "bg-blue-50 text-blue-800"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

export function RichToolbar({ editor }) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (showLinkInput && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showLinkInput]);

  if (!editor) return null;

  const applyLink = () => {
    if (linkUrl.trim()) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl.trim() })
        .run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  };

  const removeLink = () => {
    editor.chain().focus().unsetLink().run();
    setShowLinkInput(false);
  };

  const openLink = () => {
    const existing = editor.getAttributes("link").href || "";
    setLinkUrl(existing);
    setShowLinkInput(true);
  };

  return (
    <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-slate-100 bg-slate-50/60 flex-wrap">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="Strikethrough"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive("code")}
        title="Inline code"
      >
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>

      <span className="w-px h-4 bg-slate-200 mx-1" />

      <ToolbarButton
        onClick={openLink}
        active={editor.isActive("link")}
        title="Insert link"
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </ToolbarButton>

      {showLinkInput && (
        <div className="flex items-center gap-1 ml-1">
          <input
            ref={inputRef}
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setShowLinkInput(false);
                setLinkUrl("");
              }
            }}
            placeholder="https://…"
            className="w-40 text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-800"
          />
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              applyLink();
            }}
            className="text-xs px-2 py-1 rounded bg-blue-800 text-white hover:bg-blue-900"
          >
            Apply
          </button>
          {editor.isActive("link") && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                removeLink();
              }}
              className="text-xs px-1.5 py-1 rounded text-red-600 hover:bg-red-50"
              title="Remove link"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setShowLinkInput(false);
              setLinkUrl("");
            }}
            className="text-xs px-1.5 py-1 rounded text-slate-500 hover:bg-slate-100"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
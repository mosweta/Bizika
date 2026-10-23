// src/features/lessons/editor/useBlockEditor.js
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";

/**
 * TipTap config for a single text-bearing block.
 *
 * @param {object}   opts
 * @param {Array}    opts.content       Rich-text array ([{ text, marks }])
 * @param {Function} opts.onChange      Called with the new rich-text array
 * @param {Function} opts.onKeyDown     Called before TipTap handles the event.
 *                                      Return true to preventDefault (we handle it).
 *                                      Used for block-level navigation.
 * @param {string}   opts.placeholder
 * @param {boolean}  opts.multiline     If false, Enter is intercepted for
 *                                      block-splitting (single-line blocks
 *                                      like headings)
 */
export function useBlockEditor({
  content = [],
  onChange,
  onKeyDown,
  placeholder = "",
  multiline = true,
}) {
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          // We don't want block-level nodes — only inline
          heading: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
          // Keep these inline marks:
          bold: true,
          italic: true,
          strike: true,
          code: true,
        }),
        Link.configure({
          openOnClick: false,
          autolink: true,
          HTMLAttributes: {
            class: "text-blue-800 underline underline-offset-2",
          },
        }),
        Typography,
        ...(placeholder
          ? [
              Placeholder.configure({
                placeholder,
                emptyEditorClass: "is-empty",
              }),
            ]
          : []),
      ],
      content: richTextToTipTap(content),
      editorProps: {
        attributes: {
          class: "focus:outline-none",
        },
        handleKeyDown: (view, event) => {
          // Defer to consumer first
          if (onKeyDown && onKeyDown(event, view)) {
            return true;
          }
          return false;
        },
      },
      onUpdate: ({ editor }) => {
        if (!onChange) return;
        const json = editor.getJSON();
        const rich = tipTapToRichText(json);
        onChange(rich);
      },
    },
    // Recreate the editor when the block's value changes externally
    // (e.g. switching which block is active). This is intentional —
    // keeps the editor stateless.
    []
  );

  return editor;
}

// ─────────────────────────────────────────────────────────────
// Conversion helpers
// ─────────────────────────────────────────────────────────────
// Our stored format: [{ text, marks: [{ type: "bold" }] }]
// TipTap doc: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text, marks }] }] }

export function richTextToTipTap(richText = []) {
  if (!Array.isArray(richText) || richText.length === 0) {
    return {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
  }
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: richText
          .filter((n) => n && typeof n.text === "string")
          .map((node) => ({
            type: "text",
            text: node.text,
            ...(node.marks && node.marks.length ? { marks: node.marks } : {}),
          })),
      },
    ],
  };
}

export function tipTapToRichText(doc) {
  if (!doc || !doc.content) return [];
  const para = doc.content[0];
  if (!para || !para.content) return [];
  return para.content
    .filter((n) => n && n.type === "text")
    .map((n) => ({
      text: n.text || "",
      ...(n.marks && n.marks.length ? { marks: n.marks } : {}),
    }));
}
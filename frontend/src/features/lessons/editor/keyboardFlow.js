// src/features/lessons/editor/keyboardFlow.js

/**
 * Handle a keydown event for a single block. The parent passes callbacks
 * that describe what "split", "merge", "focusNext", "focusPrev" mean
 * in the current context.
 *
 * Returns true if the event was handled (caller should preventDefault).
 */
export function handleBlockKeyDown(event, editor, handlers) {
  const { key, shiftKey } = event;
  const { onSplit, onMerge, onFocusNext, onFocusPrev, allowEnter = true } = handlers;

  // ── Enter ───────────────────────────────────────────────
  if (key === "Enter" && !shiftKey) {
    const isAtEnd = isCursorAtEnd(editor);
    // Single-line blocks (headings) always split on Enter
    if (!allowEnter || isAtEnd) {
      const handled = onSplit?.();
      return handled ?? true;
    }
    // Multiline block, mid-text: let TipTap insert a line break
    return false;
  }

  // ── Backspace ───────────────────────────────────────────
  if (key === "Backspace") {
    const isEmpty = editor.isEmpty || isEditorEmpty(editor);
    const isAtStart = isCursorAtStart(editor);
    if (isEmpty || isAtStart) {
      const handled = onMerge?.();
      return handled ?? true;
    }
    return false;
  }

  // ── Arrow up/down at boundaries ─────────────────────────
  if (key === "ArrowUp" && isCursorAtStart(editor)) {
    const handled = onFocusPrev?.();
    return handled ?? false;
  }
  if (key === "ArrowDown" && isCursorAtEnd(editor)) {
    const handled = onFocusNext?.();
    return handled ?? false;
  }

  return false;
}

// ─────────────────────────────────────────────────────────────
// Cursor position helpers
// ─────────────────────────────────────────────────────────────
function isCursorAtStart(editor) {
  if (!editor) return false;
  const { from, empty } = editor.state.selection;
  if (!empty) return false;
  // Position 1 is the very start inside the paragraph node
  return from <= 1;
}

function isCursorAtEnd(editor) {
  if (!editor) return false;
  const { to, empty } = editor.state.selection;
  if (!empty) return false;
  const docEnd = editor.state.doc.content.size - 1;
  return to >= docEnd;
}

function isEditorEmpty(editor) {
  if (!editor) return false;
  if (editor.isEmpty) return true;
  const json = editor.getJSON();
  const first = json.content?.[0];
  if (!first) return true;
  if (!first.content || first.content.length === 0) return true;
  return first.content.every((n) => !n.text || n.text.trim() === "");
}
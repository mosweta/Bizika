// src/features/lessons/editor/SectionEditor.jsx
import { useState, useRef, useCallback, useEffect } from "react";
import {
  GripVertical, ChevronDown, ChevronUp, Trash2, Plus, Boxes, Type, List as ListIcon,
} from "lucide-react";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { BlockWrapper } from "./BlockWrapper";
import { BlockEditor } from "./BlockEditor";
import { SlashMenu } from "./SlashMenu";

// ─────────────────────────────────────────────────────────────
// Block ID helper
// ─────────────────────────────────────────────────────────────
function makeBlockId(type) {
  return `blk_${type}_${Math.random().toString(36).slice(2, 9)}`;
}

function makeDefaultBlock(type, extra = {}) {
  const base = { id: makeBlockId(type), type, ...extra };
  switch (type) {
    case "paragraph":
      return { ...base, content: [] };
    case "heading":
      return { ...base, level: 2, content: [] };
    case "list":
      return { ...base, ordered: false, items: [[]] };
    case "callout":
      return { ...base, variant: "info", content: [] };
    case "divider":
      return base;
    case "image":
      return { ...base, url: "", alt: "" };
    case "video":
      return { ...base, url: "" };
    case "file":
      return { ...base, url: "", name: "" };
    case "question":
      return {
        ...base,
        questionType: "multiple_choice",
        question: "",
        options: [
          { id: "a", text: "" },
          { id: "b", text: "" },
        ],
        correctOption: "a",
        explanation: "",
      };
    case "table":
      return {
        ...base,
        headers: [[{ text: "" }], [{ text: "" }]],
        rows: [[[{ text: "" }], [{ text: "" }]]],
      };
    default:
      return base;
  }
}

// ─────────────────────────────────────────────────────────────
// SectionEditor
// ─────────────────────────────────────────────────────────────
export function SectionEditor({ section, index, onUpdate, onDelete }) {
  const [collapsed, setCollapsed] = useState(false);
  const [slashMenu, setSlashMenu] = useState(null); // { blockIndex, rect, query }
  const [autoFocusBlockId, setAutoFocusBlockId] = useState(null);
  const editorRegistry = useRef(new Map()); // blockId → editor instance

  const blocks = section.blocks || [];

  const setBlocks = useCallback(
    (nextBlocks) => {
      onUpdate({ blocks: nextBlocks });
    },
    [onUpdate]
  );

  const updateBlock = (blockId, patch) => {
    setBlocks(blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)));
  };

  const registerEditor = useCallback((blockId, editor) => {
    if (!blockId) return;
    if (editor) editorRegistry.current.set(blockId, editor);
    else editorRegistry.current.delete(blockId);
  }, []);

  const insertBlockAfter = (afterIndex, block) => {
    const next = [...blocks];
    next.splice(afterIndex + 1, 0, block);
    setBlocks(next);
    setAutoFocusBlockId(block.id);
  };

  const deleteBlock = (blockId) => {
    setBlocks(blocks.filter((b) => b.id !== blockId));
  };

  const handleSplit = (blockIndex, editor) => {
    // Split the current block at the caret into two blocks
    const block = blocks[blockIndex];
    if (!block) return false;

    const { from } = editor.state.selection;
    const fullText = editor.getText();
    // Crude split by character index — TipTap's position system is doc-relative
    // but for a single-paragraph editor, position ~ character index + 1
    const splitAt = Math.max(0, from - 1);
    const beforeText = fullText.slice(0, splitAt);
    const afterText = fullText.slice(splitAt);

    const beforeBlock = {
      ...block,
      id: block.id,
      content: beforeText ? [{ text: beforeText }] : [],
    };
    const afterBlock = makeDefaultBlock("paragraph");
    afterBlock.content = afterText ? [{ text: afterText }] : [];

    const next = [...blocks];
    next[blockIndex] = beforeBlock;
    next.splice(blockIndex + 1, 0, afterBlock);
    setBlocks(next);
    setAutoFocusBlockId(afterBlock.id);
    return true;
  };

  const handleMerge = (blockIndex, editor) => {
    // Merge this block with the previous one
    if (blockIndex === 0) return false;
    const prevBlock = blocks[blockIndex - 1];
    const currentBlock = blocks[blockIndex];

    // Only merge if the previous is a text block
    if (!["paragraph", "heading", "callout"].includes(prevBlock.type)) return false;

    const currentText = (currentBlock.content || [])
      .map((n) => n.text)
      .join("");
    const prevContent = prevBlock.content || [];
    const mergedContent = [...prevContent];
    if (currentText) mergedContent.push({ text: currentText });

    const next = [...blocks];
    next[blockIndex - 1] = { ...prevBlock, content: mergedContent };
    next.splice(blockIndex, 1);
    setBlocks(next);
    setAutoFocusBlockId(prevBlock.id);
    return true;
  };

  const focusBlock = (blockId, position = "end") => {
    const editor = editorRegistry.current.get(blockId);
    if (editor) {
      editor.commands.focus(position);
      return true;
    }
    return false;
  };

  const focusPrevBlock = (blockIndex) => {
    if (blockIndex === 0) return false;
    const prev = blocks[blockIndex - 1];
    return focusBlock(prev.id, "end");
  };

  const focusNextBlock = (blockIndex) => {
    if (blockIndex >= blocks.length - 1) return false;
    const next = blocks[blockIndex + 1];
    return focusBlock(next.id, "start");
  };

  const handleSlashSelect = (blockType) => {
    if (!slashMenu) return;
    const { blockIndex } = slashMenu;

    // Replace the target block with the new type
    const replacement = makeDefaultBlock(blockType.type, {
      ...(blockType.level ? { level: blockType.level } : {}),
      ...(blockType.ordered !== undefined ? { ordered: blockType.ordered } : {}),
      ...(blockType.type === "callout" ? { variant: "info" } : {}),
    });

    const next = [...blocks];
    next[blockIndex] = replacement;
    setBlocks(next);
    setAutoFocusBlockId(replacement.id);
    setSlashMenu(null);
  };

  // Close slash menu on outside click
  useEffect(() => {
    if (!slashMenu) return;
    const handler = (e) => {
      if (e.target.closest("[data-slash-menu]")) return;
      setSlashMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [slashMenu]);

  return (
    <Draggable draggableId={section.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`rounded-lg border bg-white overflow-hidden transition-shadow ${
            snapshot.isDragging
              ? "border-blue-800 shadow-lg"
              : "border-slate-200"
          }`}
        >
          {/* Section header */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 bg-slate-50/60">
            <div
              {...provided.dragHandleProps}
              className="cursor-grab active:cursor-grabbing flex-shrink-0"
            >
              <GripVertical className="h-4 w-4 text-slate-300 hover:text-slate-500" />
            </div>

            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600 flex-shrink-0">
              {index + 1}
            </span>

            <input
              type="text"
              value={section.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className="flex-1 min-w-0 bg-transparent text-sm font-medium text-slate-900 focus:outline-none focus:bg-white rounded px-1 py-0.5"
              placeholder="Section title"
            />

            <span className="text-xs text-slate-400 tabular-nums flex-shrink-0">
              {blocks.length} blocks
            </span>

            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded flex-shrink-0"
            >
              {collapsed ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={onDelete}
              className="p-1 text-slate-400 hover:text-red-600 rounded flex-shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Block list */}
          {!collapsed && (
            <div className="p-4">
              <Droppable droppableId={`blocks-${section.id}`} type="BLOCK">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-1 ${
                      snapshot.isDraggingOver ? "bg-blue-50/30 rounded" : ""
                    }`}
                  >
                    {blocks.map((block, bi) => (
                      <BlockWrapper
                        key={block.id}
                        block={block}
                        index={bi}
                        onInsertBelow={() =>
                          insertBlockAfter(bi, makeDefaultBlock("paragraph"))
                        }
                        onDelete={() => deleteBlock(block.id)}
                      >
                        <BlockEditor
                          block={block}
                          onChange={(next) => updateBlock(block.id, next)}
                          onSplit={(editor) => handleSplit(bi, editor)}
                          onMerge={(editor) => handleMerge(bi, editor)}
                          onFocusPrev={() => focusPrevBlock(bi)}
                          onFocusNext={() => focusNextBlock(bi)}
                          registerEditor={(editor) =>
                            registerEditor(block.id, editor)
                          }
                          autoFocus={autoFocusBlockId === block.id}
                        />
                      </BlockWrapper>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              {/* Add block at bottom */}
              <button
                type="button"
                onClick={() => {
                  const newBlock = makeDefaultBlock("paragraph");
                  setBlocks([...blocks, newBlock]);
                  setAutoFocusBlockId(newBlock.id);
                }}
                className="mt-3 w-full rounded-lg border border-dashed border-slate-200 py-2 text-xs text-slate-500 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50/60 inline-flex items-center justify-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add block
              </button>

              {blocks.length === 0 && (
                <div className="mt-2 text-center py-6 rounded-lg border border-dashed border-slate-200">
                  <Boxes className="mx-auto h-5 w-5 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-500">No blocks yet</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Add a paragraph, heading, list, or other block type.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Slash menu */}
          {slashMenu && (
            <div
              data-slash-menu
              className="fixed z-50"
              style={{
                top: Math.min(slashMenu.rect.bottom + 4, window.innerHeight - 320),
                left: Math.min(slashMenu.rect.left, window.innerWidth - 280),
              }}
            >
              <SlashMenu
                query={slashMenu.query}
                onSelect={handleSlashSelect}
                onClose={() => setSlashMenu(null)}
              />
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
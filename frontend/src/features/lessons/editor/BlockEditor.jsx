// src/features/lessons/editor/BlockEditor.jsx
import { ParagraphEditor } from "./blocks/ParagraphEditor";
import { HeadingEditor } from "./blocks/HeadingEditor";
import { ListEditor } from "./blocks/ListEditor";
import { CalloutEditor } from "./blocks/CalloutEditor";
import { PlaceholderBlock } from "./blocks/PlaceholderBlock";

export function BlockEditor({
  block,
  onChange,
  onSplit,
  onMerge,
  onFocusPrev,
  onFocusNext,
  registerEditor,
  autoFocus,
}) {
  const sharedProps = {
    block,
    onChange,
    onSplit,
    onMerge,
    onFocusPrev,
    onFocusNext,
    registerEditor,
    autoFocus,
  };

  switch (block.type) {
    case "paragraph":
      return <ParagraphEditor {...sharedProps} />;
    case "heading":
      return <HeadingEditor {...sharedProps} />;
    case "list":
      return <ListEditor block={block} onChange={onChange} />;
    case "callout":
      return <CalloutEditor {...sharedProps} />;
    case "image":
    case "video":
    case "file":
    case "question":
    case "table":
    case "divider":
      return <PlaceholderBlock block={block} />;
    default:
      return (
        <div className="rounded border border-dashed border-red-300 bg-red-50 p-3 text-xs text-red-700">
          Unknown block type: <code>{block.type}</code>
        </div>
      );
  }
}
// src/features/lessons/renderer/blocks/ListBlock.jsx
import { RichTextSpan } from "./ParagraphBlock";

export function ListBlock({ ordered = false, items = [] }) {
  const Tag = ordered ? "ol" : "ul";
  const cls = ordered
    ? "list-decimal pl-6 mb-4 space-y-1.5 text-slate-700 leading-relaxed"
    : "list-disc pl-6 mb-4 space-y-1.5 text-slate-700 leading-relaxed";

  return (
    <Tag className={cls}>
      {items.map((item, i) => (
        <li key={i}>
          {Array.isArray(item)
            ? item.map((node, j) => <RichTextSpan key={j} node={node} />)
            : item}
        </li>
      ))}
    </Tag>
  );
}
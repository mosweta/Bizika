// src/features/lessons/renderer/blocks/HeadingBlock.jsx
import { RichTextSpan } from "./ParagraphBlock";

export function HeadingBlock({ level = 2, content = [] }) {
  const classes = {
    1: "text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 mt-10 mb-4 scroll-mt-24",
    2: "text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 mt-8 mb-3 scroll-mt-24",
    3: "text-lg sm:text-xl font-semibold tracking-tight text-slate-900 mt-6 mb-2 scroll-mt-24",
    4: "text-base sm:text-lg font-semibold text-slate-900 mt-5 mb-2 scroll-mt-24",
  };

  const cls = classes[level] || classes[2];
  const Tag = `h${Math.min(level, 6)}`;

  // Add an id for anchor links (TOC, section jumps)
  const id = (content.map((c) => c.text).join("") || "")
    .toLowerCase()
    .replace(/[^\w]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return (
    <Tag id={id} className={cls}>
      {content.map((node, i) => (
        <RichTextSpan key={i} node={node} />
      ))}
    </Tag>
  );
}
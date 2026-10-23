// src/features/lessons/renderer/blocks/ParagraphBlock.jsx

export function ParagraphBlock({ content = [] }) {
  return (
    <p className="text-slate-700 leading-relaxed text-base mb-4">
      {content.map((node, i) => (
        <RichTextSpan key={i} node={node} />
      ))}
    </p>
  );
}

export function RichTextSpan({ node }) {
  if (!node || typeof node !== "object") return null;

  const marks = new Set((node.marks || []).map((m) => m.type));
  let el = node.text;

  // Apply marks in order — bold wraps italic, etc.
  if (marks.has("code")) {
    return (
      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-mono text-slate-800">
        {el}
      </code>
    );
  }

  if (marks.has("bold")) el = <strong className="font-semibold text-slate-900">{el}</strong>;
  if (marks.has("italic")) el = <em>{el}</em>;
  if (marks.has("underline")) el = <span className="underline underline-offset-2">{el}</span>;
  if (marks.has("strike")) el = <span className="line-through">{el}</span>;

  // Link is last so it wraps everything
  const linkMark = (node.marks || []).find((m) => m.type === "link");
  if (linkMark?.attrs?.href) {
    el = (
      <a
        href={linkMark.attrs.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-800 underline underline-offset-2 hover:text-blue-900"
      >
        {el}
      </a>
    );
  }

  return el;
}
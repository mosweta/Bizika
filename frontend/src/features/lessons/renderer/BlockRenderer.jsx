// src/features/lessons/renderer/BlockRenderer.jsx
import { ParagraphBlock } from "./blocks/ParagraphBlock";
import { HeadingBlock } from "./blocks/HeadingBlock";
import { ListBlock } from "./blocks/ListBlock";
import { ImageBlock } from "./blocks/ImageBlock";
import { TableBlock } from "./blocks/TableBlock";
import { CalloutBlock } from "./blocks/CalloutBlock";
import { QuestionBlock } from "./blocks/QuestionBlock";
import { VideoBlock } from "./blocks/VideoBlock";
import { FileBlock } from "./blocks/FileBlock";
import { DividerBlock } from "./blocks/DividerBlock";

export function BlockRenderer({
  block,
  questionAnswers = {},
  onQuestionAnswered,
}) {
  if (!block || !block.type) return null;

  switch (block.type) {
    case "paragraph":
      return <ParagraphBlock content={block.content} />;
    case "heading":
      return <HeadingBlock level={block.level} content={block.content} />;
    case "list":
      return <ListBlock ordered={block.ordered} items={block.items} />;
    case "image":
      return (
        <ImageBlock
          url={block.url}
          alt={block.alt}
          caption={block.caption}
        />
      );
    case "table":
      return <TableBlock headers={block.headers} rows={block.rows} />;
    case "callout":
      return (
        <CalloutBlock
          variant={block.variant}
          title={block.title}
          content={block.content}
        />
      );
    case "question":
      return (
        <QuestionBlock
          block={block}
          initialAnswer={questionAnswers[block.id]?.selected ?? null}
          onAnswered={onQuestionAnswered}
        />
      );
    case "video":
      return <VideoBlock url={block.url} caption={block.caption} />;
    case "file":
      return (
        <FileBlock
          url={block.url}
          name={block.name}
          size={block.size}
          mimeType={block.mimeType}
        />
      );
    case "divider":
      return <DividerBlock />;
    default:
      // Unknown block — render a visible marker in dev, nothing in prod
      if (import.meta.env.DEV) {
        return (
          <div className="my-4 rounded border border-dashed border-red-300 bg-red-50 p-3 text-xs text-red-700">
            Unknown block type: <code>{block.type}</code>
          </div>
        );
      }
      return null;
  }
}
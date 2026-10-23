// src/features/lessons/renderer/blocks/CalloutBlock.jsx
import { Info, Lightbulb, AlertTriangle, KeyRound } from "lucide-react";
import { RichTextSpan } from "./ParagraphBlock";

const VARIANTS = {
  info: {
    icon: Info,
    bg: "bg-blue-50/70",
    border: "border-blue-200",
    iconCls: "text-blue-800",
    titleCls: "text-blue-900",
    textCls: "text-blue-900",
  },
  tip: {
    icon: Lightbulb,
    bg: "bg-amber-50/70",
    border: "border-amber-200",
    iconCls: "text-amber-700",
    titleCls: "text-amber-900",
    textCls: "text-amber-900",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-red-50/70",
    border: "border-red-200",
    iconCls: "text-red-700",
    titleCls: "text-red-900",
    textCls: "text-red-900",
  },
  key_concept: {
    icon: KeyRound,
    bg: "bg-slate-50",
    border: "border-slate-300",
    iconCls: "text-slate-700",
    titleCls: "text-slate-900",
    textCls: "text-slate-700",
  },
};

export function CalloutBlock({ variant = "info", title, content = [] }) {
  const config = VARIANTS[variant] || VARIANTS.info;
  const Icon = config.icon;

  return (
    <div className={`my-5 rounded-lg border ${config.border} ${config.bg} p-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.iconCls}`} />
        <div className="flex-1 min-w-0">
          {title && (
            <div className={`text-sm font-semibold mb-1 ${config.titleCls}`}>
              {title}
            </div>
          )}
          <div className={`text-sm leading-relaxed ${config.textCls}`}>
            {content.map((node, i) => (
              <RichTextSpan key={i} node={node} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
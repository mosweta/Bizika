// src/features/lessons/renderer/blocks/QuestionBlock.jsx
import { useState } from "react";
import { CheckCircle, XCircle, Check } from "lucide-react";

export function QuestionBlock({
  block,
  initialAnswer = null,
  onAnswered,
}) {
  const { question, options = [], correctOption, explanation } = block;
  const [selected, setSelected] = useState(initialAnswer);
  const [submitted, setSubmitted] = useState(initialAnswer !== null);

  const isCorrect = submitted && selected === correctOption;

  const handleSelect = (optionId) => {
    if (submitted) return;
    setSelected(optionId);
  };

  const handleSubmit = () => {
    if (!selected || submitted) return;
    setSubmitted(true);
    onAnswered?.({
      blockId: block.id,
      selected,
      correct: selected === correctOption,
    });
  };

  const handleRetry = () => {
    setSelected(null);
    setSubmitted(false);
  };

  return (
    <div className="my-6 rounded-lg border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Check your understanding
        </span>
        {submitted && (
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
              isCorrect ? "text-green-700" : "text-red-700"
            }`}
          >
            {isCorrect ? (
              <CheckCircle className="h-3.5 w-3.5" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            {isCorrect ? "Correct" : "Not quite"}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        <p className="text-sm sm:text-base font-medium text-slate-900 mb-4">
          {question}
        </p>

        <div className="space-y-2">
          {options.map((option) => {
            const isSelected = selected === option.id;
            const isCorrectOption = option.id === correctOption;

            let cls =
              "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50";
            let bubbleCls = "border-slate-300";
            let showIcon = null;

            if (submitted) {
              if (isCorrectOption) {
                cls = "border-green-200 bg-green-50/50";
                bubbleCls = "border-green-600 bg-green-600 text-white";
                showIcon = <Check className="h-3.5 w-3.5" />;
              } else if (isSelected) {
                cls = "border-red-200 bg-red-50/50";
                bubbleCls = "border-red-600 bg-red-600 text-white";
                showIcon = <XCircle className="h-3.5 w-3.5" />;
              } else {
                cls = "border-slate-200 opacity-60";
              }
            } else if (isSelected) {
              cls = "border-blue-800 bg-blue-50/50";
              bubbleCls = "border-blue-800 bg-blue-800 text-white";
              showIcon = <Check className="h-3.5 w-3.5" />;
            }

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option.id)}
                disabled={submitted}
                className={`w-full text-left flex items-center gap-3 rounded-lg border p-3 transition-colors ${cls} ${
                  submitted ? "cursor-default" : "cursor-pointer"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 flex-shrink-0 ${bubbleCls}`}
                >
                  {showIcon}
                </span>
                <span className="text-sm text-slate-800 flex-1">
                  {option.text}
                </span>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {submitted && explanation && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-1">
              Explanation
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              {explanation}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex items-center justify-end gap-2">
          {submitted ? (
            <button
              onClick={handleRetry}
              className="text-sm px-3 py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Try again
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!selected}
              className="text-sm px-4 py-2 rounded bg-blue-800 text-white hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Check answer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
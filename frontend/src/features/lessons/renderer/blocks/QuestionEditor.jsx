// src/features/lessons/editor/blocks/QuestionEditor.jsx
import { Plus, X, CheckCircle, Circle, HelpCircle } from "lucide-react";

function makeOptionId(existing) {
  const used = new Set(existing.map((o) => o.id));
  for (const c of "abcdef") {
    if (!used.has(c)) return c;
  }
  return `opt${existing.length}`;
}

export function QuestionEditor({ block, onChange }) {
  const options = block.options || [];
  const question = block.question || "";
  const correctOption = block.correctOption || "a";
  const explanation = block.explanation || "";

  const setField = (key, value) => onChange({ ...block, [key]: value });

  const updateOption = (id, text) => {
    setField(
      "options",
      options.map((o) => (o.id === id ? { ...o, text } : o))
    );
  };

  const addOption = () => {
    if (options.length >= 6) return;
    const id = makeOptionId(options);
    setField("options", [...options, { id, text: "" }]);
  };

  const removeOption = (id) => {
    if (options.length <= 2) return;
    const next = options.filter((o) => o.id !== id);
    // If we removed the correct option, default to first remaining
    const nextCorrect =
      correctOption === id ? next[0].id : correctOption;
    onChange({ ...block, options: next, correctOption: nextCorrect });
  };

  const setCorrect = (id) => setField("correctOption", id);

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 bg-slate-50/60 border-b border-slate-100 flex items-center gap-2">
        <HelpCircle className="h-4 w-4 text-slate-500" />
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Multiple choice question
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Question text */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Question
          </label>
          <textarea
            value={question}
            onChange={(e) => setField("question", e.target.value)}
            rows={2}
            placeholder="What do you want to ask?"
            className="w-full text-sm border border-slate-200 rounded px-3 py-2 focus:outline-none focus:border-blue-800 resize-y"
          />
        </div>

        {/* Options */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-slate-600">
              Options ({options.length})
            </label>
            <span className="text-xs text-slate-400">
              Click the circle to mark correct
            </span>
          </div>

          <div className="space-y-2">
            {options.map((opt, i) => {
              const isCorrect = opt.id === correctOption;
              return (
                <div key={opt.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCorrect(opt.id)}
                    className={`flex h-6 w-6 items-center justify-center rounded-full border-2 flex-shrink-0 transition-colors ${
                      isCorrect
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-slate-300 hover:border-slate-400"
                    }`}
                    title={isCorrect ? "Correct answer" : "Mark as correct"}
                  >
                    {isCorrect ? (
                      <CheckCircle className="h-3.5 w-3.5" />
                    ) : (
                      <Circle className="h-3 w-3 text-transparent" />
                    )}
                  </button>
                  <span className="text-xs text-slate-400 w-4 tabular-nums">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => updateOption(opt.id, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    className="flex-1 text-sm border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-800"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(opt.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded flex-shrink-0"
                      title="Remove option"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {options.length < 6 && (
            <button
              type="button"
              onClick={addOption}
              className="mt-2 inline-flex items-center gap-1 text-xs text-blue-800 hover:text-blue-900"
            >
              <Plus className="h-3 w-3" />
              Add option
            </button>
          )}
        </div>

        {/* Explanation */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Explanation <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            value={explanation}
            onChange={(e) => setField("explanation", e.target.value)}
            rows={2}
            placeholder="Shown to students after they answer"
            className="w-full text-sm border border-slate-200 rounded px-3 py-2 focus:outline-none focus:border-blue-800 resize-y"
          />
        </div>
      </div>
    </div>
  );
}
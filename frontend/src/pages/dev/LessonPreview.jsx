// src/pages/dev/LessonPreview.jsx
import { ReadingLessonRenderer } from "../../features/lessons/renderer/ReadingLessonRenderer";
import { SAMPLE_LESSON } from "../../features/lessons/renderer/sampleLesson";

export default function LessonPreview() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">
            <span className="rounded bg-amber-100 text-amber-800 px-2 py-0.5">
              Dev
            </span>
            <span>Sample lesson preview</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Introduction to Database Normalization
          </h1>
          <p className="mt-2 text-sm text-slate-500 max-w-2xl">
            This page renders a hardcoded sample lesson to verify the renderer
            before wiring up the editor. Every block type is represented.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 sm:p-8">
          <ReadingLessonRenderer
            content={SAMPLE_LESSON}
            title="Introduction to Database Normalization"
            objectives={SAMPLE_LESSON.objectives}
            questionAnswers={{}}
            onQuestionAnswered={(ans) =>
              console.log("[preview] answered", ans)
            }
            onSectionComplete={(id, all) =>
              console.log("[preview] section complete", id, all)
            }
            completedSections={[]}
          />
        </div>
      </div>
    </div>
  );
}
// src/features/lessons/renderer/ReadingLessonRenderer.jsx
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { BookOpen, CheckCircle } from "lucide-react";
import { BlockRenderer } from "./BlockRenderer";

export function ReadingLessonRenderer({
  content,
  title,
  objectives = [],
  questionAnswers = {},
  onQuestionAnswered,
  onSectionComplete,
  completedSections = [],
  enrollment = null,
}) {
  const sections = content?.sections || [];
  const [currentSectionId, setCurrentSectionId] = useState(
    sections[0]?.id || null
  );
  const [completedLocal, setCompletedLocal] = useState(
    () => new Set(completedSections)
  );

  const sectionRefs = useRef({});
  const observerRef = useRef(null);

  // Track which sections the reader has scrolled past (for progress)
  useEffect(() => {
    if (!sections.length) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const id = visible[0].target.getAttribute("data-section-id");
          if (id) setCurrentSectionId(id);
        }
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: 0 }
    );

    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observerRef.current.observe(el);
    });

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [sections]);

  // Mark a section complete when scrolled to bottom of it
  useEffect(() => {
    if (!sections.length) return;

    const completionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.getAttribute("data-section-id");
          if (!id) return;
          setCompletedLocal((prev) => {
            if (prev.has(id)) return prev;
            const next = new Set(prev);
            next.add(id);
            onSectionComplete?.(id, next);
            return next;
          });
        });
      },
      { rootMargin: "0px 0px -80% 0px", threshold: 0 }
    );

    Object.values(sectionRefs.current).forEach((el) => {
      if (el) completionObserver.observe(el);
    });

    return () => completionObserver.disconnect();
  }, [sections, onSectionComplete]);

  // Scroll to a section (sidebar click)
  const scrollToSection = useCallback((id) => {
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const progress = useMemo(() => {
    if (!sections.length) return 0;
    return Math.round((completedLocal.size / sections.length) * 100);
  }, [sections, completedLocal]);

  if (!sections.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
        <BookOpen className="mx-auto h-6 w-6 text-slate-300" />
        <p className="mt-3 text-sm text-slate-500">
          This lesson has no content yet.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
      {/* Sidebar — desktop only */}
      <aside className="hidden lg:block">
        <div className="sticky top-24">
          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-baseline justify-between text-xs mb-2">
              <span className="text-slate-500 font-medium">Progress</span>
              <span className="text-slate-700 tabular-nums">{progress}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Objectives */}
          {objectives.length > 0 && (
            <div className="mb-6 pb-6 border-b border-slate-100">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-3">
                What you'll learn
              </div>
              <ul className="space-y-2">
                {objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Section list */}
          <nav>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-3">
              Sections
            </div>
            <ul className="space-y-0.5">
              {sections.map((sec, i) => {
                const isActive = currentSectionId === sec.id;
                const isDone = completedLocal.has(sec.id);
                return (
                  <li key={sec.id}>
                    <button
                      onClick={() => scrollToSection(sec.id)}
                      className={`w-full flex items-start gap-2 text-left text-sm py-1.5 px-2 rounded transition-colors ${
                        isActive
                          ? "bg-blue-50 text-blue-800"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full text-xs flex-shrink-0 mt-0.5 ${
                          isDone
                            ? "bg-green-600 text-white"
                            : isActive
                            ? "border border-blue-800 text-blue-800"
                            : "border border-slate-300 text-slate-400"
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <span className="text-[10px] font-medium">{i + 1}</span>
                        )}
                      </span>
                      <span className={`flex-1 min-w-0 ${isActive ? "font-medium" : ""}`}>
                        {sec.title || `Section ${i + 1}`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <article className="min-w-0">
        {/* Mobile progress bar */}
        <div className="lg:hidden mb-6">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-500">
              {completedLocal.size} of {sections.length} sections
            </span>
            <span className="text-slate-700 tabular-nums">{progress}%</span>
          </div>
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Title */}
        {title && (
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 mb-8">
            {title}
          </h1>
        )}

        {/* Mobile objectives */}
        {objectives.length > 0 && (
          <div className="lg:hidden mb-8 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
              What you'll learn
            </div>
            <ul className="space-y-1.5">
              {objectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sections */}
        {sections.map((section, si) => (
          <section
            key={section.id}
            id={section.id}
            data-section-id={section.id}
            ref={(el) => {
              if (el) sectionRefs.current[section.id] = el;
            }}
            className="mb-12 scroll-mt-24"
          >
            {/* Section header */}
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600 flex-shrink-0">
                {si + 1}
              </span>
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900">
                {section.title || `Section ${si + 1}`}
              </h2>
            </div>

            {/* Blocks */}
            {section.blocks?.map((block) => (
              <BlockRenderer
                key={block.id}
                block={block}
                questionAnswers={questionAnswers}
                onQuestionAnswered={onQuestionAnswered}
              />
            ))}
          </section>
        ))}

        {/* Completed banner */}
        {progress === 100 && (
          <div className="rounded-lg border border-green-200 bg-green-50/60 p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-700 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-green-900">
                Section complete
              </div>
              <div className="text-xs text-green-700 mt-0.5">
                You've read through every section of this lesson.
              </div>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
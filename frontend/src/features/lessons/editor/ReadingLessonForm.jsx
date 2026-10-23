// src/features/lessons/editor/ReadingLessonForm.jsx
import { useState } from "react";
import { Plus } from "lucide-react";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { SectionEditor } from "./SectionEditor";

export function ReadingLessonForm({ value, onChange, compact = false }) {
  const {
    title = "",
    description = "",
    duration = "",
    objectives = [],
    sections = [],
  } = value || {};

  const setField = (key, val) => onChange({ ...value, [key]: val });

  // ── Section handlers ────────────────────────────────────
  const addSection = () => {
    const newSection = {
      id: `sec_${Math.random().toString(36).slice(2, 10)}`,
      title: "",
      blocks: [],
    };
    setField("sections", [...sections, newSection]);
  };

  const updateSection = (sectionId, patch) => {
    setField(
      "sections",
      sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s))
    );
  };

  const deleteSection = (sectionId) => {
    if (
      !window.confirm("Delete this section and all its blocks?")
    )
      return;
    setField(
      "sections",
      sections.filter((s) => s.id !== sectionId)
    );
  };

  const handleDragEnd = (result) => {
    const { source, destination, type } = result;
    if (!destination) return;
    if (source.index === destination.index) return;

    if (type === "SECTION") {
      const next = [...sections];
      const [moved] = next.splice(source.index, 1);
      next.splice(destination.index, 0, moved);
      setField("sections", next);
    }
  };

  // ── Objective handlers ──────────────────────────────────
  const addObjective = () => setField("objectives", [...objectives, ""]);
  const updateObjective = (i, val) =>
    setField("objectives", objectives.map((o, idx) => (idx === i ? val : o)));
  const removeObjective = (i) =>
    setField("objectives", objectives.filter((_, idx) => idx !== i));

  // ── Render ──────────────────────────────────────────────
  const padClass = compact ? "p-4" : "p-5";
  const gapClass = compact ? "space-y-3" : "space-y-4";
  const sectionGapClass = compact ? "space-y-3" : "space-y-4";

  return (
    <div className={compact ? "space-y-6" : "space-y-8"}>
      {/* Metadata */}
      <section
        className={`rounded-lg border border-slate-200 bg-white ${padClass} ${gapClass}`}
      >
        <h2 className="text-sm font-semibold text-slate-900">Lesson details</h2>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setField("title", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-800"
            placeholder="Lesson title"
            autoFocus={compact}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setField("description", e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-800 resize-y"
            placeholder="Short summary shown to students"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Duration
          </label>
          <input
            type="text"
            value={duration}
            onChange={(e) => setField("duration", e.target.value)}
            className="w-full sm:max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-800"
            placeholder="e.g. 10 min read"
          />
        </div>

        {/* Objectives */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-medium text-slate-600">
              Learning objectives
            </label>
            <button
              type="button"
              onClick={addObjective}
              className="inline-flex items-center gap-1 text-xs text-blue-800 hover:text-blue-900"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          </div>
          {objectives.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              No objectives yet. Objectives are shown at the top of the lesson.
            </p>
          ) : (
            <ul className="space-y-2">
              {objectives.map((obj, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 tabular-nums w-4">
                    {i + 1}
                  </span>
                  <input
                    type="text"
                    value={obj}
                    onChange={(e) => updateObjective(i, e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:border-blue-800"
                    placeholder="e.g. Explain database normalization"
                  />
                  <button
                    type="button"
                    onClick={() => removeObjective(i)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                    title="Remove"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Sections */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Sections</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {sections.length}{" "}
              {sections.length === 1 ? "section" : "sections"}
            </p>
          </div>
          <button
            type="button"
            onClick={addSection}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded bg-blue-800 text-white hover:bg-blue-900"
          >
            <Plus className="h-4 w-4" />
            Add section
          </button>
        </div>

        {sections.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm text-slate-500">
              No sections yet. Add your first section to get started.
            </p>
            <button
              type="button"
              onClick={addSection}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded bg-blue-800 text-white hover:bg-blue-900"
            >
              <Plus className="h-4 w-4" />
              Add section
            </button>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="sections" type="SECTION">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`${sectionGapClass} ${
                    snapshot.isDraggingOver ? "bg-blue-50/30 rounded-lg" : ""
                  }`}
                >
                  {sections.map((section, index) => (
                    <SectionEditor
                      key={section.id}
                      section={section}
                      index={index}
                      onUpdate={(patch) => updateSection(section.id, patch)}
                      onDelete={() => deleteSection(section.id)}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </section>
    </div>
  );
}
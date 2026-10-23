// src/pages/librarycomponents/courseSection.jsx
import { memo } from "react";
import {
  Folder, ChevronDown, ChevronRight, FolderPlus,
  FileText, Archive, Pencil,
} from "lucide-react";
import { Droppable } from "@hello-pangea/dnd";
import { ModuleSection } from "./moduleSection";
import { LessonItem } from "./lessonItem";
import { SkeletonBar } from "../../components/Skeletons";

export const CourseSection = memo(function CourseSection({
  course,
  modules,
  lessons,
  archived,
  resources,
  expanded,
  expandedModules,
  showArchived,
  showResources,
  loading,
  onToggleCourse,
  onToggleModule,
  onToggleArchived,
  onToggleResources,
  onExpandAll,
  onEditCourse,
  onAddModule,
  onAddLesson,
  onEditModule,
  onDeleteModule,
  onAddResource,
  onDeleteLesson,
  onTogglePublish,
  onArchive,
  onEditLesson,
}) {
  const getLessonsByModule = (moduleId) =>
    lessons
      .filter((l) => (moduleId === "ungrouped" ? !l.moduleId : l.moduleId === moduleId))
      .sort((a, b) => (a.order || 0) - (b.order || 0));

  const ungroupedLessons = getLessonsByModule("ungrouped");
  const totalLessons = lessons.length;

  const lessonHandlers = {
    onAddResource,
    onDelete: onDeleteLesson,
    onTogglePublish,
    onArchive,
    onEditLesson,
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden mb-4">
      {/* Course header */}
      <div
        onClick={onToggleCourse}
        className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
          )}
          <Folder className="h-4 w-4 text-blue-800 flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 truncate">
              {course.title}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 truncate">
              {loading
                ? "Loading content…"
                : `${modules.length} ${modules.length === 1 ? "module" : "modules"} · ${totalLessons} ${totalLessons === 1 ? "lesson" : "lessons"}${archived.length > 0 ? ` · ${archived.length} archived` : ""}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {expanded && !loading && modules.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExpandAll?.();
              }}
              className="hidden sm:inline px-2 py-1 text-xs text-slate-500 hover:text-slate-900 rounded"
            >
              Expand all
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditCourse(course);
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
            title="Edit course"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddModule(course);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-blue-800 text-white hover:bg-blue-900"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add module</span>
          </button>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="border-t border-slate-100 p-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-lg border border-slate-200 p-4">
                  <SkeletonBar className="h-4 w-48" />
                  <SkeletonBar className="mt-3 h-3 w-full" />
                  <SkeletonBar className="mt-2 h-3 w-3/4" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <Droppable droppableId={course.id} type="MODULE">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-3 ${snapshot.isDraggingOver ? "bg-blue-50/50 rounded" : ""}`}
                  >
                    {modules.map((module, idx) => (
                      <ModuleSection
                        key={module.id}
                        module={module}
                        index={idx}
                        lessons={getLessonsByModule(module.id)}
                        expanded={expandedModules[module.id]}
                        courseId={course.id}
                        onToggle={() => onToggleModule(module.id)}
                        onAddLesson={() => onAddLesson(course, module)}
                        onEdit={() => onEditModule(course, module)}
                        onDelete={() => onDeleteModule(course.id, module.id)}
                        onAddResource={onAddResource}
                        onDeleteLesson={onDeleteLesson}
                        onTogglePublish={onTogglePublish}
                        onArchive={onArchive}
                        onEditLesson={onEditLesson}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              {ungroupedLessons.length > 0 && (
                <div className="mt-4 rounded-lg border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                    <h4 className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                      Ungrouped lessons
                    </h4>
                  </div>
                  <Droppable droppableId={`${course.id}_ungrouped`} type="LESSON">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-3 space-y-2 ${snapshot.isDraggingOver ? "bg-blue-50/50" : ""}`}
                      >
                        {ungroupedLessons.map((lesson, idx) => (
                          <LessonItem
                            key={lesson.id}
                            lesson={lesson}
                            index={idx}
                            courseId={course.id}
                            moduleId="ungrouped"
                            {...lessonHandlers}
                          />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              )}

              {modules.length === 0 && ungroupedLessons.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center">
                  <FolderPlus className="mx-auto h-6 w-6 text-slate-300" />
                  <p className="mt-3 text-sm text-slate-500">
                    No content yet. Add a module or lesson to get started.
                  </p>
                  <button
                    onClick={() => onAddModule(course)}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded bg-blue-800 text-white hover:bg-blue-900"
                  >
                    <FolderPlus className="h-4 w-4" />
                    Add module
                  </button>
                </div>
              )}

              {resources.length > 0 && (
                <div className="mt-4 rounded-lg border border-slate-200 overflow-hidden">
                  <button
                    onClick={onToggleResources}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-left"
                  >
                    <span className="flex items-center gap-2 text-xs font-medium text-slate-600 uppercase tracking-wide">
                      <FileText className="h-3.5 w-3.5" />
                      Resources ({resources.length})
                    </span>
                    {showResources ? (
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </button>
                  {showResources && (
                    <ul className="divide-y divide-slate-100">
                      {resources.map((r, i) => (
                        <li
                          key={r.id || r.key || i}
                          className="px-4 py-2.5 text-sm flex items-center gap-3"
                        >
                          <FileText className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          <span className="flex-1 truncate text-slate-700">
                            {r.name || r.originalName || "Resource"}
                          </span>
                          {r.url && (
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-800 hover:underline flex-shrink-0"
                            >
                              Open
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {archived.length > 0 && (
                <div className="mt-4 rounded-lg border border-slate-200 overflow-hidden">
                  <button
                    onClick={onToggleArchived}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-left"
                  >
                    <span className="flex items-center gap-2 text-xs font-medium text-slate-600 uppercase tracking-wide">
                      <Archive className="h-3.5 w-3.5" />
                      Archived ({archived.length})
                    </span>
                    {showArchived ? (
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </button>
                  {showArchived && (
                    <ul className="divide-y divide-slate-100">
                      {archived
                        .sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt))
                        .map((lesson) => (
                          <li
                            key={lesson.id}
                            className="px-4 py-2.5 flex items-center gap-3 opacity-75"
                          >
                            <Archive className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-slate-600 truncate">
                                {lesson.title}
                              </div>
                              {lesson.archiveReason && (
                                <div className="text-xs text-slate-400 truncate">
                                  {lesson.archiveReason}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 flex-shrink-0">
                              {lesson.archivedAt
                                ? new Date(lesson.archivedAt).toLocaleDateString()
                                : ""}
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
});
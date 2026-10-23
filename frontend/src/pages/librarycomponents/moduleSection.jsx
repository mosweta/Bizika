// src/components/admin/components/ModuleSection.jsx
import { memo } from "react";
import { ChevronDown, ChevronRight, Layers, Plus, Edit, Trash2, GripVertical } from "lucide-react";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { LessonItem } from "./lessonItem";

export const ModuleSection = memo(({
  module,
  index,
  lessons,
  expanded,
  courseId,
  onToggle,
  onAddLesson,
  onEdit,
  onDelete,
  onAddResource,
  onDeleteLesson,
  onTogglePublish,
  onArchive,
  onEditLesson
}) => {
  const completedCount = lessons.filter(l => l.isCompleted).length;
  const progress = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  return (
    <Draggable draggableId={module.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`border rounded-lg ${
            snapshot.isDragging ? 'border-blue-500 shadow-lg' : 'border-gray-200'
          }`}
        >
          {/* Module Header */}
          <div className="bg-white p-3 flex items-center justify-between border-b">
            <div className="flex items-center gap-2 flex-1">
              <div {...provided.dragHandleProps} className="cursor-move">
                <GripVertical className="text-gray-400 hover:text-gray-600" size={18} />
              </div>
              <div className="flex-1 cursor-pointer" onClick={onToggle}>
                <div className="flex items-center gap-2">
                  {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  <Layers className="text-purple-600" size={18} />
                  <span className="font-medium">{module.title}</span>
                  {!module.isPublished && (
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                      Draft
                    </span>
                  )}
                </div>
                {module.description && (
                  <p className="text-sm text-gray-600 ml-7 mt-1">{module.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 hidden sm:inline">
                {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}
              </span>
              <button
                onClick={onAddLesson}
                className="p-1 hover:bg-green-100 text-green-600 rounded"
                title="Add lesson"
              >
                <Plus size={16} />
              </button>
              <button
                onClick={onEdit}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={onDelete}
                className="p-1 hover:bg-red-100 text-red-600 rounded"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Module Lessons */}
          {expanded && (
            <Droppable droppableId={`${courseId}_${module.id}`} type="LESSON">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`p-3 bg-gray-50 space-y-2 ${
                    snapshot.isDraggingOver ? 'bg-blue-100' : ''
                  }`}
                >
                  {lessons.map((lesson, lessonIndex) => (
                    <LessonItem
                      key={lesson.id}
                      lesson={lesson}
                      index={lessonIndex}
                      courseId={courseId}
                      moduleId={module.id}
                      onAddResource={onAddResource}
                      onDelete={onDeleteLesson}
                      onTogglePublish={onTogglePublish}
                      onArchive={onArchive}
                      onEdit={onEditLesson}
                    />
                  ))}
                  {provided.placeholder}
                  
                  {lessons.length === 0 && (
                    <button
                      onClick={onAddLesson}
                      className="w-full p-3 border-2 border-dashed rounded-lg text-sm text-gray-500 hover:text-purple-600 hover:border-purple-300 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      Add First Lesson
                    </button>
                  )}
                </div>
              )}
            </Droppable>
          )}
        </div>
      )}
    </Draggable>
  );
});
// src/features/lessons/editor/BlockWrapper.jsx
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Draggable } from "@hello-pangea/dnd";

export function BlockWrapper({
  block,
  index,
  children,
  onInsertBelow,
  onDelete,
}) {
  return (
    <Draggable draggableId={block.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`relative group ${
            snapshot.isDragging ? "opacity-90" : ""
          }`}
        >
          <div className="flex items-start gap-1">
            {/* Drag handle */}
            <div
              {...provided.dragHandleProps}
              className="flex items-center gap-0.5 pt-2 select-none"
            >
              <div className="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-slate-100">
                <GripVertical className="h-3.5 w-3.5 text-slate-300 hover:text-slate-600" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">{children}</div>

            {/* Actions */}
            <div className="flex flex-col items-center gap-0.5 pt-2 flex-shrink-0">
              <button
                type="button"
                onClick={onInsertBelow}
                className="p-0.5 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-600"
                title="Insert block below"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="p-0.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-600"
                title="Delete block"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
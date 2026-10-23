// src/components/admin/components/LessonItem.jsx
import { memo, useState, useEffect } from "react";
import { 
  GripVertical, Video, FileText, FilePlus, Archive, Trash2, 
  Edit, CheckCircle, Circle, PlayCircle 
} from "lucide-react";
import { Draggable } from "@hello-pangea/dnd";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";

const checkIfLessonHasStudents = async (courseId, lessonId) => {
  try {
    const enrollmentsRef = collection(db, "enrollments");
    const q = query(enrollmentsRef, where("courseId", "==", courseId));
    const snapshot = await getDocs(q);
    return snapshot.docs.some(doc => 
      doc.data().completedLessons?.includes(lessonId)
    );
  } catch (error) {
    console.error("Error checking lesson students:", error);
    return false;
  }
};

export const LessonItem = memo(({ 
  lesson, index, courseId, moduleId, 
  onAddResource, onDelete, onTogglePublish, onArchive, onEdit 
}) => {
  const [hasStudents, setHasStudents] = useState(false);
  
  useEffect(() => {
    checkIfLessonHasStudents(courseId, lesson.id).then(setHasStudents);
  }, [courseId, lesson.id]);

  return (
    <Draggable draggableId={lesson.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`flex items-center justify-between p-3 bg-white border rounded-lg ${
            snapshot.isDragging ? 'border-blue-500 shadow-lg' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div {...provided.dragHandleProps} className="cursor-move">
              <GripVertical className="text-gray-400 hover:text-gray-600" size={16} />
            </div>
            <div className="p-1.5 bg-gray-100 rounded flex-shrink-0">
              {lesson.videoUrl ? (
                <Video className="h-4 w-4 text-purple-600" />
              ) : (
                <FileText className="h-4 w-4 text-green-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm truncate">{lesson.title}</span>
                {lesson.duration && (
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                    {lesson.duration}
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePublish(courseId, lesson.id, lesson.isPublished);
                  }}
                  className={`px-1.5 py-0.5 text-xs rounded border ${
                    lesson.isPublished !== false
                      ? 'bg-green-100 text-green-800 border-green-200'
                      : 'bg-gray-100 text-gray-800 border-gray-200'
                  }`}
                >
                  {lesson.isPublished !== false ? 'Published' : 'Draft'}
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => onAddResource(lesson)}
              className="p-1 hover:bg-blue-100 text-blue-600 rounded"
              title="Add resource"
            >
              <FilePlus size={14} />
            </button>
            
            <button
              onClick={() => onEdit(lesson)}
              className="p-1 hover:bg-gray-100 text-gray-600 rounded"
              title="Edit lesson"
            >
              <Edit size={14} />
            </button>
            
            <button
              onClick={() => onArchive(courseId, lesson)}
              className="p-1 hover:bg-yellow-100 text-yellow-600 rounded"
              title="Archive lesson"
            >
              <Archive size={14} />
            </button>
            
            <button
              onClick={async () => {
                if (hasStudents) {
                  if (window.confirm(
                    "⚠️ This lesson has been seen by students.\n\n" +
                    "• DELETE will remove it permanently\n" +
                    "• ARCHIVE will keep it for existing students\n\n" +
                    "Are you sure you want to DELETE instead of archive?"
                  )) {
                    onDelete(courseId, lesson.id);
                  }
                } else {
                  if (window.confirm("Permanently delete this lesson?")) {
                    onDelete(courseId, lesson.id);
                  }
                }
              }}
              className="p-1 hover:bg-red-100 text-red-600 rounded"
              title="Delete permanently"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}
    </Draggable>
  );
});
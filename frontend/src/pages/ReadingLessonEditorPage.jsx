// src/pages/ReadingLessonEditorPage.jsx
import { useParams, useNavigate } from "react-router-dom";
import { ReadingLessonEditor } from "../features/lessons/editor/ReadingLessonEditor";

export default function ReadingLessonEditorPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();

  return (
    <ReadingLessonEditor
      courseId={courseId}
      lessonId={lessonId}
      onExit={() => navigate("/admin")}
    />
  );
}
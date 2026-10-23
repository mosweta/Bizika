// src/pages/contentlibrary.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";  
import {
  collection, query, orderBy, getDocs, doc,
  updateDoc, deleteDoc, writeBatch, serverTimestamp, setDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import {
  Folder, Search, X, AlertCircle, RefreshCw,
} from "lucide-react";
import { DragDropContext } from "@hello-pangea/dnd";
import { v4 as uuidv4 } from "uuid";
import R2Service from "../services/r2service";

import { CourseSection } from "./librarycomponents/courseSection";
import { AddModuleModal } from "./librarycomponents/modals/addModuleModal";
import { AddLessonModal } from "./librarycomponents/modals/addLessonModal";
import { AddResourceModal } from "./librarycomponents/modals/addResourceModal";
import { EditCourseModal } from "./librarycomponents/modals/editCourseModal";
import { EditLessonModal } from "./librarycomponents/modals/editLessonModal";
import { SkeletonStatRow } from "../components/Skeletons";

// ─────────────────────────────────────────────────────────────
// Cache shape:
//   contentCache[courseId] = { modules[], lessons[], archived[] }
//   Loaded lazily when a course is first expanded.
//   Invalidated when anything in that course changes.
// ─────────────────────────────────────────────────────────────

export default function ContentLibrary() {
  // Course list
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingContents, setLoadingContents] = useState({});
  const [contentCache, setContentCache] = useState({});

  // UI state
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCourses, setExpandedCourses] = useState({});
  const [expandedModules, setExpandedModules] = useState({});
  const [showArchived, setShowArchived] = useState({});
  const [showResources, setShowResources] = useState({});

  // Modal targets
  const [editCourseTarget, setEditCourseTarget] = useState(null);
  const [editLessonTarget, setEditLessonTarget] = useState(null);
  const [addModuleTarget, setAddModuleTarget] = useState(null);
  const [editModuleTarget, setEditModuleTarget] = useState(null);
  const [addLessonTarget, setAddLessonTarget] = useState(null);
  const [addResourceTarget, setAddResourceTarget] = useState(null);

  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate()
  const mountedRef = useRef(true);

  // ─────────────────────────────────────────────────────────
  // Debounce search
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim().toLowerCase()), 150);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ─────────────────────────────────────────────────────────
  // Load course list
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    async function load() {
      setLoadingCourses(true);
      setError(null);
      try {
        const snap = await getDocs(
          query(collection(db, "courses"), orderBy("createdAt", "desc"))
        );
        if (!mountedRef.current) return;
        setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));

        // Clear cache on refresh
        setContentCache({});
        setExpandedCourses({});
        setExpandedModules({});
      } catch (e) {
        console.error("loadCourses error:", e);
        if (mountedRef.current) setError("Couldn't load courses. Try refreshing.");
      } finally {
        if (mountedRef.current) setLoadingCourses(false);
      }
    }
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [refreshKey]);

  // ─────────────────────────────────────────────────────────
  // Lazy load a course's content
  // ─────────────────────────────────────────────────────────
  const loadCourseContent = useCallback(
    async (courseId) => {
      if (contentCache[courseId]) return;

      setLoadingContents((prev) => ({ ...prev, [courseId]: true }));
      try {
        const [modulesSnap, lessonsSnap, archivedSnap] = await Promise.all([
          getDocs(query(collection(db, "courses", courseId, "modules"), orderBy("order"))),
          getDocs(query(collection(db, "courses", courseId, "lessons"), orderBy("order"))),
          getDocs(collection(db, "courses", courseId, "archivedLessons")),
        ]);

        if (!mountedRef.current) return;

        setContentCache((prev) => ({
          ...prev,
          [courseId]: {
            modules: modulesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
            lessons: lessonsSnap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .filter((l) => l.status !== "archived"),
            archived: archivedSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
          },
        }));
      } catch (e) {
        console.error(`loadCourseContent(${courseId}) error:`, e);
        if (mountedRef.current) setError("Couldn't load course content.");
      } finally {
        if (mountedRef.current) {
          setLoadingContents((prev) => ({ ...prev, [courseId]: false }));
        }
      }
    },
    [contentCache]
  );

  const invalidateCourse = useCallback((courseId) => {
    setContentCache((prev) => {
      const next = { ...prev };
      delete next[courseId];
      return next;
    });
    // Load on next tick so the cache state flushes first
    setTimeout(() => loadCourseContent(courseId), 0);
  }, [loadCourseContent]);

  // ─────────────────────────────────────────────────────────
  // Toggles
  // ─────────────────────────────────────────────────────────
  const handleToggleCourse = (courseId) => {
    setExpandedCourses((prev) => {
      const next = !prev[courseId];
      if (next && !contentCache[courseId]) loadCourseContent(courseId);
      return { ...prev, [courseId]: next };
    });
  };

  const handleToggleModule = (moduleId) =>
    setExpandedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));

  const handleToggleArchived = (courseId) =>
    setShowArchived((prev) => ({ ...prev, [courseId]: !prev[courseId] }));

  const handleToggleResources = (courseId) =>
    setShowResources((prev) => ({ ...prev, [courseId]: !prev[courseId] }));

  const handleExpandAll = (courseId) => {
    const content = contentCache[courseId];
    if (!content) return;
    const next = { ...expandedModules };
    content.modules.forEach((m) => {
      next[m.id] = true;
    });
    setExpandedModules(next);
  };
  const handleEditLesson = (lesson, courseId) => {
  // Reading lesson → open the visual block editor
  if (!lesson.videoUrl) {
    navigate(`/admin/lesson/${courseId}/${lesson.id}/edit`);
    return;
  }
  // Video lesson → existing metadata modal
  setEditLessonTarget({ lesson, courseId });
};

  // ─────────────────────────────────────────────────────────
  // Aggregated resources per course
  // ─────────────────────────────────────────────────────────
  const getCourseResources = (courseId) => {
    const content = contentCache[courseId];
    if (!content) return [];
    const seen = new Set();
    const all = [];
    content.lessons.forEach((lesson) => {
      const combined = [
        ...(lesson.resources || []),
        ...(lesson.documents || []),
        ...(lesson.slides || []),
        ...(lesson.templates || []),
      ];
      combined.forEach((r) => {
        if (!r) return;
        const k = r.key || r.url || r.name || r.originalName;
        if (!k || seen.has(k)) return;
        seen.add(k);
        all.push({ ...r, lessonId: lesson.id, lessonTitle: lesson.title });
      });
    });
    return all;
  };

  // ─────────────────────────────────────────────────────────
  // Filter
  // ─────────────────────────────────────────────────────────
  const filteredCourses = useMemo(() => {
    if (!searchQuery) return courses;
    return courses.filter(
      (c) =>
        (c.title || "").toLowerCase().includes(searchQuery) ||
        (c.description || "").toLowerCase().includes(searchQuery) ||
        (c.category || "").toLowerCase().includes(searchQuery)
    );
  }, [courses, searchQuery]);

  // ─────────────────────────────────────────────────────────
  // Module CRUD
  // ─────────────────────────────────────────────────────────
  const handleSaveModule = async (form) => {
    try {
      if (editModuleTarget) {
        const { course, module } = editModuleTarget;
        await updateDoc(doc(db, "courses", course.id, "modules", module.id), {
          title: form.title.trim(),
          description: form.description || "",
          isPublished: form.isPublished !== false,
          updatedAt: serverTimestamp(),
        });
        setEditModuleTarget(null);
        invalidateCourse(course.id);
      } else if (addModuleTarget) {
        const course = addModuleTarget;
        const content = contentCache[course.id];
        const moduleId = uuidv4();
        const order = content ? content.modules.length : 0;
        await setDoc(doc(db, "courses", course.id, "modules", moduleId), {
          id: moduleId,
          title: form.title.trim(),
          description: form.description || "",
          order,
          isPublished: form.isPublished !== false,
          createdAt: new Date().toISOString(),
        });
        setAddModuleTarget(null);
        setExpandedCourses((prev) => ({ ...prev, [course.id]: true }));
        invalidateCourse(course.id);
      }
    } catch (e) {
      console.error("saveModule error:", e);
      setError("Failed to save module.");
    }
  };

  const handleDeleteModule = async (courseId, moduleId) => {
    if (!window.confirm("Delete this module? Its lessons will move to ungrouped.")) return;

    try {
      const content = contentCache[courseId];
      const moduleLessons =
        content?.lessons.filter((l) => l.moduleId === moduleId) || [];
      const batch = writeBatch(db);
      moduleLessons.forEach((l) => {
        batch.update(doc(db, "courses", courseId, "lessons", l.id), { moduleId: null });
      });
      batch.delete(doc(db, "courses", courseId, "modules", moduleId));
      await batch.commit();
      invalidateCourse(courseId);
    } catch (e) {
      console.error("deleteModule error:", e);
      setError("Failed to delete module.");
    }
  };

  // ─────────────────────────────────────────────────────────
  // Lesson create (from AddLessonModal)
  // ─────────────────────────────────────────────────────────
  const handleSaveNewLesson = async (form) => {
  const target = addLessonTarget;
  if (!target) return;
  const { course, module } = target;

  try {
    const lessonId = uuidv4();
    const content = contentCache[course.id];
    const moduleLessons = content
      ? content.lessons.filter((l) =>
          module ? l.moduleId === module.id : !l.moduleId
        )
      : [];

    const isReading = form.lessonType === "reading";

    const docData = {
      id: lessonId,
      title: form.title.trim(),
      description: form.description || "",
      lessonType: form.lessonType || "video",
      duration: form.duration || "",
      isPublished: form.isPublished !== false,
      moduleId: module?.id || null,
      order: moduleLessons.length,
      createdAt: new Date().toISOString(),
      resources: [],
      version: 1,
      versionGroupId: lessonId,
      status: "active",
    };

    if (isReading) {
      docData.content = {
        format: "bizika/blocks/v1",
        objectives: form.objectives || [],
        sections: form.sections || [],
      };
      docData.contentVersion = 2;
    } else {
      docData.videoUrl = form.videoUrl || "";
    }

    await setDoc(doc(db, "courses", course.id, "lessons", lessonId), docData);

    // Close the modal — no navigation. Back to content library.
    setAddLessonTarget(null);
    setExpandedCourses((prev) => ({ ...prev, [course.id]: true }));
    invalidateCourse(course.id);
  } catch (e) {
    console.error("saveNewLesson error:", e);
    setError("Failed to save lesson.");
    throw e; // Let AddLessonModal know it failed so it can show the error
  }
};

  // ─────────────────────────────────────────────────────────
  // Lesson delete / publish toggle
  // ─────────────────────────────────────────────────────────
  const handleDeleteLesson = async (courseId, lessonId) => {
    if (!window.confirm("Delete this lesson and its resources?")) return;
    try {
      const content = contentCache[courseId];
      const lesson = content?.lessons.find((l) => l.id === lessonId);
      if (lesson?.resources) {
        await Promise.allSettled(
          lesson.resources.filter((r) => r.key).map((r) => R2Service.deleteFile(r.key))
        );
      }
      await deleteDoc(doc(db, "courses", courseId, "lessons", lessonId));
      invalidateCourse(courseId);
    } catch (e) {
      console.error("deleteLesson error:", e);
      setError("Failed to delete lesson.");
    }
  };

  const handleTogglePublish = async (courseId, lessonId, current) => {
    try {
      await updateDoc(doc(db, "courses", courseId, "lessons", lessonId), {
        isPublished: !current,
        updatedAt: serverTimestamp(),
      });
      invalidateCourse(courseId);
    } catch (e) {
      console.error("togglePublish error:", e);
    }
  };

  const handleArchiveLesson = async (courseId, lesson) => {
    const reason = window.prompt("Reason for archiving this lesson?");
    if (!reason) return;
    try {
      const archiveRef = doc(db, "courses", courseId, "archivedLessons", lesson.id);
      await setDoc(archiveRef, {
        ...lesson,
        status: "archived",
        archivedAt: new Date().toISOString(),
        archiveReason: reason,
      });
      await deleteDoc(doc(db, "courses", courseId, "lessons", lesson.id));
      invalidateCourse(courseId);
    } catch (e) {
      console.error("archiveLesson error:", e);
      setError("Failed to archive lesson.");
    }
  };

  // ─────────────────────────────────────────────────────────
  // Resource add — the AddResourceModal calls onSave with no args;
  // we read the form state from the modal's internal form + the
  // selected lesson. We accept the form and the built resource.
  // ─────────────────────────────────────────────────────────
  const handleSaveResource = async (form) => {
    const target = addResourceTarget;
    if (!target) return;
    const { courseId, lesson } = target;
    try {
      let resourceData = {
        id: uuidv4(),
        name: form.name.trim(),
        type: form.type,
        description: form.description || "",
        createdAt: new Date().toISOString(),
      };

      if (form.file) {
        const upload = await R2Service.uploadFile(form.file, {
          folder: "course-resources",
          courseId,
          lessonId: lesson.id,
          metadata: { type: form.type, description: form.description || "" },
        });
        if (!upload.success) throw new Error(upload.error || "Upload failed");
        resourceData = {
          ...resourceData,
          key: upload.data.key,
          url: upload.data.url,
          size: upload.data.size,
          fileType: upload.data.contentType,
          storageType: "r2",
        };
      } else if (form.url) {
        resourceData.url = form.url;
        resourceData.type = "link";
      } else {
        throw new Error("Provide a file or URL.");
      }

      const content = contentCache[courseId];
      const fresh = content?.lessons.find((l) => l.id === lesson.id);
      const existing = fresh?.resources || [];
      await updateDoc(doc(db, "courses", courseId, "lessons", lesson.id), {
        resources: [...existing, resourceData],
        updatedAt: serverTimestamp(),
      });
      setAddResourceTarget(null);
      invalidateCourse(courseId);
    } catch (e) {
      console.error("saveResource error:", e);
      setError(`Failed to add resource: ${e.message}`);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Drag & drop
  // ─────────────────────────────────────────────────────────
  const handleDragEnd = async (result) => {
    const { source, destination, type } = result;
    if (!destination) return;
    if (
      source.index === destination.index &&
      source.droppableId === destination.droppableId
    )
      return;

    try {
      if (type === "MODULE") {
        const courseId = source.droppableId;
        const content = contentCache[courseId];
        if (!content) return;

        const next = [...content.modules];
        const [moved] = next.splice(source.index, 1);
        next.splice(destination.index, 0, moved);

        const batch = writeBatch(db);
        next.forEach((m, i) => {
          batch.update(doc(db, "courses", courseId, "modules", m.id), { order: i });
        });
        await batch.commit();
        invalidateCourse(courseId);
      }

      if (type === "LESSON") {
        const [courseId, sourceModuleId] = source.droppableId.split("_");
        const [, destModuleId] = destination.droppableId.split("_");
        const content = contentCache[courseId];
        if (!content) return;

        const inModule = (l, mid) =>
          mid === "ungrouped" ? !l.moduleId : l.moduleId === mid;

        const sourceList = content.lessons.filter((l) => inModule(l, sourceModuleId));
        const destList =
          sourceModuleId === destModuleId
            ? sourceList
            : content.lessons.filter((l) => inModule(l, destModuleId));

        const newSourceList = [...sourceList];
        const [movedLesson] = newSourceList.splice(source.index, 1);

        const newDestList =
          sourceModuleId === destModuleId ? newSourceList : [...destList];
        const newModuleId = destModuleId === "ungrouped" ? null : destModuleId;

        newDestList.splice(destination.index, 0, {
          ...movedLesson,
          moduleId: newModuleId,
        });

        const batch = writeBatch(db);
        newSourceList.forEach((l, i) => {
          batch.update(doc(db, "courses", courseId, "lessons", l.id), { order: i });
        });
        if (sourceModuleId !== destModuleId) {
          newDestList.forEach((l, i) => {
            batch.update(doc(db, "courses", courseId, "lessons", l.id), {
              order: i,
              moduleId: newModuleId,
            });
          });
        }
        await batch.commit();
        invalidateCourse(courseId);
      }
    } catch (e) {
      console.error("dragEnd error:", e);
      setError("Failed to reorder. Try again.");
    }
  };

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  if (loadingCourses) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Content library</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Manage modules, lessons, and resources
          </p>
        </div>
        <SkeletonStatRow count={2} />
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="h-10 w-full bg-slate-100 rounded animate-pulse" />
          <div className="mt-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Content library</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Manage modules, lessons, and resources
          </p>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded border border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="p-1 rounded hover:bg-red-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Courses" value={courses.length} />
        <StatTile
          label="Lessons"
          value={courses.reduce((sum, c) => sum + (c.lessonCount || 0), 0)}
        />
        <StatTile
          label="Published courses"
          value={courses.filter((c) => c.published).length}
        />
        <StatTile
          label="Draft courses"
          value={courses.filter((c) => !c.published).length}
        />
      </div>

      {/* Search */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search courses…"
            className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-800"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Course list */}
      {filteredCourses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-12 text-center">
          <Folder className="mx-auto h-6 w-6 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            {searchQuery
              ? "No courses match this search."
              : "No courses yet. Create one in the Learning tab."}
          </p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          {filteredCourses.map((course) => {
            const content = contentCache[course.id] || {
              modules: [],
              lessons: [],
              archived: [],
            };
            const isLoading = Boolean(loadingContents[course.id]);

            return (
              <CourseSection
                key={course.id}
                course={course}
                modules={content.modules}
                lessons={content.lessons}
                archived={content.archived}
                resources={getCourseResources(course.id)}
                expanded={Boolean(expandedCourses[course.id])}
                expandedModules={expandedModules}
                showArchived={Boolean(showArchived[course.id])}
                showResources={Boolean(showResources[course.id])}
                loading={isLoading}
                onToggleCourse={() => handleToggleCourse(course.id)}
                onToggleModule={handleToggleModule}
                onToggleArchived={() => handleToggleArchived(course.id)}
                onToggleResources={() => handleToggleResources(course.id)}
                onExpandAll={() => handleExpandAll(course.id)}
                onEditCourse={(c) => setEditCourseTarget(c)}
                onAddModule={(c) => {
                  setAddModuleTarget(c);
                  setEditModuleTarget(null);
                }}
                onAddLesson={(c, m) => {
                  setAddLessonTarget({ course: c, module: m });
                }}
                onEditModule={(c, m) => {
                  setEditModuleTarget({ course: c, module: m });
                  setAddModuleTarget(null);
                }}
                onDeleteModule={handleDeleteModule}
                onAddResource={(lesson) => {
                  setAddResourceTarget({ courseId: course.id, lesson });
                }}
                onDeleteLesson={handleDeleteLesson}
                onTogglePublish={handleTogglePublish}
                onArchive={handleArchiveLesson}
                onEditLesson={(lesson) => handleEditLesson(lesson, course.id)}
                onDownloadResource={() => {}}
                onPreviewResource={() => {}}
                onDeleteResource={() => {}}
                downloading={null}
              />
            );
          })}
        </DragDropContext>
      )}

      {/* ─── Modals ─────────────────────────────────────── */}

      {editCourseTarget && (
        <EditCourseModal
          course={editCourseTarget}
          onClose={() => setEditCourseTarget(null)}
          onSaved={() => {
            setEditCourseTarget(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {editLessonTarget && (
        <EditLessonModal
          lesson={editLessonTarget.lesson}
          courseId={editLessonTarget.courseId}
          onClose={() => setEditLessonTarget(null)}
          onSaved={() => {
            invalidateCourse(editLessonTarget.courseId);
            setEditLessonTarget(null);
          }}
          onDeleted={() => {
            invalidateCourse(editLessonTarget.courseId);
            setEditLessonTarget(null);
          }}
        />
      )}

      {(addModuleTarget || editModuleTarget) && (
        <AddModuleModal
          course={
            editModuleTarget
              ? { title: editModuleTarget.course.title, id: editModuleTarget.course.id }
              : { title: addModuleTarget.title, id: addModuleTarget.id }
          }
          form={
            editModuleTarget
              ? {
                  title: editModuleTarget.module.title,
                  description: editModuleTarget.module.description || "",
                  isPublished: editModuleTarget.module.isPublished !== false,
                }
              : { title: "", description: "", isPublished: true }
          }
          setForm={() => {}}
          onSave={handleSaveModule}
          onClose={() => {
            setAddModuleTarget(null);
            setEditModuleTarget(null);
          }}
          isEditing={Boolean(editModuleTarget)}
          mode="self-managed"
        />
      )}

      {addLessonTarget && (
        <AddLessonModal
          course={addLessonTarget.course}
          module={addLessonTarget.module}
          form={{
            title: "",
            description: "",
            lessonType: "video",
            videoUrl: "",
            markdown: "",
            duration: "",
            isPublished: true,
          }}
          setForm={() => {}}
          onSave={(e) => {
            if (e?.preventDefault) e.preventDefault();
            const form = e?.__form || {
              title: e?.title || "",
              description: e?.description || "",
              lessonType: e?.lessonType || "video",
              videoUrl: e?.videoUrl || "",
              markdown: e?.markdown || "",
              duration: e?.duration || "",
              isPublished: e?.isPublished !== false,
            };
            handleSaveNewLesson(form);
          }}
          onClose={() => setAddLessonTarget(null)}
          r2Loading={false}
          uploadProgress={0}
          handleFileImport={() => {}}
          mode="self-managed"
        />
      )}

      {addResourceTarget && (
        <AddResourceModal
          lesson={addResourceTarget.lesson}
          form={{
            name: "",
            type: "pdf",
            file: null,
            url: "",
            description: "",
          }}
          setForm={() => {}}
          onSave={(e) => {
            if (e?.preventDefault) e.preventDefault();
            handleSaveResource(e?.__form || {});
          }}
          onClose={() => setAddResourceTarget(null)}
          uploadingFile={false}
          mode="self-managed"
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Small tile component
// ─────────────────────────────────────────────────────────────
function StatTile({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
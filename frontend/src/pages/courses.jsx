// src/pages/courses.jsx
import { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase/config";
import {
  collection, addDoc, getDocs, query, orderBy, serverTimestamp,
  doc, updateDoc, deleteDoc, where, writeBatch,
} from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { v4 as uuidv4 } from "uuid";
import R2Service from "../services/r2service";
import { EditCourseModal } from "./librarycomponents/modals/editCourseModal";

import {
  Plus, Edit2, Trash2, Eye, EyeOff, Upload, X, Check,
  Loader2, BookOpen, AlertCircle, RefreshCw, Grid, List,
  Shield, User, LogOut, Cloud, Image as ImageIcon,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Category chip colors
// ─────────────────────────────────────────────────────────────
function getCategoryClass(category) {
  const colors = {
    business: "bg-blue-50 text-blue-800",
    technology: "bg-blue-50 text-blue-800",
    marketing: "bg-blue-50 text-blue-800",
    finance: "bg-blue-50 text-blue-800",
    entrepreneurship: "bg-blue-50 text-blue-800",
    leadership: "bg-blue-50 text-blue-800",
    fitness: "bg-blue-50 text-blue-800",
  };
  return colors[category] || "bg-slate-100 text-slate-700";
}

const CATEGORIES = [
  "business",
  "technology",
  "marketing",
  "finance",
  "entrepreneurship",
  "leadership",
  "fitness",
];

// ─────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────
function CourseGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-slate-200 bg-white overflow-hidden"
        >
          <div className="aspect-video bg-slate-100 animate-pulse" />
          <div className="p-4">
            <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
            <div className="mt-3 h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────
export default function CourseManager() {
  // ── Auth
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

  // ── Data
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── UI
  const [viewMode, setViewMode] = useState("grid");
  const [mobileView, setMobileView] = useState(false);
  const [error, setError] = useState(null);

  // ── Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editCourseTarget, setEditCourseTarget] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // ── Create form
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    category: "",
    price: 0,
    isFree: true,
    duration: "",
    level: "beginner",
  });
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // ───────────────────────────────────────────────────────────
  // Auth listener
  // ───────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setIsAuthenticated(!!u);
      if (!u) {
        setIsAdmin(false);
        setAuthLoading(false);
        return;
      }
      try {
        const snap = await getDocs(
          query(collection(db, "users"), where("__name__", "==", u.uid))
        );
        const isUserAdmin =
          !snap.empty && snap.docs[0].data().role === "admin";
        setIsAdmin(isUserAdmin);
        if (isUserAdmin) await fetchCourses();
      } catch (e) {
        console.error("admin check error:", e);
        setIsAdmin(false);
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Mobile detection
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setMobileView(mobile);
      if (mobile) setViewMode("list");
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ───────────────────────────────────────────────────────────
  // Data
  // ───────────────────────────────────────────────────────────
  const fetchCourses = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(
        query(collection(db, "courses"), orderBy("createdAt", "desc"))
      );
      setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("fetchCourses error:", e);
      setError("Couldn't load courses.");
    } finally {
      setLoading(false);
    }
  };

  // ───────────────────────────────────────────────────────────
  // Login
  // ───────────────────────────────────────────────────────────
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      setLoginForm({ email: "", password: "" });
    } catch (e) {
      console.error("login error:", e);
      alert("Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
    } catch (e) {
      console.error("logout error:", e);
    }
  };

  // ───────────────────────────────────────────────────────────
  // Thumbnail
  // ───────────────────────────────────────────────────────────
  const handleThumbnailSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file (JPG, PNG, etc.)");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB");
      e.target.value = "";
      return;
    }

    // Clean up the previous preview blob if any
    if (thumbnailPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(thumbnailPreview);
    }

    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const clearThumbnail = () => {
    if (thumbnailPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnailFile(null);
    setThumbnailPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ───────────────────────────────────────────────────────────
  // Create course
  // ───────────────────────────────────────────────────────────
  const resetCourseForm = () => {
    setCourseForm({
      title: "",
      description: "",
      category: "",
      price: 0,
      isFree: true,
      duration: "",
      level: "beginner",
    });
    clearThumbnail();
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();

    if (!isAuthenticated || !isAdmin) {
      alert("You must be signed in as an admin.");
      return;
    }
    if (!courseForm.title.trim() || !courseForm.category) {
      alert("Title and category are required.");
      return;
    }
    if (!thumbnailFile) {
      alert("Please upload a course thumbnail.");
      return;
    }
    if (loading || uploading) return;

    try {
      setUploading(true);

      // Create the course doc first so we have an ID for R2 paths
      const courseData = {
        title: courseForm.title.trim(),
        description: courseForm.description.trim(),
        category: courseForm.category,
        level: courseForm.level,
        duration: courseForm.duration.trim(),
        price: courseForm.isFree ? 0 : Number(courseForm.price) || 0,
        isFree: courseForm.isFree,
        published: false,
        enrolledCount: 0,
        lessonCount: 0,
        rating: 0,
        averageRating: 0,
        totalReviews: 0,
        status: "draft",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        createdByEmail: user.email,
      };

      const courseRef = await addDoc(collection(db, "courses"), courseData);
      const courseId = courseRef.id;

      // Upload thumbnail to R2
      let thumbnailUrl = null;
      try {
        const upload = await R2Service.uploadFile(thumbnailFile, {
          folder: "course-thumbnails",
          courseId,
          metadata: {
            type: "thumbnail",
            originalName: thumbnailFile.name,
          },
        });
        if (!upload.success) {
          throw new Error(upload.error || "Upload failed");
        }
        thumbnailUrl = upload.data.url;
      } catch (uploadError) {
        // Roll back the course doc so we don't leave orphans
        await deleteDoc(doc(db, "courses", courseId));
        throw new Error(`Thumbnail upload failed: ${uploadError.message}`);
      }

      await updateDoc(doc(db, "courses", courseId), {
        thumbnailUrl,
        updatedAt: serverTimestamp(),
      });

      alert("Course created.");
      setShowCreateModal(false);
      resetCourseForm();
      await fetchCourses();
    } catch (err) {
      console.error("createCourse error:", err);
      alert(err.message || "Failed to create course.");
    } finally {
      setUploading(false);
    }
  };

  // ───────────────────────────────────────────────────────────
  // Publish / delete
  // ───────────────────────────────────────────────────────────
  const togglePublishCourse = async (course) => {
    if (!isAdmin) return;
    if (!course.thumbnailUrl && !course.published) {
      alert("Add a thumbnail before publishing.");
      return;
    }
    try {
      setLoading(true);
      await updateDoc(doc(db, "courses", course.id), {
        published: !course.published,
        status: !course.published ? "published" : "draft",
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      await fetchCourses();
    } catch (e) {
      console.error("togglePublish error:", e);
      alert("Failed to update publish state.");
    } finally {
      setLoading(false);
    }
  };

  const deleteCourse = async (courseId) => {
    if (!isAdmin) return;
    if (loading) return;

    try {
      setLoading(true);

      // Best-effort R2 cleanup — thumbnails + resources
      try {
        const files = await R2Service.listFiles({
          prefix: `course-resources/${courseId}/`,
        });
        if (files?.length) {
          await R2Service.batchDeleteFiles(
            files.map((f) => f.key).filter(Boolean)
          );
        }
        const thumbs = await R2Service.listFiles({
          prefix: `course-thumbnails/${courseId}/`,
        });
        if (thumbs?.length) {
          await R2Service.batchDeleteFiles(
            thumbs.map((f) => f.key).filter(Boolean)
          );
        }
      } catch (r2Error) {
        console.warn("R2 cleanup partial:", r2Error);
      }

      await deleteDoc(doc(db, "courses", courseId));
      setConfirmDelete(null);
      await fetchCourses();
    } catch (e) {
      console.error("deleteCourse error:", e);
      alert("Failed to delete course.");
    } finally {
      setLoading(false);
    }
  };

  // ───────────────────────────────────────────────────────────
  // Loading state (auth)
  // ───────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-blue-800" />
        <p className="mt-3 text-sm text-slate-500">Checking access…</p>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────
  // Login gate
  // ───────────────────────────────────────────────────────────
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-12 rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
            <Shield className="h-5 w-5 text-blue-800" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-slate-900">
            {!isAuthenticated
              ? "Sign in as admin"
              : "Admin access required"}
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            {!isAuthenticated
              ? "Sign in to manage courses."
              : "Your account doesn't have admin permissions."}
          </p>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={loginForm.email}
              onChange={(e) =>
                setLoginForm((p) => ({ ...p, email: e.target.value }))
              }
              required
              disabled={loading}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-blue-800 disabled:bg-slate-50"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm((p) => ({ ...p, password: e.target.value }))
              }
              required
              disabled={loading}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-blue-800 disabled:bg-slate-50"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────
  // Main render
  // ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Courses</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Create courses and manage publishing
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!mobileView && (
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded ${
                  viewMode === "list" ? "bg-white shadow-sm" : ""
                }`}
                title="List view"
              >
                <List className="h-4 w-4 text-slate-600" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded ${
                  viewMode === "grid" ? "bg-white shadow-sm" : ""
                }`}
                title="Grid view"
              >
                <Grid className="h-4 w-4 text-slate-600" />
              </button>
            </div>
          )}
          <button
            onClick={fetchCourses}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded bg-blue-800 text-white hover:bg-blue-900"
          >
            <Plus className="h-4 w-4" />
            Create course
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
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
          label="Published"
          value={courses.filter((c) => c.published).length}
        />
        <StatTile
          label="Drafts"
          value={courses.filter((c) => !c.published).length}
        />
        <StatTile
          label="Enrollments"
          value={courses.reduce((s, c) => s + (c.enrolledCount || 0), 0)}
        />
      </div>

      {/* Course list */}
      {loading && courses.length === 0 ? (
        <CourseGridSkeleton />
      ) : courses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-12 text-center">
          <BookOpen className="mx-auto h-6 w-6 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            No courses yet. Create your first course to get started.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded bg-blue-800 text-white hover:bg-blue-900"
          >
            <Plus className="h-4 w-4" />
            Create course
          </button>
        </div>
      ) : viewMode === "grid" && !mobileView ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onEdit={() => setEditCourseTarget(course)}
              onTogglePublish={() => togglePublishCourse(course)}
              onDelete={() => setConfirmDelete(course)}
              disabled={loading}
            />
          ))}
        </div>
      ) : (
        <CourseTable
          courses={courses}
          onEdit={setEditCourseTarget}
          onTogglePublish={togglePublishCourse}
          onDelete={setConfirmDelete}
          disabled={loading}
        />
      )}

      {/* ─── Modals ─────────────────────────────────────── */}

      {showCreateModal && (
        <CreateCourseModal
          form={courseForm}
          setForm={setCourseForm}
          thumbnailFile={thumbnailFile}
          thumbnailPreview={thumbnailPreview}
          fileInputRef={fileInputRef}
          onThumbnailSelect={handleThumbnailSelect}
          onClearThumbnail={clearThumbnail}
          uploading={uploading}
          saving={loading}
          onSubmit={handleCreateCourse}
          onClose={() => {
            if (loading || uploading) return;
            setShowCreateModal(false);
            resetCourseForm();
          }}
        />
      )}

      {editCourseTarget && (
        <EditCourseModal
          course={editCourseTarget}
          onClose={() => setEditCourseTarget(null)}
          onSaved={() => {
            setEditCourseTarget(null);
            fetchCourses();
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDeleteModal
          course={confirmDelete}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => deleteCourse(confirmDelete.id)}
          disabled={loading}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Stat tile
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

// ─────────────────────────────────────────────────────────────
// Course card (grid)
// ─────────────────────────────────────────────────────────────
function CourseCard({ course, onEdit, onTogglePublish, onDelete, disabled }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden flex flex-col">
      <div className="aspect-video bg-slate-100 relative">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="h-8 w-8 text-slate-300" />
          </div>
        )}
        <span
          className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded ${
            course.published
              ? "bg-green-600 text-white"
              : "bg-slate-900/70 text-white"
          }`}
        >
          {course.published ? "Published" : "Draft"}
        </span>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-sm font-semibold text-slate-900 truncate">
          {course.title}
        </h3>

        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs px-2 py-0.5 rounded ${getCategoryClass(
              course.category
            )}`}
          >
            {course.category || "Uncategorized"}
          </span>
          <span className="text-xs text-slate-500">
            {course.lessonCount || 0} lessons
          </span>
          <span className="text-xs text-slate-500">
            {course.enrolledCount || 0} enrolled
          </span>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onTogglePublish}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {course.published ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                Unpublish
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                Publish
              </>
            )}
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              disabled={disabled}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-50"
              title="Edit"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              disabled={disabled}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Course table (list)
// ─────────────────────────────────────────────────────────────
function CourseTable({ courses, onEdit, onTogglePublish, onDelete, disabled }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50/60 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Course
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Lessons
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Enrolled
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr
                key={course.id}
                className="border-b border-slate-100 hover:bg-slate-50"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-14 rounded overflow-hidden bg-slate-100 flex-shrink-0">
                      {course.thumbnailUrl ? (
                        <img
                          src={course.thumbnailUrl}
                          alt={course.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <BookOpen className="h-4 w-4 text-slate-300" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {course.title}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {course.description?.substring(0, 60)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${getCategoryClass(
                      course.category
                    )}`}
                  >
                    {course.category || "Uncategorized"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 tabular-nums">
                  {course.lessonCount || 0}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 tabular-nums">
                  {course.enrolledCount || 0}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      course.published
                        ? "bg-green-50 text-green-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {course.published ? "Live" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onTogglePublish(course)}
                      disabled={disabled}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-50"
                      title={course.published ? "Unpublish" : "Publish"}
                    >
                      {course.published ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => onEdit(course)}
                      disabled={disabled}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-50"
                      title="Edit"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(course)}
                      disabled={disabled}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Create course modal
// ─────────────────────────────────────────────────────────────
function CreateCourseModal({
  form,
  setForm,
  thumbnailFile,
  thumbnailPreview,
  fileInputRef,
  onThumbnailSelect,
  onClearThumbnail,
  uploading,
  saving,
  onSubmit,
  onClose,
}) {
  const busy = uploading || saving;
  const canSubmit =
    !busy && form.title.trim() && form.category && Boolean(thumbnailFile);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="bg-white rounded-lg border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Create course</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Add a new course to your catalog
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">
            {/* Thumbnail */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Thumbnail
              </label>
              <div className="flex items-start gap-4">
                <div className="w-40 aspect-video rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                  {thumbnailPreview ? (
                    <>
                      <img
                        src={thumbnailPreview}
                        alt="Thumbnail preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={onClearThumbnail}
                        disabled={busy}
                        className="absolute top-1 right-1 p-1 rounded bg-slate-900/60 text-white hover:bg-slate-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <ImageIcon className="h-6 w-6 text-slate-300" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onThumbnailSelect}
                    disabled={busy}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4" />
                    {thumbnailPreview ? "Change" : "Upload"}
                  </button>
                  <p className="mt-2 text-xs text-slate-500">
                    JPG, PNG, or GIF. Max 5MB. Recommended 1280×720.
                  </p>
                </div>
              </div>
            </div>

            {/* Title + Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title: e.target.value }))
                  }
                  disabled={busy}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-800 disabled:bg-slate-50"
                  placeholder="e.g. Introduction to Marketing"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, category: e.target.value }))
                  }
                  disabled={busy}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-800 disabled:bg-slate-50"
                >
                  <option value="">Select…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                disabled={busy}
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-800 disabled:bg-slate-50 resize-y"
                placeholder="What will students learn?"
              />
            </div>

            {/* Level + Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Level
                </label>
                <select
                  value={form.level}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, level: e.target.value }))
                  }
                  disabled={busy}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-800 disabled:bg-slate-50"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Duration
                </label>
                <input
                  type="text"
                  value={form.duration}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, duration: e.target.value }))
                  }
                  disabled={busy}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-800 disabled:bg-slate-50"
                  placeholder="e.g. 8 weeks"
                />
              </div>
            </div>

            {/* Price + Free */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Price
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, price: e.target.value }))
                  }
                  disabled={busy || form.isFree}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-800 disabled:bg-slate-50"
                  placeholder="0"
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isFree}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, isFree: e.target.checked }))
                    }
                    disabled={busy}
                    className="h-4 w-4 rounded border-slate-300 accent-blue-800"
                  />
                  This is a free course
                </label>
              </div>
            </div>

            {/* R2 note */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start gap-2">
                <Cloud className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-slate-600">
                  Thumbnails and lesson resources are stored in Cloudflare R2.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200 flex-shrink-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 text-sm rounded border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded bg-blue-800 text-white hover:bg-blue-900 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Uploading…
                </>
              ) : saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Create course
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Confirm delete modal
// ─────────────────────────────────────────────────────────────
function ConfirmDeleteModal({ course, onCancel, onConfirm, disabled }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={disabled ? undefined : onCancel}
    >
      <div
        className="bg-white rounded-lg border border-slate-200 w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            Delete course
          </h3>
          <p className="mt-1.5 text-sm text-slate-500">
            Delete <strong className="text-slate-700">{course.title}</strong>?{" "}
            This cannot be undone. All associated resources in R2 will be
            removed.
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={disabled}
            className="px-4 py-2 text-sm rounded border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={disabled}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {disabled ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
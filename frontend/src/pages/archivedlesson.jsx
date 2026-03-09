// src/components/ArchivedLesson.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/config";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { 
  ArrowLeft, 
  Archive, 
  AlertCircle,
  CheckCircle,
  FileText,
  Video,
  Calendar,
  Clock,
  Download,
  Eye,
  Loader2
} from "lucide-react";

export default function ArchivedLesson() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchArchivedLesson(currentUser.uid);
      } else {
        navigate("/login");
      }
    });
    return () => unsubscribe();
  }, [courseId, lessonId, navigate]);

  const fetchArchivedLesson = async (userId) => {
    try {
      setLoading(true);
      
      // Fetch course details
      const courseRef = doc(db, "courses", courseId);
      const courseDoc = await getDoc(courseRef);
      
      if (!courseDoc.exists()) {
        setError("Course not found");
        return;
      }
      setCourse({ id: courseDoc.id, ...courseDoc.data() });

      // Fetch archived lesson
      const lessonRef = doc(db, "courses", courseId, "archivedLessons", lessonId);
      const lessonDoc = await getDoc(lessonRef);
      
      if (!lessonDoc.exists()) {
        setError("Archived lesson not found");
        return;
      }
      
      const lessonData = { id: lessonDoc.id, ...lessonDoc.data() };
      setLesson(lessonData);

      // Check if user has access to this archived lesson
      const enrollmentsRef = collection(db, "enrollments");
      const enrollmentQuery = query(
        enrollmentsRef,
        where("userId", "==", userId),
        where("courseId", "==", courseId)
      );
      const enrollmentSnapshot = await getDocs(enrollmentQuery);
      
      if (!enrollmentSnapshot.empty) {
        const enrollment = enrollmentSnapshot.docs[0].data();
        const enrolledAt = enrollment.enrolledAt?.toDate?.() || new Date(enrollment.enrolledAt);
        const archivedAt = lessonData.archivedAt?.toDate?.() || new Date(lessonData.archivedAt);
        
        // User has access if they enrolled before lesson was archived
        setHasAccess(archivedAt > enrolledAt);
      }

    } catch (err) {
      console.error("Error fetching archived lesson:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadResource = async (resource) => {
    try {
      setDownloading(resource.key || resource.id);
      
      const accountId = import.meta.env.VITE_R2_ACCOUNT_ID;
      if (!accountId) {
        throw new Error("Configuration error: Missing R2 account ID");
      }
      
      const publicUrl = `https://pub-${accountId}.r2.dev/${resource.key || resource.filePath}`;
      const response = await fetch(publicUrl);
      
      if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`);
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      let filename = resource.name || resource.originalName || 'download';
      const contentDisposition = response.headers.get('content-disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      if (!filename.includes('.')) {
        const contentType = response.headers.get('content-type');
        if (contentType) {
          const extension = contentType.split('/').pop();
          filename = `${filename}.${extension}`;
        }
      }
      
      link.href = url;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        setDownloading(null);
      }, 100);
      
    } catch (error) {
      console.error("Download error:", error);
      alert(`Download failed: ${error.message}`);
      setDownloading(null);
    }
  };

  const handlePreviewResource = async (resource) => {
    try {
      setDownloading(resource.key || resource.id);
      
      const accountId = import.meta.env.VITE_R2_ACCOUNT_ID;
      if (accountId) {
        const publicUrl = `https://pub-${accountId}.r2.dev/${resource.key || resource.filePath}`;
        window.open(publicUrl, '_blank');
      }
    } catch (error) {
      console.error("Preview error:", error);
      handleDownloadResource(resource);
    } finally {
      setTimeout(() => setDownloading(null), 1000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !lesson || !hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error || "Access Denied"}
          </h2>
          <p className="text-gray-600 mb-6">
            {error || "You don't have access to this archived lesson."}
          </p>
          <button
            onClick={() => navigate(`/course/${courseId}`)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Course
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/course/${courseId}`)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{lesson.title}</h1>
                <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1">
                  <Archive size={12} />
                  Archived
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  Archived: {new Date(lesson.archivedAt).toLocaleDateString()}
                </span>
                {lesson.archiveReason && (
                  <span>• Reason: {lesson.archiveReason}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Warning Banner */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Archive className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-yellow-800">Legacy Content</h3>
              <p className="text-sm text-yellow-700 mt-1">
                This is an archived version of the lesson from {new Date(lesson.archivedAt).toLocaleDateString()}. 
                The current course may have updated content on this topic.
              </p>
            </div>
          </div>
        </div>

        {/* Lesson Content */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          {/* Video Player */}
          {lesson.videoUrl && (
            <div className="aspect-video bg-black rounded-lg mb-6">
              <iframe
                src={lesson.videoUrl.replace('watch?v=', 'embed/')}
                className="w-full h-full"
                allowFullScreen
                title={lesson.title}
              />
            </div>
          )}

          {/* Description */}
          {lesson.description && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Description</h2>
              <p className="text-gray-700">{lesson.description}</p>
            </div>
          )}

          {/* Content for reading lessons */}
          {lesson.content && (
            <div className="prose max-w-none">
              {lesson.content}
            </div>
          )}

          {/* Resources */}
          {lesson.resources && lesson.resources.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h2 className="text-lg font-semibold mb-4">Resources</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {lesson.resources.map((resource) => (
                  <div key={resource.id} className="border rounded-lg p-4 hover:shadow-md transition">
                    <FileText className="h-8 w-8 text-gray-400 mb-2" />
                    <h3 className="font-medium text-sm mb-1">{resource.name}</h3>
                    {resource.size && (
                      <p className="text-xs text-gray-500 mb-2">
                        {(resource.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePreviewResource(resource)}
                        disabled={downloading === (resource.key || resource.id)}
                        className="flex-1 text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {downloading === (resource.key || resource.id) ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                        Preview
                      </button>
                      <button
                        onClick={() => handleDownloadResource(resource)}
                        disabled={downloading === (resource.key || resource.id)}
                        className="text-sm px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        <Download className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Note */}
          <div className="mt-6 pt-4 border-t text-sm text-gray-500">
            <p>
              This content is from a previous version of the course and is kept 
              for your reference. The current course may have updated content on this topic.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
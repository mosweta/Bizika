// src/components/CoursePage.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db, functions } from "../firebase/config";
import EdpuzzleVideoPlayer from './videoplayer';
import { 
  doc, 
  getDoc, 
  collection, 
  getDocs,
  updateDoc,
  serverTimestamp,
  query,
  where
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import {
  BookOpen,
  Clock,
  Users,
  CheckCircle,
  ChevronLeft,
  FileText,
  Download,
  Award,
  Eye,
  FileSpreadsheet,
  Presentation,
  Folder,
  ExternalLink,
  Loader2,
  Grid,
  List,
  File,
  Image as ImageIcon,
  Video,
  Archive,
  Menu,
  X,
  ChevronRight,
  ChevronDown
} from "lucide-react";

// File type mapping for icons
const FILE_ICONS = {
  pdf: { icon: FileText, color: "text-red-600", bgColor: "bg-red-50" },
  doc: { icon: FileText, color: "text-blue-600", bgColor: "bg-blue-50" },
  docx: { icon: FileText, color: "text-blue-600", bgColor: "bg-blue-50" },
  xls: { icon: FileSpreadsheet, color: "text-green-600", bgColor: "bg-green-50" },
  xlsx: { icon: FileSpreadsheet, color: "text-green-600", bgColor: "bg-green-50" },
  ppt: { icon: Presentation, color: "text-orange-600", bgColor: "bg-orange-50" },
  pptx: { icon: Presentation, color: "text-orange-600", bgColor: "bg-orange-50" },
  zip: { icon: Archive, color: "text-purple-600", bgColor: "bg-purple-50" },
  jpg: { icon: ImageIcon, color: "text-pink-600", bgColor: "bg-pink-50" },
  jpeg: { icon: ImageIcon, color: "text-pink-600", bgColor: "bg-pink-50" },
  png: { icon: ImageIcon, color: "text-pink-600", bgColor: "bg-pink-50" },
  gif: { icon: ImageIcon, color: "text-pink-600", bgColor: "bg-pink-50" },
  mp4: { icon: Video, color: "text-indigo-600", bgColor: "bg-indigo-50" },
  webm: { icon: Video, color: "text-indigo-600", bgColor: "bg-indigo-50" },
  default: { icon: File, color: "text-gray-600", bgColor: "bg-gray-50" }
};

// Helper function to get file icon
const FileIcon = ({ type, className = "h-5 w-5" }) => {
  const IconComponent = FILE_ICONS[type]?.icon || File;
  return <IconComponent className={className} />;
};

// Helper function to get file type from filename
const getFileType = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  return FILE_ICONS[ext] ? ext : 'default';
};

// Mobile-friendly Resource Card
const ResourceCard = ({ resource, lessonTitle, onDownload, onPreview, downloading, isMobile = false }) => {
  const fileType = getFileType(resource.name || resource.originalName || '');
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg flex-shrink-0 ${FILE_ICONS[fileType]?.bgColor || 'bg-gray-100'}`}>
            <FileIcon type={fileType} className={`${FILE_ICONS[fileType]?.color || 'text-gray-600'} ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate text-sm md:text-base">
              {resource.name || resource.originalName}
            </h4>
            <div className="flex flex-wrap items-center gap-1 md:gap-2 text-xs text-gray-500 mt-1">
              <span className="capitalize">{resource.category || fileType}</span>
              <span className="hidden md:inline">•</span>
              <span>{resource.size || 'N/A'}</span>
              {lessonTitle && (
                <>
                  <span className="hidden md:inline">•</span>
                  <span className="text-xs text-gray-500 truncate">From: {lessonTitle}</span>
                </>
              )}
            </div>
            {lessonTitle && isMobile && (
              <p className="text-xs text-gray-500 mt-1 truncate">From: {lessonTitle}</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2">
        {resource.viewable !== false && (
          <button
            onClick={() => onPreview(resource)}
            disabled={downloading === resource.key}
            className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 flex-1"
          >
            {downloading === resource.key ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Eye size={14} />
            )}
            Preview
          </button>
        )}
        
        {resource.downloadable !== false && (
          <button
            onClick={() => onDownload(resource)}
            disabled={downloading === resource.key}
            className="px-3 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-md text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 flex-1"
          >
            {downloading === resource.key ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Download size={14} />
            )}
            Download
          </button>
        )}
      </div>
    </div>
  );
};

// Mobile Collapsible Resources Section
const MobileResourcesSection = ({ title, description, resources, onDownload, onPreview, downloading, isExpanded, onToggle }) => {
  return (
    <div className="bg-white rounded-xl shadow border overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-500" />
        )}
      </button>
      
      {isExpanded && (
        <div className="p-4 border-t border-gray-100">
          <div className="space-y-3">
            {resources.map((resource, index) => (
              <ResourceCard
                key={index}
                resource={resource}
                onDownload={onDownload}
                onPreview={onPreview}
                downloading={downloading}
                isMobile={true}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function CoursePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [downloading, setDownloading] = useState(null);
  const [resourceViewMode, setResourceViewMode] = useState("list");
  const [showMobileLessons, setShowMobileLessons] = useState(false);
  const [expandedResources, setExpandedResources] = useState({
    lessonResources: false,
    allResources: false
  });
  
  const currentLessonIndex = activeLesson 
    ? lessons.findIndex(lesson => lesson.id === activeLesson.id)
    : -1;
  const hasNextLesson = currentLessonIndex < lessons.length - 1;
  const hasPreviousLesson = currentLessonIndex > 0;

  // Fetch questions for active lesson
  useEffect(() => {
    const fetchQuestions = async () => {
      if (activeLesson) {
        const questionsRef = collection(db, "courses", courseId, "lessons", activeLesson.id, "questions");
        const questionsSnap = await getDocs(questionsRef);
        const questionsData = questionsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setQuestions(questionsData.sort((a, b) => a.timestamp - b.timestamp));
      }
    };
    
    fetchQuestions();
  }, [activeLesson, courseId]);

  // Auth state and course data
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchCourseData(currentUser.uid);
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [courseId, navigate]);

  const fetchCourseData = async (userId) => {
    try {
      setLoading(true);
      
      const courseDoc = await getDoc(doc(db, "courses", courseId));
      if (!courseDoc.exists()) {
        navigate("/courses");
        return;
      }
      setCourse({ id: courseDoc.id, ...courseDoc.data() });

      const lessonsRef = collection(db, "courses", courseId, "lessons");
      const lessonsSnap = await getDocs(lessonsRef);
      const lessonsData = lessonsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLessons(lessonsData.sort((a, b) => a.order - b.order));

      const enrollmentsRef = collection(db, "enrollments");
      const enrollmentQuery = query(
        enrollmentsRef,
        where("userId", "==", userId),
        where("courseId", "==", courseId)
      );
      const enrollmentSnap = await getDocs(enrollmentQuery);
      
      if (!enrollmentSnap.empty) {
        const enrollmentDoc = enrollmentSnap.docs[0];
        setEnrollment({
          id: enrollmentDoc.id,
          ...enrollmentDoc.data()
        });
      }

      if (lessonsData.length > 0 && !activeLesson) {
        setActiveLesson(lessonsData[0]);
      }

    } catch (error) {
      console.error("Error fetching course data:", error);
    } finally {
      setLoading(false);
    }
  };

  const markLessonComplete = async (lessonId) => {
    if (!enrollment) return;

    try {
      const completedLessons = enrollment.completedLessons || [];
      
      if (!completedLessons.includes(lessonId)) {
        const newCompletedLessons = [...completedLessons, lessonId];
        
        await updateDoc(doc(db, "enrollments", enrollment.id), {
          completedLessons: newCompletedLessons,
          progress: Math.round((newCompletedLessons.length / lessons.length) * 100),
          lastAccessed: serverTimestamp()
        });

        setEnrollment(prev => ({
          ...prev,
          completedLessons: newCompletedLessons,
          progress: Math.round((newCompletedLessons.length / lessons.length) * 100)
        }));
      }
    } catch (error) {
      console.error("Error marking lesson complete:", error);
    }
  };

  const handleQuestionAnswered = async (question) => {
    try {
      await updateDoc(
        doc(db, "courses", courseId, "lessons", activeLesson.id, "questions", question.id),
        {
          userAnswer: question.userAnswer,
          answered: true,
          answeredAt: question.answeredAt
        }
      );
      
      setQuestions(prev => 
        prev.map(q => q.id === question.id ? question : q)
      );
    } catch (error) {
      console.error("Error saving question answer:", error);
    }
  };

  // Download resource
  const handleDownloadResource = async (resource) => {
    try {
      setDownloading(resource.key);
      
      const accountId = import.meta.env.VITE_R2_ACCOUNT_ID;
      if (!accountId) {
        throw new Error("Configuration error: Missing R2 account ID");
      }
      
      const publicUrl = `https://pub-${accountId}.r2.dev/${resource.key}`;
      
      // Create download link with filename
      const link = document.createElement('a');
      link.href = publicUrl;
      link.download = resource.name || resource.originalName || 'download';
      link.target = '_blank';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => setDownloading(null), 1000);
      
    } catch (error) {
      console.error("❌ Download error:", error);
      alert(`Download failed: ${error.message}`);
      setDownloading(null);
    }
  };

  const handlePreviewResource = async (resource) => {
    try {
      setDownloading(resource.key);
      
      const accountId = import.meta.env.VITE_R2_ACCOUNT_ID;
      if (!accountId) {
        throw new Error("Configuration error: Missing R2 account ID");
      }
      
      const publicUrl = `https://pub-${accountId}.r2.dev/${resource.key}`;
      window.open(publicUrl, '_blank');
      
      setTimeout(() => setDownloading(null), 1000);
      
    } catch (error) {
      console.error("❌ Preview error:", error);
      alert(`Preview failed: ${error.message}`);
      setDownloading(null);
    }
  };

  // Get all resources from all lessons
  const getAllResources = () => {
    const allResources = [];
    
    lessons.forEach(lesson => {
      const resourceArrays = [
        ...(lesson.slides || []),
        ...(lesson.documents || []),
        ...(lesson.templates || []),
        ...(lesson.resources || [])
      ];
      
      resourceArrays.forEach(resource => {
        if (resource) {
          allResources.push({
            ...resource,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonOrder: lesson.order
          });
        }
      });
    });
    
    return allResources;
  };

  // Get resources for active lesson
  const getActiveLessonResources = () => {
    if (!activeLesson) return [];
    
    const resourceArrays = [
      ...(activeLesson.slides || []),
      ...(activeLesson.documents || []),
      ...(activeLesson.templates || []),
      ...(activeLesson.resources || [])
    ];
    
    return resourceArrays.filter(resource => resource);
  };

  const allResources = getAllResources();
  const activeLessonResources = getActiveLessonResources();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Course not found</h2>
          <button
            onClick={() => navigate("/courses")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Browse Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="bg-white border-b border-gray-200 lg:hidden">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="max-w-[200px]">
                <h1 className="text-lg font-bold text-gray-900 truncate">{course.title}</h1>
                <p className="text-xs text-gray-500 truncate">Course</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {enrollment && (
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {enrollment.progress || 0}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {enrollment.completedLessons?.length || 0}/{lessons.length}
                  </div>
                </div>
              )}
              
              <button
                onClick={() => setShowMobileLessons(!showMobileLessons)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                {showMobileLessons ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="bg-white border-b border-gray-200 hidden lg:block">
        <div className="px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft size={20} />
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">{course.title}</h1>
                <p className="text-sm text-gray-500">Course</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {enrollment && (
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    Progress: {enrollment.progress || 0}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {enrollment.completedLessons?.length || 0} of {lessons.length} lessons
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left Column - Course Content (Mobile: Full width, Desktop: 2/3) */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Video Player */}
            {activeLesson ? (
              <div className="bg-white rounded-xl shadow border p-3 md:p-4">
                <EdpuzzleVideoPlayer
                  videoUrl={activeLesson.videoUrl}
                  lessonTitle={activeLesson.title}
                  hasNextLesson={hasNextLesson}
                  hasPreviousLesson={hasPreviousLesson}
                  onNextLesson={() => {
                    if (hasNextLesson) {
                      setActiveLesson(lessons[currentLessonIndex + 1]);
                    }
                  }}
                  onPreviousLesson={() => {
                    if (hasPreviousLesson) {
                      setActiveLesson(lessons[currentLessonIndex - 1]);
                    }
                  }}
                  questions={questions}
                  onQuestionAnswered={handleQuestionAnswered}
                />
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-3">
                  <div className="flex-1">
                    <h2 className="text-lg md:text-xl font-bold text-gray-900">{activeLesson.title}</h2>
                    <p className="text-gray-600 mt-1 text-sm md:text-base">{activeLesson.description}</p>
                  </div>
                  
                  <button
                    onClick={() => markLessonComplete(activeLesson.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm md:text-base w-full sm:w-auto justify-center"
                    disabled={enrollment?.completedLessons?.includes(activeLesson.id)}
                  >
                    <CheckCircle size={18} />
                    {enrollment?.completedLessons?.includes(activeLesson.id) 
                      ? "Completed" 
                      : "Mark Complete"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow border p-6 md:p-8 text-center">
                <BookOpen className="h-10 w-10 md:h-12 md:w-12 text-gray-400 mx-auto mb-3 md:mb-4" />
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">
                  Select a lesson to begin
                </h3>
                <p className="text-gray-600 text-sm md:text-base">
                  Choose a lesson from the sidebar to start learning
                </p>
              </div>
            )}

            {/* Mobile: Collapsible Resources Sections */}
            <div className="lg:hidden space-y-4">
              {/* Active Lesson Resources (Mobile) */}
              {activeLesson && activeLessonResources.length > 0 && (
                <MobileResourcesSection
                  title="Lesson Resources"
                  description={`Downloadable materials for ${activeLesson.title}`}
                  resources={activeLessonResources}
                  onDownload={handleDownloadResource}
                  onPreview={handlePreviewResource}
                  downloading={downloading}
                  isExpanded={expandedResources.lessonResources}
                  onToggle={() => setExpandedResources(prev => ({
                    ...prev,
                    lessonResources: !prev.lessonResources
                  }))}
                />
              )}

              {/* All Course Resources (Mobile) */}
              {allResources.length > 0 && (
                <MobileResourcesSection
                  title="All Course Resources"
                  description={`${allResources.length} resources total`}
                  resources={allResources}
                  onDownload={handleDownloadResource}
                  onPreview={handlePreviewResource}
                  downloading={downloading}
                  isExpanded={expandedResources.allResources}
                  onToggle={() => setExpandedResources(prev => ({
                    ...prev,
                    allResources: !prev.allResources
                  }))}
                />
              )}
            </div>

            {/* Desktop: Regular Resources Sections */}
            <div className="hidden lg:block space-y-6">
              {/* Active Lesson Resources (Desktop) */}
              {activeLesson && activeLessonResources.length > 0 && (
                <div className="bg-white rounded-xl shadow border p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Lesson Resources</h3>
                      <p className="text-sm text-gray-500">
                        Downloadable materials for {activeLesson.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setResourceViewMode("list")}
                        className={`p-2 rounded ${resourceViewMode === "list" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"}`}
                      >
                        <List size={16} />
                      </button>
                      <button
                        onClick={() => setResourceViewMode("grid")}
                        className={`p-2 rounded ${resourceViewMode === "grid" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"}`}
                      >
                        <Grid size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className={resourceViewMode === "grid" 
                    ? "grid grid-cols-1 md:grid-cols-2 gap-4" 
                    : "space-y-4"
                  }>
                    {activeLessonResources.map((resource, index) => (
                      <ResourceCard
                        key={index}
                        resource={resource}
                        lessonTitle={activeLesson.title}
                        onDownload={handleDownloadResource}
                        onPreview={handlePreviewResource}
                        downloading={downloading}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* All Course Resources (Desktop) */}
              {allResources.length > 0 && (
                <div className="bg-white rounded-xl shadow border p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">All Course Resources</h3>
                      <p className="text-sm text-gray-500">
                        All downloadable materials from all lessons
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {allResources.length} resources total
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {allResources.map((resource, index) => (
                      <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`p-2 rounded flex-shrink-0 ${FILE_ICONS[getFileType(resource.name)]?.bgColor || 'bg-gray-100'}`}>
                            <FileIcon type={getFileType(resource.name)} className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate text-sm md:text-base">
                              {resource.name || resource.originalName}
                            </h4>
                            <div className="flex flex-wrap items-center gap-1 md:gap-2 text-xs text-gray-500">
                              <span>Lesson {resource.lessonOrder}: {resource.lessonTitle}</span>
                              <span className="hidden md:inline">•</span>
                              <span>{resource.category || getFileType(resource.name)}</span>
                              <span className="hidden md:inline">•</span>
                              <span>{resource.size || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {resource.viewable !== false && (
                            <button
                              onClick={() => handlePreviewResource(resource)}
                              disabled={downloading === resource.key}
                              className="px-3 py-1 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded flex items-center gap-1 disabled:opacity-50"
                            >
                              {downloading === resource.key ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Eye size={12} />
                              )}
                              Preview
                            </button>
                          )}
                          
                          {resource.downloadable !== false && (
                            <button
                              onClick={() => handleDownloadResource(resource)}
                              disabled={downloading === resource.key}
                              className="px-3 py-1 text-sm bg-green-50 text-green-700 hover:bg-green-100 rounded flex items-center gap-1 disabled:opacity-50"
                            >
                              {downloading === resource.key ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Download size={12} />
                              )}
                              Download
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Course Description */}
            <div className="bg-white rounded-xl shadow border p-4 md:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Description</h3>
              <p className="text-gray-700 text-sm md:text-base">{course.description}</p>
              
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Clock className="h-5 w-5 md:h-6 md:w-6 text-blue-600 mx-auto mb-2" />
                  <div className="text-xs md:text-sm text-gray-600">Duration</div>
                  <div className="font-semibold text-sm md:text-base">{course.duration || "Self-paced"}</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <BookOpen className="h-5 w-5 md:h-6 md:w-6 text-green-600 mx-auto mb-2" />
                  <div className="text-xs md:text-sm text-gray-600">Lessons</div>
                  <div className="font-semibold text-sm md:text-base">{lessons.length}</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <Users className="h-5 w-5 md:h-6 md:w-6 text-purple-600 mx-auto mb-2" />
                  <div className="text-xs md:text-sm text-gray-600">Students</div>
                  <div className="font-semibold text-sm md:text-base">{course.enrolledCount || 0}</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <Award className="h-5 w-5 md:h-6 md:w-6 text-orange-600 mx-auto mb-2" />
                  <div className="text-xs md:text-sm text-gray-600">Level</div>
                  <div className="font-semibold text-sm md:text-base capitalize">{course.level}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Lesson List */}
          <div className={`lg:col-span-1 space-y-4 md:space-y-6 ${
            showMobileLessons 
              ? 'fixed inset-0 z-50 bg-white overflow-y-auto p-4' 
              : 'hidden lg:block'
          }`}>
            {/* Mobile Lessons Header */}
            {showMobileLessons && (
              <div className="flex items-center justify-between mb-4 lg:hidden">
                <h2 className="text-lg font-bold text-gray-900">Course Lessons</h2>
                <button
                  onClick={() => setShowMobileLessons(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
            )}

            <div className="bg-white rounded-xl shadow border overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Course Lessons</h3>
                <p className="text-sm text-gray-500">
                  {enrollment?.completedLessons?.length || 0} of {lessons.length} completed
                </p>
              </div>
              
              <div className="max-h-[400px] md:max-h-[600px] overflow-y-auto">
                {lessons.map((lesson, index) => {
                  const isCompleted = enrollment?.completedLessons?.includes(lesson.id);
                  const isActive = activeLesson?.id === lesson.id;
                  const lessonResources = [
                    ...(lesson.slides || []),
                    ...(lesson.documents || []),
                    ...(lesson.templates || []),
                    ...(lesson.resources || [])
                  ].filter(r => r);
                  
                  return (
                    <div
                      key={`lesson-${lesson.id}`}
                      className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                        isActive ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                      onClick={() => {
                        setActiveLesson(lesson);
                        if (window.innerWidth < 1024) {
                          setShowMobileLessons(false);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                          isCompleted ? "bg-green-100" : "bg-gray-100"
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <span className="text-sm font-medium text-gray-600">{index + 1}</span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className={`font-medium text-sm md:text-base ${
                              isCompleted ? "text-green-700" : "text-gray-900"
                            }`}>
                              {lesson.title}
                            </h4>
                            <span className="text-xs text-gray-500 whitespace-nowrap">{lesson.duration}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {lesson.description}
                          </p>
                          
                          {lessonResources.length > 0 && (
                            <div className="mt-2 flex items-center gap-1">
                              <Folder className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                {lessonResources.length} resource{lessonResources.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow border p-4 md:p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Learning Progress</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Course Progress</span>
                    <span>{enrollment?.progress || 0}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-600 rounded-full transition-all duration-300"
                      style={{ width: `${enrollment?.progress || 0}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-semibold text-gray-900">{lessons.length}</div>
                    <div className="text-xs text-gray-500">Total Lessons</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-semibold text-gray-900">{allResources.length}</div>
                    <div className="text-xs text-gray-500">Resources</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// src/components/CoursePage.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/config";
import EdpuzzleVideoPlayer from './videoplayer';
import { 
  doc, 
  getDoc, 
  collection, 
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  onSnapshot,
  where
} from "firebase/firestore";
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
  Loader2,
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
// Helper function to get file type from filename - UPDATED with null checks
const getFileType = (filename) => {
  if (!filename || typeof filename !== 'string') {
    return 'default';
  }
  
  const parts = filename.split('.');
  if (parts.length < 2) {
    return 'default';
  }
  
  const ext = parts.pop().toLowerCase();
  return FILE_ICONS[ext] ? ext : 'default';
};

// Helper function to calculate safe progress (never exceeds 100%)
const calculateSafeProgress = (completedCount, totalLessons) => {
  if (totalLessons === 0) return 0;
  
  const rawPercentage = (completedCount / totalLessons) * 100;
  // Never return more than 100%
  return Math.min(Math.round(rawPercentage * 100) / 100, 100);
};

// Safe Progress Badge Component
const SafeProgressBadge = ({ enrollment, totalLessons }) => {
  const completedCount = enrollment?.completedLessons?.length || 0;
  const safePercentage = calculateSafeProgress(completedCount, totalLessons);
  
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-800 rounded-full text-sm">
      <CheckCircle className="h-4 w-4" />
      <span>{safePercentage}% Complete</span>
      <span className="text-xs opacity-75">
        ({completedCount}/{totalLessons})
      </span>
    </div>
  );
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
  const [showMobileLessons, setShowMobileLessons] = useState(false);
  const [expandedResources, setExpandedResources] = useState({
    lessonResources: false,
    allResources: false
  });
  
  // Progress tracking states
  const [videoProgress, setVideoProgress] = useState({});
  const [isAutoCompleting, setIsAutoCompleting] = useState(false);
  const completingLessonRef = useRef(null);

  // Real-time listener for course updates (including enrolledCount)
  useEffect(() => {
    if (!courseId) return;
    
    const courseRef = doc(db, "courses", courseId);
    
    const unsubscribe = onSnapshot(courseRef, (docSnap) => {
      if (docSnap.exists()) {
        const courseData = { id: docSnap.id, ...docSnap.data() };
        setCourse(courseData);
        console.log(`📊 Course updated: ${courseData.enrolledCount || 0} students enrolled`);
      }
    }, (error) => {
      console.error("Error listening to course updates:", error);
    });
    
    return () => unsubscribe();
  }, [courseId]);

  // Fetch questions for active lesson
  useEffect(() => {
    const fetchQuestions = async () => {
      if (activeLesson && courseId) {
        try {
          if (!user) {
            console.log('User not authenticated, skipping questions fetch');
            return;
          }
          
          const questionsRef = collection(db, "courses", courseId, "lessons", activeLesson.id, "questions");
          const questionsSnap = await getDocs(questionsRef);
          const questionsData = questionsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setQuestions(questionsData.sort((a, b) => a.timestamp - b.timestamp));
        } catch (error) {
          console.error("Error fetching questions:", error);
          setQuestions([]);
        }
      }
    };
    
    fetchQuestions();
  }, [activeLesson, courseId, user]);

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
      
      // 1. Fetch course document
      const courseDoc = await getDoc(doc(db, "courses", courseId));
      if (!courseDoc.exists()) {
        navigate("/courses");
        return;
      }
      
      const courseData = { id: courseDoc.id, ...courseDoc.data() };
      setCourse(courseData);

      // 2. Fetch lessons
      const lessonsRef = collection(db, "courses", courseId, "lessons");
      const lessonsSnap = await getDocs(lessonsRef);
      const lessonsData = lessonsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      const sortedLessons = lessonsData.sort((a, b) => a.order - b.order);
      setLessons(sortedLessons);

      // 3. Fetch user's enrollment
      const enrollmentsRef = collection(db, "enrollments");
      const enrollmentQuery = query(
        enrollmentsRef,
        where("userId", "==", userId),
        where("courseId", "==", courseId)
      );
      const enrollmentSnap = await getDocs(enrollmentQuery);
      
      if (!enrollmentSnap.empty) {
        const enrollmentDoc = enrollmentSnap.docs[0];
        let enrollmentData = enrollmentDoc.data();
        
        // ✅ CRITICAL: Recalculate progress if total lessons changed
        const currentTotalLessons = sortedLessons.length;
        const completedCount = enrollmentData.completedLessons?.length || 0;
        
        // If user has 100% completion but total lessons changed, recalculate
        let progressPercentage = enrollmentData.progress || 0;
        
        // Always recalculate based on current total lessons (safety check)
        progressPercentage = calculateSafeProgress(completedCount, currentTotalLessons);
        
        // If stored progress is different from calculated, update it
        if (enrollmentData.progress !== progressPercentage || 
            enrollmentData.totalLessons !== currentTotalLessons) {
          
          // Update the enrollment record with recalculated progress
          await updateDoc(enrollmentDoc.ref, {
            progress: progressPercentage,
            totalLessons: currentTotalLessons,
            lastUpdated: serverTimestamp()
          });
          
          console.log(`🔄 Progress recalculated: ${enrollmentData.progress || 0}% → ${progressPercentage}% (${completedCount}/${currentTotalLessons} lessons)`);
        }
        
        setEnrollment({
          id: enrollmentDoc.id,
          ...enrollmentData,
          progress: progressPercentage,
          totalLessons: currentTotalLessons
        });
      }

      // 4. Set active lesson if none is selected
      if (sortedLessons.length > 0 && !activeLesson) {
        const userEnrollment = enrollmentSnap.empty ? null : enrollmentSnap.docs[0].data();
        const completedLessons = userEnrollment?.completedLessons || [];
        
        // Find first incomplete lesson
        const firstIncomplete = sortedLessons.find(lesson => !completedLessons.includes(lesson.id));
        setActiveLesson(firstIncomplete || sortedLessons[0]);
      }

    } catch (error) {
      console.error("Error fetching course data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Only marks lesson complete, doesn't advance to next
  const autoCompleteLesson = useCallback(async () => {
    if (!activeLesson || !enrollment) return;

    // 🔒 HARD GUARD (prevents duplicates)
    if (completingLessonRef.current === activeLesson.id) {
      console.log('⏭️ Skipping duplicate completion for lesson:', activeLesson.id);
      return;
    }

    if (enrollment.completedLessons?.includes(activeLesson.id)) {
      console.log('📚 Lesson already completed:', activeLesson.id);
      return;
    }

    try {
      completingLessonRef.current = activeLesson.id;
      setIsAutoCompleting(true);
      console.log('🎯 Auto-marking lesson complete:', activeLesson.title);

      const completedLessons = enrollment.completedLessons || [];
      const newCompletedLessons = [...completedLessons, activeLesson.id];
      const currentTotalLessons = lessons.length;
      
      // ✅ Use safe progress calculation (never exceeds 100%)
      const progressPercentage = calculateSafeProgress(newCompletedLessons.length, currentTotalLessons);

      await updateDoc(doc(db, "enrollments", enrollment.id), {
        completedLessons: newCompletedLessons,
        progress: progressPercentage,
        totalLessons: currentTotalLessons, // Always update total lessons
        lastAccessed: serverTimestamp()
      });

      console.log('✅ Updated Firestore: Lesson marked complete');

      setEnrollment(prev => ({
        ...prev,
        completedLessons: newCompletedLessons,
        progress: progressPercentage,
        totalLessons: currentTotalLessons
      }));

      // 🔄 NO auto-advance to next lesson - user stays on current video
      console.log('🛑 Auto-advance disabled - user stays on current lesson');
      
    } catch (e) {
      console.error('❌ Auto-completion error:', e);
    } finally {
      setIsAutoCompleting(false);
      // Reset ref after completion
      setTimeout(() => {
        completingLessonRef.current = null;
        console.log('🔄 Reset completion ref');
      }, 1500);
    }
  }, [activeLesson, enrollment, lessons]);

  // Manual completion with optional next lesson navigation
  const markCompleteAndGoNext = async () => {
    if (!activeLesson || !enrollment) return;

    if (enrollment.completedLessons?.includes(activeLesson.id)) {
      console.log('📚 Lesson already completed');
      return;
    }

    try {
      setIsAutoCompleting(true);

      const completedLessons = enrollment.completedLessons || [];
      const newCompletedLessons = [...completedLessons, activeLesson.id];
      const currentTotalLessons = lessons.length;
      
      // ✅ Use safe progress calculation (never exceeds 100%)
      const progressPercentage = calculateSafeProgress(newCompletedLessons.length, currentTotalLessons);

      await updateDoc(doc(db, "enrollments", enrollment.id), {
        completedLessons: newCompletedLessons,
        progress: progressPercentage,
        totalLessons: currentTotalLessons, // Always update total lessons
        lastAccessed: serverTimestamp()
      });

      setEnrollment(prev => ({
        ...prev,
        completedLessons: newCompletedLessons,
        progress: progressPercentage,
        totalLessons: currentTotalLessons
      }));

      // Optional: Navigate to next lesson (uncomment if needed)
      /*
      const currentIndex = lessons.findIndex(l => l.id === activeLesson.id);
      const nextLesson = lessons[currentIndex + 1];
      if (nextLesson) {
        console.log('⏭️ Manual navigation to next lesson');
        setTimeout(() => setActiveLesson(nextLesson), 800);
      }
      */

    } catch (e) {
      console.error('❌ Completion error:', e);
    } finally {
      setIsAutoCompleting(false);
    }
  };

  const handleQuestionAnswered = async (question) => {
    try {
      await updateDoc(
        doc(db, "courses", courseId, "lessons", activeLesson.id, "questions", question.id),
        {
          userAnswer: question.userAnswer,
          answered: true,
          answeredAt: serverTimestamp()
        }
      );
      
      setQuestions(prev => prev.map(q => q.id === question.id ? question : q));
    } catch (error) {
      console.error("Error saving question answer:", error);
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
      try {
        const accountId = import.meta.env.VITE_R2_ACCOUNT_ID;
        if (accountId) {
          const publicUrl = `https://pub-${accountId}.r2.dev/${resource.key || resource.filePath}`;
          window.open(publicUrl, '_blank');
        }
      } catch (fallbackError) {
        alert(`Download failed: ${error.message}`);
      }
      setDownloading(null);
    }
  };

  const handlePreviewResource = async (resource) => {
    try {
      setDownloading(resource.key || resource.id);
      
      const previewableTypes = ['pdf', 'image', 'video', 'text'];
      const fileType = getFileType(resource.name || resource.originalName);
      
      if (previewableTypes.includes(fileType)) {
        let previewUrl;
        
        if (resource.url && resource.url.includes('firebasestorage.googleapis.com')) {
          previewUrl = resource.url;
        } else if (resource.key || resource.filePath) {
          const accountId = import.meta.env.VITE_R2_ACCOUNT_ID;
          if (accountId) {
            previewUrl = `https://pub-${accountId}.r2.dev/${resource.key || resource.filePath}`;
          }
        }
        
        if (previewUrl) {
          window.open(previewUrl, '_blank');
        } else {
          handleDownloadResource(resource);
        }
      } else {
        handleDownloadResource(resource);
      }
    } catch (error) {
      console.error("Preview error:", error);
      handleDownloadResource(resource);
    } finally {
      setTimeout(() => setDownloading(null), 1000);
    }
  };

  // Get all resources from all lessons
  const getAllResources = () => {
    const allResources = [];
    const resourceMap = new Map();
    
    lessons.forEach(lesson => {
      // Combine all resource arrays
      const combinedResources = [
        ...(lesson.slides || []),
        ...(lesson.documents || []),
        ...(lesson.templates || []),
        ...(lesson.resources || [])
      ];
      
      combinedResources.forEach(resource => {
        if (!resource) return;
        
        const key = resource.key || resource.name || resource.originalName;
        if (!key) return;
        
        // If we haven't seen this resource before, add it
        if (!resourceMap.has(key)) {
          const enhancedResource = {
            ...resource,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonOrder: lesson.order
          };
          
          resourceMap.set(key, enhancedResource);
          allResources.push(enhancedResource);
        }
      });
    });
    
    return allResources;
  };

  const currentLessonIndex = activeLesson 
    ? lessons.findIndex(lesson => lesson.id === activeLesson.id)
    : -1;
  const hasNextLesson = currentLessonIndex < lessons.length - 1;
  const hasPreviousLesson = currentLessonIndex > 0;

  // Handle video progress updates - ONLY updates progress, NO auto-completion
  const handleVideoProgress = useCallback((lessonId, progress) => {
    if (!user || !courseId) return;
    
    // Update local state immediately
    setVideoProgress(prev => ({
      ...prev,
      [lessonId]: Math.min(100, Math.max(0, progress))
    }));

  }, [user, courseId]);

  const allResources = getAllResources();

  // Helper function to get safe enrollment progress
  const getSafeEnrollmentProgress = () => {
    if (!enrollment) return 0;
    const completedCount = enrollment.completedLessons?.length || 0;
    return calculateSafeProgress(completedCount, lessons.length);
  };

  // Update the lesson list to show progress bars
  const renderLessonList = () => {
    return lessons.map((lesson, index) => {
      const isCompleted = enrollment?.completedLessons?.includes(lesson.id);
      const isActive = activeLesson?.id === lesson.id;
      const lessonResources = [
        ...(lesson.slides || []),
        ...(lesson.documents || []),
        ...(lesson.templates || []),
        ...(lesson.resources || [])
      ].filter(r => r);
      
      const lessonProgress = videoProgress[lesson.id] || 0;
      const roundedProgress = Math.round(lessonProgress);
      
      return (
        <div
          key={`lesson-${lesson.id}`}
          className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
            isActive ? "bg-blue-50" : "hover:bg-gray-50"
          }`}
          onClick={() => {
            // Don't change lesson if currently auto-completing
            if (isAutoCompleting) {
              console.log('⏸️ Skipping lesson change during auto-completion');
              return;
            }
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
              <div className="flex items-center justify-between mb-1">
                <h4 className={`font-medium text-sm md:text-base ${
                  isCompleted ? "text-green-700" : "text-gray-900"
                }`}>
                  {lesson.title}
                </h4>
                <span className="text-xs text-gray-500 whitespace-nowrap">{lesson.duration}</span>
              </div>
              
              {lessonProgress > 0 && !isCompleted && (
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                    <span>Progress</span>
                    <span>{roundedProgress}%</span>
                  </div>
                  <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        roundedProgress >= 95 ? "bg-green-500" : 
                        roundedProgress >= 50 ? "bg-blue-500" : 
                        roundedProgress > 0 ? "bg-yellow-500" : "bg-gray-300"
                      } rounded-full transition-all duration-300`}
                      style={{ width: `${lessonProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
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
    });
  };

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
                    {getSafeEnrollmentProgress()}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {enrollment.completedLessons?.length || 0}/{lessons.length}
                  </div>
                </div>
              )}
              
              <button
                onClick={() => setShowMobileLessons(!showMobileLessons)}
                className="p-2 hover:bg-gray-100 rounded-lg"
                disabled={isAutoCompleting}
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
                <SafeProgressBadge 
                  enrollment={enrollment} 
                  totalLessons={lessons.length} 
                />
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left Column - Course Content */}
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
                    if (hasNextLesson && !isAutoCompleting) {
                      console.log('⏭️ Manual next lesson navigation');
                      setActiveLesson(lessons[currentLessonIndex + 1]);
                    }
                  }}
                  onPreviousLesson={() => {
                    if (hasPreviousLesson && !isAutoCompleting) {
                      console.log('⏮️ Manual previous lesson navigation');
                      setActiveLesson(lessons[currentLessonIndex - 1]);
                    }
                  }}
                  questions={questions}
                  onQuestionAnswered={handleQuestionAnswered}
                  lessonId={activeLesson.id}
                  onProgressUpdate={handleVideoProgress}
                  markLessonComplete={autoCompleteLesson}
                  isLessonCompleted={enrollment?.completedLessons?.includes(activeLesson.id)}
                  isAutoCompleting={isAutoCompleting}
                  autoComplete={true}
                  onVideoEnd={() => {
                    console.log(`🎬 Video ended for lesson: ${activeLesson.title}`);
                    // Video end auto-completion is handled inside the video player
                  }}
                />
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-3">
                  <div className="flex-1">
                    <h2 className="text-lg md:text-xl font-bold text-gray-900">{activeLesson.title}</h2>
                    <p className="text-gray-600 mt-1 text-sm md:text-base">{activeLesson.description}</p>
                  </div>
                  
                  <button
                    onClick={() => markCompleteAndGoNext()}
                    disabled={enrollment?.completedLessons?.includes(activeLesson.id) || isAutoCompleting}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm md:text-base w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAutoCompleting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Completing...
                      </>
                    ) : enrollment?.completedLessons?.includes(activeLesson.id) ? (
                      <>
                        <CheckCircle size={18} />
                        Completed
                      </>
                    ) : (
                      <>
                        <CheckCircle size={18} />
                        Mark Complete
                      </>
                    )}
                  </button>
                </div>
                
                {/* Completion notification */}
                {isAutoCompleting && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <p className="text-sm text-green-700">
                        Lesson marked as complete! You can select the next lesson to continue.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Next lesson suggestion */}
                {enrollment?.completedLessons?.includes(activeLesson.id) && hasNextLesson && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ChevronRight className="h-4 w-4 text-blue-600" />
                        <p className="text-sm text-blue-700">
                          Ready to continue? Next lesson available
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveLesson(lessons[currentLessonIndex + 1])}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Go to Next
                      </button>
                    </div>
                  </div>
                )}
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

            {/* Mobile Resources Sections */}
            <div className="lg:hidden space-y-4">
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

            {/* Desktop Resources Sections */}
            <div className="hidden lg:block space-y-6">
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
            
            {/* Quiz Section */}
            {course.hasQuiz && enrollment?.progress >= 70 && (
              <div className="bg-white rounded-xl shadow border p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Course Quiz</h3>
                    <p className="text-sm text-gray-500">
                      Available after completing at least 70% of the course
                    </p>
                  </div>
                  {enrollment?.quizCompleted ? (
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          Score: {enrollment.quizScore}%
                        </div>
                        <div className="text-sm text-gray-500">
                          {enrollment.quizScore >= 70 ? "Passed" : "Failed"}
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/course/${courseId}/quiz`)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Retake Quiz
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => navigate(`/course/${courseId}/quiz`)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <FileText size={20} />
                      Take Quiz
                    </button>
                  )}
                </div>
              </div>
            )}

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
               
                {/* Student count section */}
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <Users className="h-5 w-5 md:h-6 md:w-6 text-purple-600 mx-auto mb-2" />
                  <div className="text-xs md:text-sm text-gray-600">Students</div>
                  <div className="font-semibold text-sm md:text-base">
                    {course?.enrolledCount || 0}
                  </div>
                  {course?.enrolledCount > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {course.enrolledCount === 1 ? '1 student enrolled' : `${course.enrolledCount} students enrolled`}
                    </div>
                  )}
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
                  disabled={isAutoCompleting}
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
                {renderLessonList()}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow border p-4 md:p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Learning Progress</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Course Progress</span>
                    <span>{getSafeEnrollmentProgress()}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-600 rounded-full transition-all duration-300"
                      style={{ width: `${getSafeEnrollmentProgress()}%` }}
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
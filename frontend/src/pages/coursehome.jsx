// src/components/CourseHome.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/config";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  where,
  onSnapshot
} from "firebase/firestore";
import {
  BookOpen,
  Clock,
  Users,
  CheckCircle,
  Circle,
  PlayCircle,
  FileText,
  Video,
  Award,
  ChevronRight,
  Search,
  Play,
  Loader2,
  Download,
  Eye,
  Archive,
  AlertCircle,
  Filter,
  X,
  Calendar,
  Bell,
  Menu,
  Grid,
  List,
  ChevronLeft,
  ChevronDown,
  ExternalLink,
  Star
} from "lucide-react";

// Public R2 domain for direct file access
const R2_PUBLIC_DOMAIN = import.meta.env.VITE_R2_PUBLIC_DOMAIN;

export default function CourseHome() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState({ active: [], archived: [] });
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState({});
  const [showArchived, setShowArchived] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [downloading, setDownloading] = useState(null);
  const [expandedResources, setExpandedResources] = useState({
    allResources: false
  });
  const [viewMode, setViewMode] = useState("grid"); // grid or list for resources
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [filteredLessons, setFilteredLessons] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        await fetchCourseData(currentUser.uid);
      } else {
        navigate("/login");
      }
    });
    return () => unsubscribe();
  }, [courseId, navigate]);

  // Real-time course updates
  useEffect(() => {
    if (!courseId) return;
    
    const courseRef = doc(db, "courses", courseId);
    const unsubscribe = onSnapshot(courseRef, (docSnap) => {
      if (docSnap.exists()) {
        setCourse({ id: docSnap.id, ...docSnap.data() });
      }
    });
    
    return () => unsubscribe();
  }, [courseId]);

  // Filter lessons based on search
  useEffect(() => {
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      const filtered = lessons.active.filter(lesson =>
        lesson.title.toLowerCase().includes(searchLower) ||
        lesson.description?.toLowerCase().includes(searchLower)
      );
      setFilteredLessons(filtered);
    } else {
      setFilteredLessons(lessons.active);
    }
  }, [searchTerm, lessons.active]);

  // Create enrollment announcement
  useEffect(() => {
    if (enrollment && enrollment.enrolledAt) {
      const enrolledDate = enrollment.enrolledAt?.toDate?.() || new Date(enrollment.enrolledAt);
      setAnnouncements([
        {
          id: 'welcome',
          title: 'Welcome to the course! 🎉',
          message: `You enrolled on ${enrolledDate.toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          })}. We're excited to have you here. Get started with your first lesson!`,
          date: enrolledDate,
          type: 'enrollment'
        },
        {
          id: 'getting-started',
          title: 'Getting Started Tips',
          message: 'Complete lessons in order for the best learning experience. Don\'t forget to check out the resources section for additional materials.',
          date: new Date(enrolledDate.getTime() + 86400000), // Next day
          type: 'tip'
        }
      ]);
    }
  }, [enrollment]);

  const fetchCourseData = async (userId) => {
    try {
      setLoading(true);
      
      // Fetch course
      const courseDoc = await getDoc(doc(db, "courses", courseId));
      if (!courseDoc.exists()) {
        navigate("/courses");
        return;
      }
      const courseData = { id: courseDoc.id, ...courseDoc.data() };
      setCourse(courseData);

      // Fetch modules
      const modulesRef = collection(db, "courses", courseId, "modules");
      const modulesQuery = query(modulesRef, orderBy("order"));
      const modulesSnapshot = await getDocs(modulesQuery);
      const modulesData = modulesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setModules(modulesData);

      // Fetch ACTIVE lessons
      const lessonsRef = collection(db, "courses", courseId, "lessons");
      const lessonsQuery = query(lessonsRef, orderBy("order"));
      const lessonsSnapshot = await getDocs(lessonsQuery);
      const activeLessons = lessonsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'active'
      }));

      // Fetch enrollment
      let enrollmentData = null;
      let archivedLessons = [];
      
      if (userId) {
        const enrollmentsRef = collection(db, "enrollments");
        const enrollmentQuery = query(
          enrollmentsRef,
          where("userId", "==", userId),
          where("courseId", "==", courseId)
        );
        const enrollmentSnapshot = await getDocs(enrollmentQuery);
        
        if (!enrollmentSnapshot.empty) {
          enrollmentData = {
            id: enrollmentSnapshot.docs[0].id,
            ...enrollmentSnapshot.docs[0].data()
          };
          setEnrollment(enrollmentData);
          
          // Get enrollment date
          const enrolledAt = enrollmentData.enrolledAt?.toDate?.() || new Date(enrollmentData.enrolledAt);
          
          // Fetch ARCHIVED lessons
          const archivedRef = collection(db, "courses", courseId, "archivedLessons");
          const archivedSnapshot = await getDocs(archivedRef);
          
          archivedLessons = archivedSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(lesson => {
              const archivedAt = lesson.archivedAt?.toDate?.() || new Date(lesson.archivedAt);
              return archivedAt > enrolledAt;
            })
            .map(lesson => ({
              ...lesson,
              type: 'archived',
              completed: enrollmentData.completedLessons?.includes(lesson.id) || false
            }));
        }
      }

      setLessons({
        active: activeLessons,
        archived: archivedLessons
      });

      // Initialize expanded state for modules
      const expanded = {};
      modulesData.forEach(m => { expanded[m.id] = true; });
      setExpandedModules(expanded);

    } catch (error) {
      console.error("Error fetching course data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const expandAll = () => {
    const expanded = {};
    modules.forEach(m => { expanded[m.id] = true; });
    setExpandedModules(expanded);
  };

  const collapseAll = () => {
    setExpandedModules({});
  };

  const getLessonsInModule = (moduleId) => {
    return lessons.active.filter(l => l.moduleId === moduleId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  const getCompletedLessonsInModule = (moduleId) => {
    const moduleLessons = getLessonsInModule(moduleId);
    return moduleLessons.filter(l => 
      enrollment?.completedLessons?.includes(l.id)
    ).length;
  };

  const calculateModuleProgress = (moduleId) => {
    const moduleLessons = getLessonsInModule(moduleId);
    if (moduleLessons.length === 0) return 0;
    const completed = getCompletedLessonsInModule(moduleId);
    return Math.round((completed / moduleLessons.length) * 100);
  };

  const getUngroupedLessons = () => {
    return lessons.active.filter(l => !l.moduleId || l.moduleId === 'uncategorized')
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  const getTotalProgress = () => {
    if (!enrollment || lessons.active.length === 0) return 0;
    
    const completedActive = lessons.active.filter(lesson => 
      enrollment.completedLessons?.includes(lesson.id)
    ).length;
    
    const totalActive = lessons.active.length;
    
    return totalActive > 0 
      ? Math.round((completedActive / totalActive) * 100)
      : 0;
  };

  const getCompletionStats = () => {
    if (!enrollment) return { 
      active: { completed: 0, total: 0 }, 
      archived: 0 
    };
    
    const completedActive = lessons.active.filter(lesson => 
      enrollment.completedLessons?.includes(lesson.id)
    ).length;
    
    const completedArchived = lessons.archived.filter(lesson => 
      enrollment.completedLessons?.includes(lesson.id)
    ).length;
    
    return {
      active: {
        completed: completedActive,
        total: lessons.active.length
      },
      archived: completedArchived
    };
  };

  const getNextLesson = () => {
    if (!enrollment || lessons.active.length === 0) return null;
    
    const completed = new Set(enrollment.completedLessons || []);
    
    for (const lesson of lessons.active.sort((a, b) => a.order - b.order)) {
      if (!completed.has(lesson.id)) {
        return lesson;
      }
    }
    
    return lessons.active[lessons.active.length - 1];
  };

  const getFileType = (filename) => {
    if (!filename) return 'unknown';
    const ext = filename.split('.').pop()?.toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
    const pdfExts = ['pdf'];
    const textExts = ['txt', 'md', 'csv'];
    const docExts = ['doc', 'docx'];
    const spreadsheetExts = ['xls', 'xlsx', 'csv'];
    const presentationExts = ['ppt', 'pptx'];
    
    if (imageExts.includes(ext)) return 'image';
    if (videoExts.includes(ext)) return 'video';
    if (pdfExts.includes(ext)) return 'pdf';
    if (textExts.includes(ext)) return 'text';
    if (docExts.includes(ext)) return 'document';
    if (spreadsheetExts.includes(ext)) return 'spreadsheet';
    if (presentationExts.includes(ext)) return 'presentation';
    return 'other';
  };

  // Enhanced preview handler
  const handlePreviewResource = async (resource) => {
    try {
      setDownloading(resource.key || resource.id);
      
      const previewableTypes = ['pdf', 'image', 'jpg', 'jpeg', 'png', 'gif', 'mp4', 'webm', 'txt'];
      const fileType = resource.type || getFileType(resource.name || resource.originalName || '');
      
      let previewUrl = null;
      
      if (resource.key) {
        previewUrl = `${R2_PUBLIC_DOMAIN}/${resource.key}`;
      } else if (resource.url) {
        previewUrl = resource.url;
      } else if (resource.filePath) {
        previewUrl = `${R2_PUBLIC_DOMAIN}/${resource.filePath}`;
      }
      
      if (previewUrl && previewableTypes.some(type => fileType.includes(type))) {
        // Open in new tab for preview
        window.open(previewUrl, '_blank', 'noopener,noreferrer');
      } else {
        // For non-previewable types, download instead
        await handleDownloadResource(resource);
      }
      
    } catch (error) {
      console.error("Preview error:", error);
      await handleDownloadResource(resource);
    } finally {
      setTimeout(() => setDownloading(null), 1000);
    }
  };

    // Download handler
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

  const getAllResources = () => {
    const allResources = [];
    const resourceMap = new Map();
    
    lessons.active.forEach(lesson => {
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
        
        if (!resourceMap.has(key)) {
          const enhancedResource = {
            ...resource,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonOrder: lesson.order,
            fileType: resource.type || getFileType(resource.name || resource.originalName || '')
          };
          
          resourceMap.set(key, enhancedResource);
          allResources.push(enhancedResource);
        }
      });
    });
    
    return allResources;
  };

  const nextLesson = getNextLesson();
  const allResources = getAllResources();
  const completionStats = getCompletionStats();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading course content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b sticky top-0 z-20">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/courses")}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="max-w-[180px]">
                <h1 className="text-base font-bold truncate">{course?.title}</h1>
                <p className="text-xs text-gray-500">{course?.category}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-sm font-medium">{getTotalProgress()}%</div>
              </div>
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
          
          {/* Mobile Progress Bar */}
          <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-600 rounded-full transition-all"
              style={{ width: `${getTotalProgress()}%` }}
            />
          </div>
        </div>
      </div>

      {/* Desktop Header - With Review Button */}
      <div className="hidden lg:block bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/courses")}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{course?.title}</h1>
                <p className="text-sm text-gray-500">{course?.category}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 rounded-lg">
                <div className="text-right">
                  <div className="text-sm font-medium text-blue-700">
                    {getTotalProgress()}% Complete
                  </div>
                  <div className="text-xs text-blue-600">
                    {completionStats.active.completed}/{completionStats.active.total} current lessons
                    {completionStats.archived > 0 && (
                      <span className="ml-1 text-gray-500">
                        • +{completionStats.archived} legacy
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-24 h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${getTotalProgress()}%` }}
                  />
                </div>
              </div>

              {/* Review Button - Desktop Header */}
              <button
                onClick={() => navigate(`/course-details/${courseId}`)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                title="View course details and reviews"
              >
                <Star size={18} />
                <span className="hidden xl:inline">Reviews</span>
              </button>

              {nextLesson && (
                <button
                  onClick={() => navigate(`/course/${courseId}/lesson/${nextLesson.id}`)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <PlayCircle size={18} />
                  {enrollment?.completedLessons?.length === 0 ? 'Start Course' : 'Continue'}
                </button>
              )}
            </div>
          </div>

          {/* Desktop Tabs */}
          <div className="flex gap-6 mt-4 border-b">
            {['overview', 'curriculum', 'resources', 'announcements'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="lg:hidden bg-white border-b overflow-x-auto no-scrollbar">
        <div className="flex px-4 gap-4">
          {['overview', 'curriculum', 'resources', 'announcements'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setShowMobileMenu(false);
              }}
              className={`px-3 py-3 text-sm font-medium border-b-2 transition-colors capitalize whitespace-nowrap ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Menu Overlay - With Review Button */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowMobileMenu(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-white shadow-xl p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Menu</h3>
              <button onClick={() => setShowMobileMenu(false)} className="p-2">
                <X size={18} />
              </button>
            </div>
            
            {nextLesson && (
              <button
                onClick={() => {
                  navigate(`/course/${courseId}/lesson/${nextLesson.id}`);
                  setShowMobileMenu(false);
                }}
                className="w-full mb-4 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Play size={16} />
                {enrollment?.completedLessons?.length === 0 ? 'Start Course' : 'Continue'}
              </button>
            )}
            
            {/* Review Button - Mobile Menu */}
            <button
              onClick={() => {
                navigate(`/course-details/${courseId}`);
                setShowMobileMenu(false);
              }}
              className="w-full mb-4 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
            >
              <Star size={16} />
              View Reviews
            </button>
            
            <div className="space-y-2">
              <button
                onClick={() => {
                  setActiveTab('overview');
                  setShowMobileMenu(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
              >
                Overview
              </button>
              <button
                onClick={() => {
                  setActiveTab('curriculum');
                  setShowMobileMenu(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
              >
                Curriculum
              </button>
              <button
                onClick={() => {
                  setActiveTab('resources');
                  setShowMobileMenu(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
              >
                Resources ({allResources.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab('announcements');
                  setShowMobileMenu(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
              >
                Announcements
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Review Button for Mobile (when not on overview) */}
      {isMobile && activeTab !== 'overview' && (
        <button
          onClick={() => navigate(`/course-details/${courseId}`)}
          className="fixed bottom-20 right-4 z-30 p-4 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-all hover:scale-110"
          title="View reviews"
        >
          <Star size={24} />
        </button>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-4 lg:space-y-6">
              {/* Course Description */}
              <div className="bg-white rounded-xl shadow-sm border p-4 lg:p-6">
                <h2 className="text-lg lg:text-xl font-bold mb-4">About This Course</h2>
                <p className="text-sm lg:text-base text-gray-700 leading-relaxed">{course?.description}</p>
                
                {/* Course Stats Grid - Mobile optimized */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4 mt-6">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <BookOpen className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600 mx-auto mb-1 lg:mb-2" />
                    <div className="text-xs lg:text-sm text-gray-600">Lessons</div>
                    <div className="font-semibold text-sm lg:text-lg">{lessons.active.length}</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <Clock className="h-4 w-4 lg:h-5 lg:w-5 text-green-600 mx-auto mb-1 lg:mb-2" />
                    <div className="text-xs lg:text-sm text-gray-600">Duration</div>
                    <div className="font-semibold text-sm lg:text-lg">{course?.duration || 'Self'}</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <Users className="h-4 w-4 lg:h-5 lg:w-5 text-purple-600 mx-auto mb-1 lg:mb-2" />
                    <div className="text-xs lg:text-sm text-gray-600">Students</div>
                    <div className="font-semibold text-sm lg:text-lg">{course?.enrolledCount || 0}</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <Award className="h-4 w-4 lg:h-5 lg:w-5 text-orange-600 mx-auto mb-1 lg:mb-2" />
                    <div className="text-xs lg:text-sm text-gray-600">Level</div>
                    <div className="font-semibold text-sm lg:text-lg capitalize truncate">{course?.level}</div>
                  </div>
                </div>
                {lessons.archived.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    * Plus {lessons.archived.length} archived {lessons.archived.length === 1 ? 'lesson' : 'lessons'}
                  </p>
                )}
              </div>

              {/* What You'll Learn */}
              <div className="bg-white rounded-xl shadow-sm border p-4 lg:p-6">
                <h2 className="text-lg lg:text-xl font-bold mb-4">What You'll Learn</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 lg:gap-3">
                  {[
                    'Understand core concepts',
                    'Build real-world projects',
                    'Master best practices',
                    'Get hands-on experience',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm lg:text-base">
                      <CheckCircle className="h-4 w-4 lg:h-5 lg:w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Course Content Preview */}
              <div className="bg-white rounded-xl shadow-sm border p-4 lg:p-6">
                <h2 className="text-lg lg:text-xl font-bold mb-4">Course Content</h2>
                <div className="space-y-4">
                  {modules.slice(0, 3).map(module => (
                    <div key={module.id} className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3">
                        <h3 className="font-semibold text-sm lg:text-base">{module.title}</h3>
                      </div>
                      <div className="divide-y">
                        {getLessonsInModule(module.id).slice(0, 2).map(lesson => (
                          <div key={lesson.id} className="px-4 py-2 flex items-center gap-2 text-sm">
                            {lesson.videoUrl ? (
                              <Video className="h-3 w-3 lg:h-4 lg:w-4 text-red-500" />
                            ) : (
                              <FileText className="h-3 w-3 lg:h-4 lg:w-4 text-green-600" />
                            )}
                            <span className="truncate">{lesson.title}</span>
                          </div>
                        ))}
                        {getLessonsInModule(module.id).length > 2 && (
                          <div className="px-4 py-2 text-xs lg:text-sm text-blue-600">
                            + {getLessonsInModule(module.id).length - 2} more lessons
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setActiveTab('curriculum')}
                    className="w-full py-2 text-sm lg:text-base text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View full curriculum →
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-4 lg:space-y-6">
              {/* Course Info Card */}
              <div className="bg-white rounded-xl shadow-sm border p-4 lg:p-6">
                <h3 className="font-semibold mb-4 text-sm lg:text-base">Course Details</h3>
                <div className="space-y-2 text-xs lg:text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Category:</span>
                    <span className="font-medium capitalize">{course?.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Level:</span>
                    <span className="font-medium capitalize">{course?.level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last updated:</span>
                    <span className="font-medium">
                      {course?.updatedAt?.toDate?.().toLocaleDateString() || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Instructor Card */}
              <div className="bg-white rounded-xl shadow-sm border p-4 lg:p-6">
                <h3 className="font-semibold mb-4 text-sm lg:text-base">Instructor</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-base lg:text-lg">
                    {course?.createdByEmail?.[0]?.toUpperCase() || 'A'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm lg:text-base truncate">{course?.createdByEmail || 'Admin'}</div>
                    <div className="text-xs lg:text-sm text-gray-500">Course Creator</div>
                  </div>
                </div>
              </div>

              {/* Your Progress - With Review Button */}
              <div className="bg-white rounded-xl shadow-sm border p-4 lg:p-6">
                <h3 className="font-semibold mb-4 text-sm lg:text-base">Your Progress</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs lg:text-sm mb-1">
                      <span>Current Course</span>
                      <span className="font-medium">{getTotalProgress()}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-600 rounded-full transition-all"
                        style={{ width: `${getTotalProgress()}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="text-xs lg:text-sm text-gray-600">
                    <div className="flex justify-between py-1">
                      <span>Completed current lessons:</span>
                      <span className="font-medium">{completionStats.active.completed}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Remaining current lessons:</span>
                      <span className="font-medium">{completionStats.active.total - completionStats.active.completed}</span>
                    </div>
                    {completionStats.archived > 0 && (
                      <div className="flex justify-between py-1 text-gray-400 border-t mt-1 pt-1">
                        <span>Legacy lessons completed:</span>
                        <span className="font-medium">{completionStats.archived}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {nextLesson && (
                      <button
                        onClick={() => navigate(`/course/${courseId}/lesson/${nextLesson.id}`)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-sm lg:text-base"
                      >
                        <Play size={14} />
                        Continue Learning
                      </button>
                    )}
                    
                    {/* Review Button - Overview Sidebar */}
                    <button
                      onClick={() => navigate(`/course-details/${courseId}`)}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 text-sm lg:text-base"
                    >
                      <Star size={14} />
                      View Course Reviews
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'curriculum' && (
          <div className="bg-white rounded-xl shadow-sm border">
            {/* Curriculum Header */}
            <div className="p-4 lg:p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold">Course Curriculum</h2>
                  <p className="text-sm lg:text-base text-gray-600 mt-1">
                    {modules.length} modules • {lessons.active.length} current lessons
                    {lessons.archived.length > 0 && ` • ${lessons.archived.length} archived`}
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search lessons..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  
                  {/* View Controls */}
                  <div className="hidden lg:flex items-center gap-1 border rounded-lg p-1">
                    <button
                      onClick={expandAll}
                      className="px-3 py-1 text-sm hover:bg-gray-100 rounded"
                    >
                      Expand All
                    </button>
                    <button
                      onClick={collapseAll}
                      className="px-3 py-1 text-sm hover:bg-gray-100 rounded"
                    >
                      Collapse All
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Search Results Count */}
              {searchTerm && (
                <div className="mt-2 text-sm text-gray-600">
                  Found {filteredLessons.length} {filteredLessons.length === 1 ? 'lesson' : 'lessons'}
                </div>
              )}
            </div>

            {/* Curriculum Content */}
            <div className="p-4 lg:p-6">
              <div className="space-y-4">
                {/* Search Results View */}
                {searchTerm ? (
                  <div className="divide-y">
                    {filteredLessons.map((lesson, index) => {
                      const isCompleted = enrollment?.completedLessons?.includes(lesson.id);
                      
                      return (
                        <div
                          key={lesson.id}
                          onClick={() => navigate(`/course/${courseId}/lesson/${lesson.id}`)}
                          className="py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            {isCompleted ? (
                              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                            ) : (
                              <Circle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm lg:text-base">{lesson.title}</span>
                                {lesson.videoUrl ? (
                                  <Video className="h-3 w-3 text-red-500" />
                                ) : (
                                  <FileText className="h-3 w-3 text-green-600" />
                                )}
                              </div>
                              {lesson.description && (
                                <p className="text-xs lg:text-sm text-gray-500 mt-1 line-clamp-2">{lesson.description}</p>
                              )}
                            </div>
                            <span className="text-xs lg:text-sm text-gray-500 whitespace-nowrap">
                              {lesson.duration || '5 min'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Normal Module View */
                  <>
                    {modules.map(module => {
                      const moduleLessons = getLessonsInModule(module.id);
                      const completedCount = getCompletedLessonsInModule(module.id);
                      const progress = calculateModuleProgress(module.id);
                      const isExpanded = expandedModules[module.id];

                      if (moduleLessons.length === 0) return null;

                      return (
                        <div key={module.id} className="border rounded-lg overflow-hidden">
                          {/* Module Header */}
                          <div
                            onClick={() => toggleModule(module.id)}
                            className="bg-gray-50 px-4 lg:px-6 py-3 lg:py-4 cursor-pointer hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0">
                                <ChevronRight 
                                  className={`h-4 w-4 lg:h-5 lg:w-5 text-gray-500 flex-shrink-0 transition-transform ${
                                    isExpanded ? 'rotate-90' : ''
                                  }`} 
                                />
                                <div className="min-w-0">
                                  <h3 className="font-semibold text-sm lg:text-base truncate">{module.title}</h3>
                                  {module.description && (
                                    <p className="text-xs lg:text-sm text-gray-600 mt-0.5 lg:mt-1 line-clamp-1">
                                      {module.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 lg:gap-6 ml-2">
                                <div className="text-xs lg:text-sm text-gray-500 whitespace-nowrap">
                                  {completedCount}/{moduleLessons.length}
                                </div>
                                <div className="w-16 lg:w-24 h-1.5 lg:h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-green-600 rounded-full transition-all"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Module Lessons */}
                          {isExpanded && (
                            <div className="divide-y">
                              {moduleLessons.map((lesson, index) => {
                                const isCompleted = enrollment?.completedLessons?.includes(lesson.id);
                                
                                return (
                                  <div
                                    key={lesson.id}
                                    onClick={() => navigate(`/course/${courseId}/lesson/${lesson.id}`)}
                                    className="px-4 lg:px-6 py-3 lg:py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                                  >
                                    <div className="flex items-start gap-2 lg:gap-4">
                                      {/* Status Icon */}
                                      {isCompleted ? (
                                        <CheckCircle className="h-4 w-4 lg:h-5 lg:w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                      ) : (
                                        <Circle className="h-4 w-4 lg:h-5 lg:w-5 text-gray-300 flex-shrink-0 mt-0.5" />
                                      )}
                                      
                                      {/* Lesson Info */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-medium text-sm lg:text-base">
                                            {index + 1}. {lesson.title}
                                          </span>
                                          {lesson.videoUrl ? (
                                            <Video className="h-3 w-3 lg:h-4 lg:w-4 text-red-500" />
                                          ) : (
                                            <FileText className="h-3 w-3 lg:h-4 lg:w-4 text-green-600" />
                                          )}
                                          {lesson.freePreview && (
                                            <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                                              Preview
                                            </span>
                                          )}
                                        </div>
                                        {lesson.description && (
                                          <p className="text-xs lg:text-sm text-gray-500 mt-1 line-clamp-2">
                                            {lesson.description}
                                          </p>
                                        )}
                                      </div>
                                      
                                      {/* Duration */}
                                      <span className="text-xs lg:text-sm text-gray-500 whitespace-nowrap">
                                        {lesson.duration || '5 min'}
                                      </span>
                                      
                                      {/* Play button for current lesson */}
                                      {nextLesson?.id === lesson.id && !isCompleted && (
                                        <PlayCircle className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600 flex-shrink-0" />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Ungrouped Lessons */}
                    {getUngroupedLessons().length > 0 && (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 lg:px-6 py-3 lg:py-4">
                          <h3 className="font-semibold text-sm lg:text-base">Additional Lessons</h3>
                        </div>
                        <div className="divide-y">
                          {getUngroupedLessons().map((lesson, index) => {
                            const isCompleted = enrollment?.completedLessons?.includes(lesson.id);
                            
                            return (
                              <div
                                key={lesson.id}
                                onClick={() => navigate(`/course/${courseId}/lesson/${lesson.id}`)}
                                className="px-4 lg:px-6 py-3 lg:py-4 hover:bg-gray-50 cursor-pointer"
                              >
                                <div className="flex items-center gap-2 lg:gap-4">
                                  {isCompleted ? (
                                    <CheckCircle className="h-4 w-4 lg:h-5 lg:w-5 text-green-600" />
                                  ) : (
                                    <Circle className="h-4 w-4 lg:h-5 lg:w-5 text-gray-300" />
                                  )}
                                  {lesson.videoUrl ? (
                                    <Video className="h-3 w-3 lg:h-4 lg:w-4 text-red-500" />
                                  ) : (
                                    <FileText className="h-3 w-3 lg:h-4 lg:w-4 text-green-600" />
                                  )}
                                  <span className="flex-1 font-medium text-sm lg:text-base">{lesson.title}</span>
                                  <span className="text-xs lg:text-sm text-gray-500">
                                    {lesson.duration || '5 min'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Archived Lessons Section */}
                    {lessons.archived.length > 0 && (
                      <div className="border rounded-lg overflow-hidden mt-6">
                        <div 
                          onClick={() => setShowArchived(!showArchived)}
                          className="bg-gray-100 px-4 lg:px-6 py-3 lg:py-4 cursor-pointer hover:bg-gray-200 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <Archive className="h-4 w-4 lg:h-5 lg:w-5 text-gray-600" />
                            <h3 className="font-semibold text-sm lg:text-base">
                              Archived Lessons ({lessons.archived.length})
                            </h3>
                          </div>
                          <ChevronRight 
                            className={`h-4 w-4 lg:h-5 lg:w-5 transition-transform ${
                              showArchived ? 'rotate-90' : ''
                            }`} 
                          />
                        </div>
                        
                        {showArchived && (
                          <div className="divide-y bg-gray-50">
                            {lessons.archived.map(lesson => {
                              const isCompleted = enrollment?.completedLessons?.includes(lesson.id);
                              
                              return (
                                <div
                                  key={lesson.id}
                                  onClick={() => navigate(`/course/${courseId}/archived/${lesson.id}`)}
                                  className="px-4 lg:px-6 py-3 lg:py-4 hover:bg-gray-100 cursor-pointer transition-colors"
                                >
                                  <div className="flex items-start gap-3">
                                    {/* Status Icon */}
                                    {isCompleted ? (
                                      <CheckCircle className="h-4 w-4 lg:h-5 lg:w-5 text-green-500 flex-shrink-0" />
                                    ) : (
                                      <Circle className="h-4 w-4 lg:h-5 lg:w-5 text-gray-300 flex-shrink-0" />
                                    )}
                                    
                                    {/* Archived Icon */}
                                    <Archive className="h-3 w-3 lg:h-4 lg:w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                    
                                    {/* Lesson Info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-sm lg:text-base text-gray-700">
                                          {lesson.title}
                                        </span>
                                        <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                                          Archived
                                        </span>
                                      </div>
                                      <div className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-3 mt-1 text-xs text-gray-500">
                                        <span>Archived: {new Date(lesson.archivedAt).toLocaleDateString()}</span>
                                        {lesson.archiveReason && (
                                          <span className="hidden lg:inline">•</span>
                                        )}
                                        {lesson.archiveReason && (
                                          <span>Reason: {lesson.archiveReason}</span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Completion Status */}
                                    {isCompleted && (
                                      <span className="text-xs text-green-600 whitespace-nowrap">
                                        Completed
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {lessons.active.length === 0 && lessons.archived.length === 0 && (
                      <div className="text-center py-12">
                        <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No lessons yet</h3>
                        <p className="text-gray-500">Check back soon for course content</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="bg-white rounded-xl shadow-sm border p-4 lg:p-6">
            {/* Resources Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold">Course Resources</h2>
                <p className="text-sm text-gray-500 mt-1">{allResources.length} files available</p>
              </div>
              
              {/* View Toggle - Desktop only */}
              <div className="hidden lg:flex items-center gap-1 border rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                  title="Grid view"
                >
                  <Grid size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                  title="List view"
                >
                  <List size={18} />
                </button>
              </div>
            </div>
            
            {/* Resources Grid/List */}
            {allResources.length > 0 ? (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allResources.map((resource, index) => {
                    const fileType = resource.fileType || getFileType(resource.name || resource.originalName);
                    const isPreviewable = ['pdf', 'image', 'video', 'text'].includes(fileType);
                    
                    return (
                      <div key={resource.id || index} className="border rounded-lg p-4 hover:shadow-md transition">
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`p-2 rounded-lg ${
                            fileType === 'pdf' ? 'bg-red-50' :
                            fileType === 'image' ? 'bg-pink-50' :
                            fileType === 'video' ? 'bg-purple-50' :
                            fileType === 'document' ? 'bg-blue-50' :
                            fileType === 'spreadsheet' ? 'bg-green-50' :
                            'bg-gray-50'
                          }`}>
                            <FileText className={`h-5 w-5 ${
                              fileType === 'pdf' ? 'text-red-600' :
                              fileType === 'image' ? 'text-pink-600' :
                              fileType === 'video' ? 'text-purple-600' :
                              fileType === 'document' ? 'text-blue-600' :
                              fileType === 'spreadsheet' ? 'text-green-600' :
                              'text-gray-600'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate">{resource.name || resource.originalName}</h3>
                            <p className="text-xs text-gray-500 mt-1">
                              From: {resource.lessonTitle}
                            </p>
                          </div>
                        </div>
                        
                        {resource.size && (
                          <p className="text-xs text-gray-500 mb-3">
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
                            <span className="hidden sm:inline">Preview</span>
                          </button>
                          <button
                            onClick={() => handleDownloadResource(resource)}
                            disabled={downloading === (resource.key || resource.id)}
                            className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* List View */
                <div className="space-y-2">
                  {allResources.map((resource, index) => {
                    const fileType = resource.fileType || getFileType(resource.name || resource.originalName);
                    
                    return (
                      <div key={resource.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`p-2 rounded-lg ${
                            fileType === 'pdf' ? 'bg-red-50' :
                            fileType === 'image' ? 'bg-pink-50' :
                            fileType === 'video' ? 'bg-purple-50' :
                            'bg-gray-100'
                          }`}>
                            <FileText className={`h-4 w-4 ${
                              fileType === 'pdf' ? 'text-red-600' :
                              fileType === 'image' ? 'text-pink-600' :
                              fileType === 'video' ? 'text-purple-600' :
                              'text-gray-600'
                            }`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{resource.name || resource.originalName}</p>
                            <p className="text-xs text-gray-500">
                              From: {resource.lessonTitle} • {resource.size ? (resource.size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown size'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePreviewResource(resource)}
                            disabled={downloading === (resource.key || resource.id)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                            title="Preview"
                          >
                            {downloading === (resource.key || resource.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                          <button
                            onClick={() => handleDownloadResource(resource)}
                            disabled={downloading === (resource.key || resource.id)}
                            className="p-2 text-green-600 hover:bg-green-100 rounded-lg"
                            title="Download"
                          >
                            {downloading === (resource.key || resource.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download size={16} />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No resources yet</h3>
                <p className="text-gray-500">Resources will appear here as they're added to lessons</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="bg-white rounded-xl shadow-sm border p-4 lg:p-6">
            <h2 className="text-xl lg:text-2xl font-bold mb-6">Announcements</h2>
            <div className="space-y-4">
              {announcements.map((announcement, index) => (
                <div 
                  key={announcement.id} 
                  className={`border-l-4 ${
                    announcement.type === 'enrollment' 
                      ? 'border-green-600 bg-green-50' 
                      : 'border-blue-600 bg-blue-50'
                  } p-4 rounded-r-lg`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${
                      announcement.type === 'enrollment' ? 'bg-green-100' : 'bg-blue-100'
                    }`}>
                      {announcement.type === 'enrollment' ? (
                        <Calendar className={`h-4 w-4 lg:h-5 lg:w-5 ${
                          announcement.type === 'enrollment' ? 'text-green-600' : 'text-blue-600'
                        }`} />
                      ) : (
                        <Bell className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm lg:text-base">{announcement.title}</h3>
                      <p className="text-xs lg:text-sm text-gray-700 mt-1">{announcement.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Posted on {announcement.date.toLocaleDateString('en-US', { 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {announcements.length === 0 && (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements yet</h3>
                  <p className="text-gray-500">Check back later for updates</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add no-scrollbar utility */}
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
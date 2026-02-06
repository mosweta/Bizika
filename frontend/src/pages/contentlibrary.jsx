// src/components/admin/ContentLibrary.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  collection, 
  query, 
  getDocs, 
  updateDoc, 
  doc, 
  deleteDoc,
  orderBy,
  where,
  setDoc,
  getDoc
} from "firebase/firestore";
import { db } from "../firebase/config";
import { 
  Folder, 
  FileText, 
  Video, 
  Image, 
  Link as LinkIcon,
  Move,
  GripVertical,
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Trash2,
  Edit,
  Upload,
  Download,
  Eye,
  EyeOff,
  Loader2,
  X,
  AlertCircle,
  Check,
  MoreVertical,
  FolderPlus,
  FilePlus,
  File,
  FileVideo,
  FileImage,
  CloudUpload,
  Cloud,
  CheckCircle,
  AlertTriangle,
  FileUp,
  Clock,
  HardDrive,
  Link,
  ExternalLink
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { v4 as uuidv4 } from "uuid";
import R2Service from "../services/r2service";

// Helper function to get resource icon
const getResourceIcon = (type) => {
  const typeLower = type?.toLowerCase() || '';
  switch (typeLower) {
    case 'pdf': return <FileText className="h-5 w-5 text-red-500" />;
    case 'video': return <FileVideo className="h-5 w-5 text-purple-500" />;
    case 'image': return <FileImage className="h-5 w-5 text-green-500" />;
    case 'link': return <LinkIcon className="h-5 w-5 text-blue-500" />;
    case 'doc':
    case 'docx': return <FileText className="h-5 w-5 text-blue-500" />;
    case 'xls':
    case 'xlsx': return <FileText className="h-5 w-5 text-green-500" />;
    case 'ppt':
    case 'pptx': return <FileText className="h-5 w-5 text-orange-500" />;
    case 'zip': return <File className="h-5 w-5 text-yellow-500" />;
    default: return <File className="h-5 w-5 text-gray-500" />;
  }
};

// Helper function to get category color
const getCategoryColor = (category) => {
  const colors = {
    web: 'bg-blue-100 text-blue-800 border-blue-200',
    programming: 'bg-green-100 text-green-800 border-green-200',
    design: 'bg-purple-100 text-purple-800 border-purple-200',
    business: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    marketing: 'bg-pink-100 text-pink-800 border-pink-200',
    default: 'bg-gray-100 text-gray-800 border-gray-200'
  };
  return colors[category?.toLowerCase()] || colors.default;
};

// Upload Status Panel Component
const UploadStatusPanel = ({ uploadQueue, uploadProgress, storageStats }) => (
  <div className="fixed bottom-4 right-4 w-80 bg-white rounded-lg shadow-lg border z-50 max-h-[400px] overflow-hidden">
    <div className="p-4 border-b">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CloudUpload size={20} />
          <h4 className="font-semibold">Upload Status</h4>
        </div>
        <span className="text-sm text-gray-500">
          {uploadQueue.length} {uploadQueue.length === 1 ? 'item' : 'items'}
        </span>
      </div>
    </div>
    
    <div className="max-h-64 overflow-y-auto">
      {uploadQueue.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          <FileUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No active uploads</p>
        </div>
      ) : (
        uploadQueue.map((item) => (
          <div key={item.id} className="p-3 border-b hover:bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {item.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                {item.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                {item.status === 'failed' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                {item.status === 'deleting' && <Trash2 className="h-4 w-4 text-orange-500" />}
                <span className="text-sm font-medium truncate max-w-[180px]">
                  {item.file.name}
                </span>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                item.status === 'completed' ? 'bg-green-100 text-green-800' :
                item.status === 'uploading' ? 'bg-blue-100 text-blue-800' :
                item.status === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {item.status}
              </span>
            </div>
            
            {item.status === 'uploading' && (
              <div className="space-y-1">
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress[item.id] || 0}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{uploadProgress[item.id] || 0}%</span>
                  {item.startTime && (
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {Math.round((Date.now() - item.startTime) / 1000)}s
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {item.status === 'failed' && (
              <p className="text-xs text-red-600 mt-1 truncate">{item.error}</p>
            )}
          </div>
        ))
      )}
    </div>
    
    {storageStats && (
      <div className="p-3 bg-gray-50 border-t">
        <div className="flex items-center justify-between text-sm mb-1">
          <div className="flex items-center gap-2">
            <HardDrive size={14} className="text-gray-500" />
            <span>Storage Used:</span>
          </div>
          <span className="font-medium">{storageStats.formattedSize}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Files:</span>
          <span className="font-medium">{storageStats.fileCount}</span>
        </div>
      </div>
    )}
  </div>
);

// Helper function to validate video URLs
const validateVideoUrl = (url) => {
  if (!url) return { valid: true, type: null };
  
  // YouTube patterns
  const youtubePatterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /^https?:\/\/(www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/,
    /^https?:\/\/(www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/
  ];
  
  // Vimeo patterns
  const vimeoPatterns = [
    /^https?:\/\/(www\.)?vimeo\.com\/([0-9]+)/,
    /^https?:\/\/(www\.)?vimeo\.com\/\/([0-9]+)/
  ];
  
  // Direct video file patterns
  const videoFilePatterns = [
    /^https?:\/\/.*\.(mp4|webm|mov|avi|mkv)(\?.*)?$/i
  ];
  
  for (const pattern of youtubePatterns) {
    if (pattern.test(url)) return { valid: true, type: 'youtube' };
  }
  
  for (const pattern of vimeoPatterns) {
    if (pattern.test(url)) return { valid: true, type: 'vimeo' };
  }
  
  for (const pattern of videoFilePatterns) {
    if (pattern.test(url)) return { valid: true, type: 'direct' };
  }
  
  // Allow other URLs but mark as other
  if (url.startsWith('http')) {
    return { valid: true, type: 'other' };
  }
  
  return { valid: false, type: 'unknown' };
};

export default function ContentLibrary() {
  const [courses, setCourses] = useState([]);
  const [expandedLessons, setExpandedLessons] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  const [showAddLessonModal, setShowAddLessonModal] = useState(false);
  const [selectedLessonForResource, setSelectedLessonForResource] = useState(null);
  const [selectedCourseForLesson, setSelectedCourseForLesson] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [categories, setCategories] = useState([]);
  
  // R2 Integration states
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadQueue, setUploadQueue] = useState([]);
  const [storageStats, setStorageStats] = useState(null);

  // Resource form state
  const [resourceForm, setResourceForm] = useState({
    name: "",
    type: "pdf",
    file: null,
    url: "",
    description: ""
  });

  // Lesson form state with video URL
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    videoUrl: "",
    duration: "",
    isPublished: true
  });

    // Add this function here
  const toggleLessonExpansion = (lessonId) => {
    setExpandedLessons(prev => ({
      ...prev,
      [lessonId]: !prev[lessonId]
    }));
  };
  // Fetch courses with lessons and resources
  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First, fetch all courses
      let q;
      if (filterType !== "all") {
        q = query(collection(db, "courses"), 
          where("category", "==", filterType),
          orderBy("createdAt", "desc")
        );
      } else {
        q = query(collection(db, "courses"), orderBy("createdAt", "desc"));
      }
      
      const coursesSnapshot = await getDocs(q);
      
      if (coursesSnapshot.empty) {
        setCourses([]);
        setLoading(false);
        return;
      }
      
      // Get all categories for filter
      const uniqueCategories = [...new Set(coursesSnapshot.docs.map(doc => doc.data().category))].filter(Boolean);
      setCategories(['all', ...uniqueCategories]);
      
      // Fetch lessons and resources for each course
      const coursesData = await Promise.all(
        coursesSnapshot.docs.map(async (courseDoc) => {
          const courseData = courseDoc.data();
          const courseId = courseDoc.id;
          
          // Try to get lessons from subcollection
          let lessons = [];
          try {
            const lessonsRef = collection(db, "courses", courseId, "lessons");
            const lessonsSnapshot = await getDocs(query(lessonsRef, orderBy("order", "asc")));
            
            lessons = await Promise.all(
              lessonsSnapshot.docs.map(async (lessonDoc) => {
                const lessonData = lessonDoc.data();
                const lessonId = lessonDoc.id;
                
                // Get resources from lesson data
                let resources = lessonData.resources || [];
                
                // If resources are stored as references, fetch them
                if (resources.length > 0 && typeof resources[0] === 'string') {
                  const resourcePromises = resources.map(async (resourceId) => {
                    try {
                      const resourceDoc = await getDoc(doc(db, "resources", resourceId));
                      if (resourceDoc.exists()) {
                        return { id: resourceDoc.id, ...resourceDoc.data() };
                      }
                    } catch (err) {
                      console.log(`Resource ${resourceId} not found`);
                    }
                    return null;
                  });
                  
                  resources = (await Promise.all(resourcePromises)).filter(Boolean);
                }
                
                return {
                  id: lessonId,
                  ...lessonData,
                  resources
                };
              })
            );
          } catch (lessonsError) {
            console.log("Using course.lessons array");
            lessons = courseData.lessons?.map((lesson, index) => ({
              id: lesson.id || `lesson-${index}`,
              ...lesson,
              resources: lesson.resources || []
            })) || [];
          }
          
          return {
            id: courseId,
            ...courseData,
            lessons
          };
        })
      );
      
      setCourses(coursesData);
      
    } catch (err) {
      console.error("Error fetching courses:", err);
      setError(`Failed to load courses: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  // Initial fetch
  useEffect(() => {
    fetchCourses();
    fetchStorageStats();
  }, [fetchCourses]);

  // Fetch storage stats from R2
const fetchStorageStats = async () => {
  try {
    console.log('📊 Fetching storage stats...');
    
    // Test connection first
    const connection = await R2Service.testConnection();
    if (!connection.connected) {
      console.warn('R2 Service not available:', connection.error);
      setStorageStats({
        totalSize: 0,
        fileCount: 0,
        formattedSize: '0 Bytes',
        byType: {}
      });
      return;
    }
    
    const stats = await R2Service.getStorageStats();
    console.log('✅ Storage stats fetched:', stats);
    
    setStorageStats(stats);
  } catch (error) {
    console.error('Failed to fetch storage stats:', error);
    setStorageStats({
      totalSize: 0,
      fileCount: 0,
      formattedSize: '0 Bytes',
      byType: {}
    });
  }
};

  // Search and filter logic
  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return courses;
    
    const searchLower = searchQuery.toLowerCase();
    return courses.filter(course => {
      // Search in course title and description
      const courseMatches = course.title.toLowerCase().includes(searchLower) ||
                           course.description?.toLowerCase().includes(searchLower);
      
      // Search in lessons
      const lessonMatches = course.lessons?.some(lesson =>
        lesson.title.toLowerCase().includes(searchLower) ||
        lesson.description?.toLowerCase().includes(searchLower) ||
        lesson.videoUrl?.toLowerCase().includes(searchLower)
      );
      
      // Search in resources
      const resourceMatches = course.lessons?.some(lesson =>
        lesson.resources?.some(resource =>
          resource.name?.toLowerCase().includes(searchLower) ||
          resource.description?.toLowerCase().includes(searchLower) ||
          resource.originalName?.toLowerCase().includes(searchLower)
        )
      );
      
      return courseMatches || lessonMatches || resourceMatches;
    });
  }, [courses, searchQuery]);

  // Drag and drop handlers
  const handleDragEnd = async (result) => {
    const { source, destination, type } = result;
    
    if (!destination) {
      return;
    }

    if (source.index === destination.index && source.droppableId === destination.droppableId) {
      return;
    }

    await performDragOperation(result);
  };

  const performDragOperation = async (result) => {
    const { source, destination, type } = result;

    try {
      if (type === "LESSON") {
        const courseId = source.droppableId;
        const course = courses.find(c => c.id === courseId);
        
        if (!course || !course.lessons) return;

        const reorderedLessons = Array.from(course.lessons);
        const [movedLesson] = reorderedLessons.splice(source.index, 1);
        reorderedLessons.splice(destination.index, 0, movedLesson);

        // Update order numbers
        const updatedLessons = reorderedLessons.map((lesson, index) => ({
          ...lesson,
          order: index + 1
        }));

        // Update in Firestore
        try {
          // Update lessons subcollection
          for (let i = 0; i < updatedLessons.length; i++) {
            const lesson = updatedLessons[i];
            const lessonRef = doc(db, "courses", courseId, "lessons", lesson.id);
            await updateDoc(lessonRef, { order: i + 1 });
          }
        } catch (subcollectionError) {
          // Update lessons array in course document
          await updateDoc(doc(db, "courses", courseId), {
            lessons: updatedLessons.map(l => ({
              id: l.id,
              title: l.title,
              description: l.description,
              duration: l.duration,
              order: l.order,
              isPublished: l.isPublished
            })),
            updatedAt: new Date()
          });
        }

        // Update local state
        setCourses(prev => prev.map(c => 
          c.id === courseId ? { ...c, lessons: updatedLessons } : c
        ));
      }
      
      if (type === "RESOURCE") {
        const [courseId, lessonId] = source.droppableId.split('_');
        const course = courses.find(c => c.id === courseId);
        
        if (!course) return;

        const lesson = course.lessons.find(l => l.id === lessonId);
        if (!lesson || !lesson.resources) return;

        const reorderedResources = Array.from(lesson.resources);
        const [movedResource] = reorderedResources.splice(source.index, 1);
        reorderedResources.splice(destination.index, 0, movedResource);

        // Update order numbers
        const updatedResources = reorderedResources.map((resource, index) => ({
          ...resource,
          order: index + 1
        }));

        // Update in Firestore
        const lessonRef = doc(db, "courses", courseId, "lessons", lessonId);
        await updateDoc(lessonRef, { 
          resources: updatedResources,
          updatedAt: new Date()
        });

        // Update local state
        const updatedLessons = course.lessons.map(l => 
          l.id === lessonId ? { ...l, resources: updatedResources } : l
        );

        setCourses(prev => prev.map(c => 
          c.id === courseId ? { ...c, lessons: updatedLessons } : c
        ));
      }
    } catch (error) {
      console.error("Error updating order:", error);
      setError(`Failed to update order: ${error.message}`);
      // Revert to original order
      fetchCourses();
    }
  };

 

// Update the upload function to handle metadata better:
const handleR2Upload = async (file, lesson) => {
  const uploadId = uuidv4();
  
  // Add to upload queue
  setUploadQueue(prev => [...prev, {
    id: uploadId,
    file,
    status: 'queued',
    progress: 0,
    startTime: Date.now()
  }]);
  
  try {
    setUploadProgress(prev => ({ ...prev, [uploadId]: 0 }));
    setUploadQueue(prev => prev.map(item => 
      item.id === uploadId ? { ...item, status: 'uploading' } : item
    ));
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        const current = prev[uploadId] || 0;
        if (current >= 95) {
          clearInterval(progressInterval);
          return prev;
        }
        return { ...prev, [uploadId]: current + 5 };
      });
    }, 200);
    
    // Upload to R2 with proper metadata
    const uploadResult = await R2Service.uploadFile(file, {
      folder: 'course-resources',
      courseId: lesson.courseId,
      lessonId: lesson.id,
      userId: 'admin',
      metadata: {
        type: resourceForm.type,
        description: resourceForm.description || '',
        originalName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadedBy: 'admin'
      }
    });
    
    clearInterval(progressInterval);
    
    if (!uploadResult.success) {
      throw new Error(uploadResult.error || 'Upload failed');
    }
    
    setUploadProgress(prev => ({ ...prev, [uploadId]: 100 }));
    
    // Update queue
    setUploadQueue(prev => prev.map(item => 
      item.id === uploadId ? { 
        ...item, 
        status: 'completed', 
        progress: 100,
        result: uploadResult.data,
        endTime: Date.now()
      } : item
    ));
    
    return uploadResult.data;
    
  } catch (error) {
    console.error('Upload failed:', error);
    setUploadQueue(prev => prev.map(item => 
      item.id === uploadId ? { 
        ...item, 
        status: 'failed', 
        error: error.message 
      } : item
    ));
    
    setTimeout(() => {
      setUploadQueue(prev => prev.filter(item => item.id !== uploadId));
    }, 5000);
    
    throw error;
  }
};

  // Add resource (combines R2 upload + Firestore save)
  const handleAddResource = async () => {
    if (!selectedLessonForResource || !resourceForm.name.trim()) {
      setError("Please fill in resource name");
      return;
    }

    try {
      setUploadingFile(true);
      setError(null);
      
      const resourceId = uuidv4();
      const courseId = selectedLessonForResource.courseId;
      const lessonId = selectedLessonForResource.id;
      
      let resourceData = {
        id: resourceId,
        name: resourceForm.name,
        type: resourceForm.type,
        description: resourceForm.description || "",
        order: selectedLessonForResource.resources?.length || 0,
        createdAt: new Date().toISOString()
      };

      // Handle file upload to R2
      if (resourceForm.file) {
        try {
          const r2Data = await handleR2Upload(resourceForm.file, selectedLessonForResource);
          resourceData = {
            ...resourceData,
            ...r2Data,
            type: r2Data.type?.split('/')[0] || resourceForm.type
          };
        } catch (uploadError) {
          throw new Error(`Failed to upload file: ${uploadError.message}`);
        }
      } else if (resourceForm.url) {
        resourceData.url = resourceForm.url;
        resourceData.type = 'link';
      } else {
        throw new Error("Please provide either a file or URL");
      }

      // Save to Firestore
      const lessonRef = doc(db, "courses", courseId, "lessons", lessonId);
      const lessonDoc = await getDoc(lessonRef);
      
      if (lessonDoc.exists()) {
        const currentLesson = lessonDoc.data();
        const currentResources = currentLesson.resources || [];
        
        await updateDoc(lessonRef, {
          resources: [...currentResources, resourceData],
          updatedAt: new Date().toISOString()
        });
      }

      // Reset form and close modal
      setResourceForm({
        name: "",
        type: "pdf",
        file: null,
        url: "",
        description: ""
      });
      setShowAddResourceModal(false);
      setSelectedLessonForResource(null);
      
      // Refresh data
      await fetchCourses();
      await fetchStorageStats();
      
      setError(null);
      
    } catch (error) {
      console.error("Error adding resource:", error);
      setError(`Failed to add resource: ${error.message}`);
    } finally {
      setUploadingFile(false);
    }
  };

  // Delete resource (from R2 + Firestore)
  const handleDeleteResource = async (courseId, lessonId, resourceId, resourceData) => {
    if (!window.confirm("Are you sure you want to delete this resource?")) return;

    try {
      setError(null);
      
      // Add to delete queue
      const deleteId = `delete-${resourceId}`;
      setUploadQueue(prev => [...prev, {
        id: deleteId,
        file: { name: resourceData.originalName || resourceData.name || 'Resource' },
        status: 'deleting',
        progress: 0
      }]);
      
      // Delete from R2 if it has a key
      if (resourceData.key) {
        await R2Service.deleteFile(resourceData.key);
      } else if (resourceData.url && resourceData.url.includes('r2.cloudflarestorage.com')) {
        const key = R2Service.extractKeyFromUrl(resourceData.url);
        if (key) await R2Service.deleteFile(key);
      }
      
      // Delete from Firestore
      const lessonRef = doc(db, "courses", courseId, "lessons", lessonId);
      const lessonDoc = await getDoc(lessonRef);
      
      if (lessonDoc.exists()) {
        const currentLesson = lessonDoc.data();
        const currentResources = currentLesson.resources || [];
        const updatedResources = currentResources.filter(r => r.id !== resourceId);
        
        await updateDoc(lessonRef, {
          resources: updatedResources,
          updatedAt: new Date().toISOString()
        });
      }

      // Update storage stats
      await fetchStorageStats();
      
      // Remove from queue
      setUploadQueue(prev => prev.filter(item => item.id !== deleteId));
      
      // Refresh courses
      await fetchCourses();
      
    } catch (error) {
      console.error("Error deleting resource:", error);
      setError(`Failed to delete resource: ${error.message}`);
      
      setUploadQueue(prev => prev.map(item => 
        item.id === `delete-${resourceId}` ? { 
          ...item, 
          status: 'failed', 
          error: error.message 
        } : item
      ));
    }
  };

  // Lesson management with video URL support
  const handleAddLesson = async () => {
    if (!selectedCourseForLesson || !lessonForm.title.trim()) {
      setError("Please fill in lesson title");
      return;
    }

    // Validate video URL if provided
    if (lessonForm.videoUrl) {
      const validation = validateVideoUrl(lessonForm.videoUrl);
      if (!validation.valid) {
        setError("Please enter a valid YouTube, Vimeo, or direct video URL");
        return;
      }
    }

    try {
      setError(null);
      
      const lessonId = uuidv4();
      const courseId = selectedCourseForLesson.id;
      
      // Determine video type
      let videoType = "youtube"; // default
      if (lessonForm.videoUrl) {
        const validation = validateVideoUrl(lessonForm.videoUrl);
        videoType = validation.type || "other";
      }
      
      const newLesson = {
        id: lessonId,
        title: lessonForm.title,
        description: lessonForm.description || "",
        videoUrl: lessonForm.videoUrl || "",
        videoType: videoType,
        duration: lessonForm.duration || "0 min",
        isPublished: lessonForm.isPublished !== false,
        order: selectedCourseForLesson.lessons?.length || 0,
        createdAt: new Date().toISOString(),
        resources: []
      };

      // Add lesson to Firestore subcollection
      const lessonRef = doc(db, "courses", courseId, "lessons", lessonId);
      await setDoc(lessonRef, newLesson);

      // Reset form and close modal
      setLessonForm({
        title: "",
        description: "",
        videoUrl: "",
        duration: "",
        isPublished: true
      });
      setShowAddLessonModal(false);
      setSelectedCourseForLesson(null);
      
      // Refresh data
      await fetchCourses();
      
    } catch (error) {
      console.error("Error adding lesson:", error);
      setError(`Failed to add lesson: ${error.message}`);
    }
  };

  const handleDeleteLesson = async (courseId, lessonId) => {
    if (!window.confirm("Are you sure you want to delete this lesson and all its resources?")) return;

    try {
      setError(null);
      
      const course = courses.find(c => c.id === courseId);
      const lesson = course?.lessons?.find(l => l.id === lessonId);
      
      if (!lesson) throw new Error("Lesson not found");
      
      // Delete all resources from R2
      if (lesson.resources) {
        for (const resource of lesson.resources) {
          if (resource.key) {
            try {
              await R2Service.deleteFile(resource.key);
            } catch (error) {
              console.warn(`Could not delete R2 file for resource ${resource.id}:`, error);
            }
          }
        }
      }

      // Delete lesson from Firestore
      const lessonRef = doc(db, "courses", courseId, "lessons", lessonId);
      await deleteDoc(lessonRef);

      await fetchCourses();
      await fetchStorageStats();
      
    } catch (error) {
      console.error("Error deleting lesson:", error);
      setError(`Failed to delete lesson: ${error.message}`);
    }
  };

  const toggleLessonPublish = async (courseId, lessonId, currentStatus) => {
    try {
      setError(null);
      
      const lessonRef = doc(db, "courses", courseId, "lessons", lessonId);
      await updateDoc(lessonRef, { 
        isPublished: !currentStatus,
        updatedAt: new Date().toISOString()
      });

      await fetchCourses();
      
    } catch (error) {
      console.error("Error updating lesson status:", error);
      setError(`Failed to update lesson status: ${error.message}`);
    }
  };

  // File handling
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileType = file.type.split('/')[0];
    const allowedTypes = ['video', 'image', 'application'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    // Check file type
    if (!allowedTypes.includes(fileType) && !file.type.includes('pdf')) {
      if (!['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'txt'].includes(fileExtension)) {
        setError("Invalid file type. Please upload video, image, PDF, or document files.");
        return;
      }
    }

    // Check file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      setError("File size too large. Maximum size is 100MB.");
      return;
    }

    // Determine resource type
    let resourceType = 'other';
    if (fileType === 'video') resourceType = 'video';
    else if (fileType === 'image') resourceType = 'image';
    else if (file.type.includes('pdf')) resourceType = 'pdf';
    else if (['doc', 'docx'].includes(fileExtension)) resourceType = 'doc';
    else if (['xls', 'xlsx'].includes(fileExtension)) resourceType = 'xls';
    else if (['ppt', 'pptx'].includes(fileExtension)) resourceType = 'ppt';
    else if (fileExtension === 'zip') resourceType = 'zip';
    else if (fileExtension === 'txt') resourceType = 'text';

    setResourceForm(prev => ({
      ...prev,
      file,
      type: resourceType,
      name: file.name.replace(/\.[^/.]+$/, "") // Remove extension for name
    }));
  };

  // Reset lesson form
  const resetLessonForm = () => {
    setLessonForm({
      title: "",
      description: "",
      videoUrl: "",
      duration: "",
      isPublished: true
    });
  };

  // Stats calculation
  const stats = useMemo(() => {
    const totalCourses = courses.length;
    const totalLessons = courses.reduce((acc, course) => acc + (course.lessons?.length || 0), 0);
    const totalResources = courses.reduce((acc, course) => 
      acc + course.lessons?.reduce((sum, lesson) => 
        sum + (lesson.resources?.length || 0), 0), 0
    );
    const publishedLessons = courses.reduce((acc, course) => 
      acc + course.lessons?.filter(l => l.isPublished !== false).length, 0
    );
    const lessonsWithVideo = courses.reduce((acc, course) => 
      acc + course.lessons?.filter(l => l.videoUrl).length, 0
    );

    return { totalCourses, totalLessons, totalResources, publishedLessons, lessonsWithVideo };
  }, [courses]);

  // Clean up completed uploads
  useEffect(() => {
    const completedUploads = uploadQueue.filter(item => 
      item.status === 'completed' || item.status === 'failed'
    );
    
    if (completedUploads.length > 0) {
      const timer = setTimeout(() => {
        setUploadQueue(prev => prev.filter(item => 
          item.status !== 'completed' && item.status !== 'failed'
        ));
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [uploadQueue]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 mt-3">Loading content library...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded">
            <X className="h-5 w-5 text-red-600" />
          </button>
        </div>
      )}

      {/* Add Resource Modal */}
      {showAddResourceModal && selectedLessonForResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Resource</h3>
              <button 
                onClick={() => {
                  setShowAddResourceModal(false);
                  setResourceForm({
                    name: "",
                    type: "pdf",
                    file: null,
                    url: "",
                    description: ""
                  });
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resource Name *
                </label>
                <input
                  type="text"
                  value={resourceForm.name}
                  onChange={(e) => setResourceForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter resource name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={resourceForm.type}
                  onChange={(e) => setResourceForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pdf">PDF</option>
                  <option value="video">Video</option>
                  <option value="image">Image</option>
                  <option value="link">Link</option>
                  <option value="doc">Document</option>
                  <option value="xls">Spreadsheet</option>
                  <option value="ppt">Presentation</option>
                  <option value="zip">ZIP Archive</option>
                  <option value="text">Text File</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    id="file-upload"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {resourceForm.file ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="h-6 w-6 text-blue-500" />
                        <span className="truncate">{resourceForm.file.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setResourceForm(prev => ({ ...prev, file: null }));
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-500 mt-1">Max file size: 100MB</p>
                      </>
                    )}
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  OR Enter URL
                </label>
                <input
                  type="url"
                  value={resourceForm.url}
                  onChange={(e) => setResourceForm(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com/resource"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={resourceForm.description}
                  onChange={(e) => setResourceForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Enter resource description..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddResourceModal(false);
                  setResourceForm({
                    name: "",
                    type: "pdf",
                    file: null,
                    url: "",
                    description: ""
                  });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddResource}
                disabled={uploadingFile || !resourceForm.name.trim() || (!resourceForm.file && !resourceForm.url)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploadingFile ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <CloudUpload size={16} />
                    Add Resource
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lesson Modal with Video URL */}
      {showAddLessonModal && selectedCourseForLesson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold">Add Lesson to {selectedCourseForLesson.title}</h3>
                <p className="text-sm text-gray-600">Add lesson details including video content</p>
              </div>
              <button 
                onClick={() => {
                  setShowAddLessonModal(false);
                  resetLessonForm();
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lesson Title *
                </label>
                <input
                  type="text"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter lesson title"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Video URL (Optional)
                  <span className="text-xs text-gray-500 ml-1">YouTube, Vimeo, or direct video link</span>
                </label>
                <input
                  type="url"
                  value={lessonForm.videoUrl}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                />
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <Video className="h-3 w-3" />
                  <span>Supports YouTube, Vimeo, or direct MP4/WebM links</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={lessonForm.description}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Enter lesson description..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (Optional)
                </label>
                <input
                  type="text"
                  value={lessonForm.duration}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, duration: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 15 min, 1 hour"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublished"
                  checked={lessonForm.isPublished}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, isPublished: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="isPublished" className="ml-2 text-sm text-gray-700">
                  Publish lesson immediately
                </label>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddLessonModal(false);
                  resetLessonForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLesson}
                disabled={!lessonForm.title.trim()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Video size={16} />
                Add Lesson
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Content Library</h2>
            <p className="text-gray-600">Organize courses, lessons, and resources</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => {
                if (courses.length === 0) {
                  setError("No courses available. Please create a course first.");
                  return;
                }
                setSelectedCourseForLesson(courses[0]);
                setShowAddLessonModal(true);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={courses.length === 0}
            >
              <FolderPlus size={20} />
              Add Lesson
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search courses, lessons, or resources..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Categories</option>
              {categories.filter(cat => cat !== 'all').map((category) => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
            <button 
              onClick={() => {
                fetchCourses();
                fetchStorageStats();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Filter size={20} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h3 className="font-semibold text-blue-800">Total Courses</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.totalCourses}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <h3 className="font-semibold text-green-800">Total Lessons</h3>
            <p className="text-3xl font-bold text-green-600">{stats.totalLessons}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
            <h3 className="font-semibold text-purple-800">Total Resources</h3>
            <p className="text-3xl font-bold text-purple-600">{stats.totalResources}</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
            <h3 className="font-semibold text-amber-800">Published</h3>
            <p className="text-3xl font-bold text-amber-600">{stats.publishedLessons}</p>
            <p className="text-sm text-amber-700">lessons published</p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
            <h3 className="font-semibold text-indigo-800">With Video</h3>
            <p className="text-3xl font-bold text-indigo-600">{stats.lessonsWithVideo}</p>
            <p className="text-sm text-indigo-700">lessons with video</p>
          </div>
        </div>
      </div>

      {/* Course Structure */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Course Structure</h3>
              <p className="text-gray-600">Drag and drop to reorder lessons and resources</p>
            </div>
            <button
              onClick={() => {
                fetchCourses();
                fetchStorageStats();
              }}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 self-start sm:self-auto"
            >
              Refresh
            </button>
          </div>
          
          {filteredCourses.length === 0 ? (
            <div className="p-12 text-center">
              <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? "No results found" : "No courses available"}
              </h3>
              <p className="text-gray-600">
                {searchQuery ? "Try a different search term" : "Create your first course to get started"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredCourses.map((course) => (
                <div key={course.id} className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <Folder className="text-blue-600" size={24} />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-lg">{course.title}</h4>
                          {course.category && (
                            <span className={`px-2 py-1 text-xs font-medium rounded ${getCategoryColor(course.category)}`}>
                              {course.category}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm">
                          {course.lessons?.length || 0} lessons • 
                          {course.lessons?.filter(l => l.isPublished !== false).length || 0} published •
                          {course.lessons?.filter(l => l.videoUrl).length || 0} with video
                        </p>
                        {course.description && (
                          <p className="text-gray-600 text-sm mt-1 line-clamp-2">{course.description}</p>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedCourseForLesson(course);
                        setShowAddLessonModal(true);
                      }}
                      className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center gap-1 whitespace-nowrap self-start md:self-auto"
                    >
                      <Plus size={16} />
                      Add Lesson
                    </button>
                  </div>

                  {course.lessons && course.lessons.length > 0 ? (
                    <Droppable droppableId={course.id} type="LESSON">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`space-y-3 ${snapshot.isDraggingOver ? 'bg-blue-50 p-3 rounded-lg' : ''}`}
                        >
                          {course.lessons.map((lesson, lessonIndex) => (
                            <Draggable 
                              key={lesson.id} 
                              draggableId={lesson.id} 
                              index={lessonIndex}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`border rounded-lg overflow-hidden ${
                                    snapshot.isDragging 
                                      ? 'border-blue-500 shadow-lg' 
                                      : 'border-gray-200'
                                  }`}
                                >
                                  <div className="bg-gray-50 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 flex-1">
                                      <div {...provided.dragHandleProps} className="cursor-move">
                                        <GripVertical className="text-gray-400 hover:text-gray-600" />
                                      </div>
                                      <div 
                                        className="flex-1 cursor-pointer"
                                        onClick={() => toggleLessonExpansion(lesson.id)}
                                      >
                                        <div className="flex items-center gap-2">
                                          {expandedLessons[lesson.id] ? 
                                            <ChevronDown size={16} /> : 
                                            <ChevronRight size={16} />
                                          }
                                          <div className="flex flex-col md:flex-row md:items-center gap-2">
                                            <span className="font-semibold">Lesson {lesson.order || lessonIndex + 1}: {lesson.title}</span>
                                            {lesson.duration && (
                                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded whitespace-nowrap">
                                                {lesson.duration}
                                              </span>
                                            )}
                                            {/* Show Video Icon */}
                                            {lesson.videoUrl && (
                                              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded flex items-center gap-1">
                                                <Video size={12} />
                                                Video
                                              </span>
                                            )}
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleLessonPublish(course.id, lesson.id, lesson.isPublished);
                                              }}
                                              className={`px-2 py-1 text-xs rounded border ${
                                                lesson.isPublished !== false 
                                                  ? 'bg-green-100 text-green-800 border-green-200' 
                                                  : 'bg-gray-100 text-gray-800 border-gray-200'
                                              }`}
                                            >
                                              {lesson.isPublished !== false ? (
                                                <span className="flex items-center gap-1">
                                                  <Eye size={12} />
                                                  Published
                                                </span>
                                              ) : (
                                                <span className="flex items-center gap-1">
                                                  <EyeOff size={12} />
                                                  Draft
                                                </span>
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                        {lesson.description && (
                                          <p className="text-sm text-gray-600 ml-6 mt-1 line-clamp-2">{lesson.description}</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between md:justify-end gap-3">
                                      <span className="text-sm text-gray-500 whitespace-nowrap">
                                        {lesson.resources?.length || 0} resources
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <button 
                                          onClick={() => toggleLessonExpansion(lesson.id)}
                                          className="p-1.5 text-sm hover:bg-gray-200 rounded"
                                        >
                                          {expandedLessons[lesson.id] ? 'Hide' : 'Show'}
                                        </button>
                                        <button
                                          onClick={() => {
                                            setSelectedLessonForResource({ ...lesson, courseId: course.id });
                                            setShowAddResourceModal(true);
                                          }}
                                          className="p-1.5 hover:bg-blue-100 text-blue-600 rounded"
                                          title="Add resource"
                                        >
                                          <FilePlus size={16} />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteLesson(course.id, lesson.id)}
                                          className="p-1.5 hover:bg-red-100 text-red-600 rounded"
                                          title="Delete lesson"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Expanded Lesson View */}
                                  {expandedLessons[lesson.id] && (
                                    <div className="p-4 bg-white border-t">
                                      {/* Video Section */}
                                      {lesson.videoUrl && (
                                        <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                                          <div className="flex items-center gap-2 mb-3">
                                            <Video className="h-5 w-5 text-purple-600" />
                                            <h5 className="font-medium text-purple-800">Video Content</h5>
                                          </div>
                                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 mb-1">
                                                <a 
                                                  href={lesson.videoUrl} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer"
                                                  className="text-sm text-purple-700 hover:text-purple-900 truncate block"
                                                >
                                                  {lesson.videoUrl}
                                                </a>
                                                <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full capitalize">
                                                  {lesson.videoType || 'video'}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-3 text-xs text-gray-600">
                                                {lesson.duration && <span>⏱️ {lesson.duration}</span>}
                                                <span>🔗 Click to watch</span>
                                              </div>
                                            </div>
                                            <a
                                              href={lesson.videoUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1 whitespace-nowrap"
                                            >
                                              <ExternalLink size={14} />
                                              Watch Video
                                            </a>
                                          </div>
                                        </div>
                                      )}

                                      {/* Resources Section */}
                                      <div className="flex items-center justify-between mb-3">
                                        <h5 className="font-medium text-gray-700">Resources</h5>
                                        <button 
                                          onClick={() => {
                                            setSelectedLessonForResource({ ...lesson, courseId: course.id });
                                            setShowAddResourceModal(true);
                                          }}
                                          className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 flex items-center gap-1"
                                        >
                                          <Plus size={16} /> Add Resource
                                        </button>
                                      </div>
                                      
                                      {!lesson.resources || lesson.resources.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                          <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                          <p>No resources added yet</p>
                                        </div>
                                      ) : (
                                        <Droppable droppableId={`${course.id}_${lesson.id}`} type="RESOURCE">
                                          {(provided, snapshot) => (
                                            <div
                                              ref={provided.innerRef}
                                              {...provided.droppableProps}
                                              className={`space-y-2 ${snapshot.isDraggingOver ? 'bg-blue-50 p-2 rounded' : ''}`}
                                            >
                                              {lesson.resources.map((resource, resourceIndex) => (
                                                <Draggable 
                                                  key={resource.id} 
                                                  draggableId={resource.id} 
                                                  index={resourceIndex}
                                                >
                                                  {(provided, snapshot) => (
                                                    <div
                                                      ref={provided.innerRef}
                                                      {...provided.draggableProps}
                                                      className={`flex flex-col md:flex-row md:items-center justify-between p-3 border rounded hover:bg-gray-50 ${
                                                        snapshot.isDragging 
                                                          ? 'border-blue-500 shadow-md' 
                                                          : 'border-gray-200'
                                                      }`}
                                                    >
                                                      <div className="flex items-start gap-3 mb-2 md:mb-0">
                                                        <div {...provided.dragHandleProps} className="cursor-move mt-1">
                                                          <Move className="text-gray-400 hover:text-gray-600" size={16} />
                                                        </div>
                                                        <div className="p-2 bg-gray-100 rounded">
                                                          {getResourceIcon(resource.type)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                          <p className="font-medium truncate">{resource.name || resource.originalName || 'Unnamed Resource'}</p>
                                                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                                                            <span className="uppercase">{resource.type || 'file'}</span>
                                                            {resource.size && <span>• {resource.size}</span>}
                                                            {resource.createdAt && (
                                                              <span>• {new Date(resource.createdAt).toLocaleDateString()}</span>
                                                            )}
                                                          </div>
                                                          {resource.description && (
                                                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{resource.description}</p>
                                                          )}
                                                        </div>
                                                      </div>
                                                      <div className="flex items-center gap-2 mt-2 md:mt-0">
                                                        {resource.url && (
                                                          <a 
                                                            href={resource.url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1"
                                                            title={resource.type === 'link' ? 'Visit link' : 'Download'}
                                                          >
                                                            {resource.type === 'link' ? (
                                                              <>
                                                                <ExternalLink size={14} />
                                                                Visit
                                                              </>
                                                            ) : (
                                                              <>
                                                                <Download size={14} />
                                                                Download
                                                              </>
                                                            )}
                                                          </a>
                                                        )}
                                                        <button
                                                          onClick={() => handleDeleteResource(course.id, lesson.id, resource.id, resource)}
                                                          className="p-2 hover:bg-red-100 text-red-600 rounded"
                                                          title="Delete resource"
                                                        >
                                                          <Trash2 size={16} />
                                                        </button>
                                                      </div>
                                                    </div>
                                                  )}
                                                </Draggable>
                                              ))}
                                              {provided.placeholder}
                                            </div>
                                          )}
                                        </Droppable>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-600">No lessons in this course yet</p>
                      <button
                        onClick={() => {
                          setSelectedCourseForLesson(course);
                          setShowAddLessonModal(true);
                        }}
                        className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      >
                        <Video size={16} />
                        Add First Lesson
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DragDropContext>

      {/* Upload Status Panel */}
      {uploadQueue.length > 0 && (
        <UploadStatusPanel 
          uploadQueue={uploadQueue} 
          uploadProgress={uploadProgress}
          storageStats={storageStats}
        />
      )}
    </div>
  );
}
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
  getDoc,
  setDoc
} from "firebase/firestore";
import { db } from "../firebase/config";
import { 
  Folder, 
  FileText, 
  Video, 
  Image, 
  Link, 
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
  Link as LinkIcon
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { storage } from "../firebase/config";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

// Helper function to get resource icon
const getResourceIcon = (type) => {
  switch (type) {
    case 'pdf': return <FileText className="h-5 w-5 text-red-500" />;
    case 'video': return <FileVideo className="h-5 w-5 text-purple-500" />;
    case 'image': return <FileImage className="h-5 w-5 text-green-500" />;
    case 'link': return <LinkIcon className="h-5 w-5 text-blue-500" />;
    default: return <File className="h-5 w-5 text-gray-500" />;
  }
};

// Helper function to get category color
const getCategoryColor = (category) => {
  const colors = {
    web: 'bg-blue-100 text-blue-800',
    programming: 'bg-green-100 text-green-800',
    design: 'bg-purple-100 text-purple-800',
    business: 'bg-yellow-100 text-yellow-800',
    marketing: 'bg-pink-100 text-pink-800',
    default: 'bg-gray-100 text-gray-800'
  };
  return colors[category?.toLowerCase()] || colors.default;
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
  const [dragConfirm, setDragConfirm] = useState(null);
  const [categories, setCategories] = useState([]);

  // Resource form state
  const [resourceForm, setResourceForm] = useState({
    name: "",
    type: "pdf",
    file: null,
    url: "",
    description: ""
  });

  // Lesson form state
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    duration: "",
    isPublished: true
  });

  // Fetch courses with lessons and resources
  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching courses...");
      
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
      console.log(`Found ${coursesSnapshot.size} courses`);
      
      if (coursesSnapshot.empty) {
        console.log("No courses found");
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
          
          console.log(`Processing course: ${courseData.title} (${courseId})`);
          
          // Try to get lessons from subcollection first
          let lessons = [];
          try {
            const lessonsRef = collection(db, "courses", courseId, "lessons");
            const lessonsSnapshot = await getDocs(query(lessonsRef, orderBy("order", "asc")));
            
            lessons = await Promise.all(
              lessonsSnapshot.docs.map(async (lessonDoc) => {
                const lessonData = lessonDoc.data();
                const lessonId = lessonDoc.id;
                
                // Try to get resources from subcollection
                let resources = [];
                try {
                  const resourcesRef = collection(db, "courses", courseId, "lessons", lessonId, "resources");
                  const resourcesSnapshot = await getDocs(query(resourcesRef, orderBy("order", "asc")));
                  resources = resourcesSnapshot.docs.map(resourceDoc => ({
                    id: resourceDoc.id,
                    ...resourceDoc.data()
                  }));
                } catch (resourcesError) {
                  console.log(`No resources subcollection for lesson ${lessonId} in course ${courseId}`);
                  // Use resources from lesson data if subcollection doesn't exist
                  resources = lessonData.resources || [];
                }
                
                return {
                  id: lessonId,
                  ...lessonData,
                  resources
                };
              })
            );
            
            // console.log(`Found ${lessons.length} lessons in subcollection for course ${courseId}`);
          } catch (lessonsError) {
            console.log(`No lessons subcollection for course ${courseId}, using course.lessons array`);
            // Fallback to lessons array in course document
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
      
      console.log("Final courses data:", coursesData);
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
  }, [fetchCourses]);

  // Toggle lesson expansion
  const toggleLessonExpansion = (lessonId) => {
    setExpandedLessons(prev => ({
      ...prev,
      [lessonId]: !prev[lessonId]
    }));
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
        lesson.description?.toLowerCase().includes(searchLower)
      );
      
      // Search in resources
      const resourceMatches = course.lessons?.some(lesson =>
        lesson.resources?.some(resource =>
          resource.name.toLowerCase().includes(searchLower) ||
          resource.description?.toLowerCase().includes(searchLower)
        )
      );
      
      return courseMatches || lessonMatches || resourceMatches;
    });
  }, [courses, searchQuery]);

  // Drag and drop handlers
  const handleDragEnd = async (result) => {
    const { source, destination, type } = result;
    
    if (!destination) {
      setDragConfirm(null);
      return;
    }

    if (source.index === destination.index && source.droppableId === destination.droppableId) {
      setDragConfirm(null);
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

        // Update in Firestore - try subcollection first
        try {
          // Update lessons subcollection
          for (let i = 0; i < updatedLessons.length; i++) {
            const lesson = updatedLessons[i];
            const lessonRef = doc(db, "courses", courseId, "lessons", lesson.id);
            await updateDoc(lessonRef, { order: i + 1 });
          }
        } catch (subcollectionError) {
          // Fallback: update lessons array in course document
          await updateDoc(doc(db, "courses", courseId), {
            lessons: updatedLessons.map(l => ({
              ...l,
              // Remove resources from the array to keep course document clean
              resources: undefined
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

        // Update in Firestore - try subcollection first
        try {
          const lessonRef = doc(db, "courses", courseId, "lessons", lessonId);
          
          // Check if resources subcollection exists
          const resourcesRef = collection(db, "courses", courseId, "lessons", lessonId, "resources");
          const resourcesSnapshot = await getDocs(resourcesRef);
          
          if (!resourcesSnapshot.empty) {
            // Update resources subcollection
            for (let i = 0; i < updatedResources.length; i++) {
              const resource = updatedResources[i];
              const resourceRef = doc(db, "courses", courseId, "lessons", lessonId, "resources", resource.id);
              await updateDoc(resourceRef, { order: i + 1 });
            }
          } else {
            // Update resources array in lesson
            await updateDoc(lessonRef, { 
              resources: updatedResources,
              updatedAt: new Date()
            });
          }
        } catch (error) {
          console.log("Could not update resources subcollection, updating lesson directly");
          // Fallback: update lesson document with resources array
          const updatedLessons = course.lessons.map(l => 
            l.id === lessonId ? { ...l, resources: updatedResources } : l
          );
          
          await updateDoc(doc(db, "courses", courseId), {
            lessons: updatedLessons.map(l => ({
              ...l,
              resources: l.id === lessonId ? updatedResources : l.resources
            })),
            updatedAt: new Date()
          });
        }

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

  // Resource management
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
        createdAt: new Date()
      };

      // Handle file upload
      if (resourceForm.file) {
        const fileExtension = resourceForm.file.name.split('.').pop();
        const fileName = `${resourceId}.${fileExtension}`;
        const fileRef = ref(storage, `resources/${fileName}`);
        await uploadBytes(fileRef, resourceForm.file);
        const downloadURL = await getDownloadURL(fileRef);
        resourceData.url = downloadURL;
        resourceData.fileName = resourceForm.file.name;
        resourceData.size = `${(resourceForm.file.size / (1024 * 1024)).toFixed(2)} MB`;
      } else if (resourceForm.url) {
        resourceData.url = resourceForm.url;
      } else {
        throw new Error("Please provide either a file or URL");
      }

      // Add resource to Firestore
      try {
        // Try to add to resources subcollection first
        const resourceRef = doc(db, "courses", courseId, "lessons", lessonId, "resources", resourceId);
        await setDoc(resourceRef, resourceData);
      } catch (subcollectionError) {
        console.log("Could not add to resources subcollection, adding to lesson document");
        
        // Fallback: Add to lesson's resources array
        const course = courses.find(c => c.id === courseId);
        if (!course) throw new Error("Course not found");
        
        const lesson = course.lessons.find(l => l.id === lessonId);
        if (!lesson) throw new Error("Lesson not found");
        
        const updatedResources = [...(lesson.resources || []), resourceData];
        const updatedLessons = course.lessons.map(l => 
          l.id === lessonId ? { ...l, resources: updatedResources } : l
        );

        await updateDoc(doc(db, "courses", courseId), {
          lessons: updatedLessons,
          updatedAt: new Date()
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
      
      setError(null);
      
    } catch (error) {
      console.error("Error adding resource:", error);
      setError(`Failed to add resource: ${error.message}`);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteResource = async (courseId, lessonId, resourceId, resourceUrl) => {
    if (!window.confirm("Are you sure you want to delete this resource?")) return;

    try {
      setError(null);
      
      // Delete file from storage if it's an uploaded file
      if (resourceUrl && resourceUrl.includes("firebasestorage.googleapis.com")) {
        try {
          const fileRef = ref(storage, resourceUrl);
          await deleteObject(fileRef);
        } catch (storageError) {
          console.log("File not found in storage, continuing with deletion");
        }
      }

      // Delete from Firestore
      try {
        // Try to delete from resources subcollection
        const resourceRef = doc(db, "courses", courseId, "lessons", lessonId, "resources", resourceId);
        await deleteDoc(resourceRef);
      } catch (subcollectionError) {
        // Fallback: Remove from lesson's resources array
        const course = courses.find(c => c.id === courseId);
        if (!course) throw new Error("Course not found");
        
        const lesson = course.lessons.find(l => l.id === lessonId);
        if (!lesson) throw new Error("Lesson not found");
        
        const updatedResources = lesson.resources.filter(r => r.id !== resourceId);
        const updatedLessons = course.lessons.map(l => 
          l.id === lessonId ? { ...l, resources: updatedResources } : l
        );

        await updateDoc(doc(db, "courses", courseId), {
          lessons: updatedLessons,
          updatedAt: new Date()
        });
      }

      await fetchCourses();
      
    } catch (error) {
      console.error("Error deleting resource:", error);
      setError(`Failed to delete resource: ${error.message}`);
    }
  };

  // Lesson management
  const handleAddLesson = async () => {
    if (!selectedCourseForLesson || !lessonForm.title.trim()) {
      setError("Please fill in lesson title");
      return;
    }

    try {
      setError(null);
      
      const lessonId = uuidv4();
      const courseId = selectedCourseForLesson.id;
      const newLesson = {
        id: lessonId,
        title: lessonForm.title,
        description: lessonForm.description,
        duration: lessonForm.duration || "0 min",
        isPublished: lessonForm.isPublished,
        order: selectedCourseForLesson.lessons?.length || 0,
        createdAt: new Date(),
        resources: []
      };

      // Add lesson to Firestore
      try {
        // Try to add to lessons subcollection first
        const lessonRef = doc(db, "courses", courseId, "lessons", lessonId);
        await setDoc(lessonRef, newLesson);
      } catch (subcollectionError) {
        console.log("Could not add to lessons subcollection, adding to course document");
        // Fallback: Add to course's lessons array
        const updatedLessons = [...(selectedCourseForLesson.lessons || []), newLesson];
        
        await updateDoc(doc(db, "courses", courseId), {
          lessons: updatedLessons,
          updatedAt: new Date()
        });
      }

      // Reset form and close modal
      setLessonForm({
        title: "",
        description: "",
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
      const lesson = course.lessons.find(l => l.id === lessonId);
      
      if (!lesson) throw new Error("Lesson not found");
      
      // Delete all resource files from storage
      if (lesson.resources) {
        for (const resource of lesson.resources) {
          if (resource.url && resource.url.includes("firebasestorage.googleapis.com")) {
            try {
              const fileRef = ref(storage, resource.url);
              await deleteObject(fileRef);
            } catch (storageError) {
              console.log(`Could not delete file for resource ${resource.id}`);
            }
          }
        }
      }

      // Delete from Firestore
      try {
        // Try to delete lesson document from subcollection
        const lessonRef = doc(db, "courses", courseId, "lessons", lessonId);
        await deleteDoc(lessonRef);
      } catch (subcollectionError) {
        // Fallback: Remove from course's lessons array
        const updatedLessons = course.lessons.filter(l => l.id !== lessonId);
        
        await updateDoc(doc(db, "courses", courseId), {
          lessons: updatedLessons,
          updatedAt: new Date()
        });
      }

      await fetchCourses();
      
    } catch (error) {
      console.error("Error deleting lesson:", error);
      setError(`Failed to delete lesson: ${error.message}`);
    }
  };

  const toggleLessonPublish = async (courseId, lessonId, currentStatus) => {
    try {
      setError(null);
      
      // Update in Firestore
      try {
        // Try to update in subcollection
        const lessonRef = doc(db, "courses", courseId, "lessons", lessonId);
        await updateDoc(lessonRef, { 
          isPublished: !currentStatus,
          updatedAt: new Date()
        });
      } catch (subcollectionError) {
        // Fallback: Update in course document
        const course = courses.find(c => c.id === courseId);
        const updatedLessons = course.lessons.map(lesson => 
          lesson.id === lessonId ? { ...lesson, isPublished: !currentStatus } : lesson
        );

        await updateDoc(doc(db, "courses", courseId), {
          lessons: updatedLessons,
          updatedAt: new Date()
        });
      }

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
    
    if (!allowedTypes.includes(fileType) && !file.type.includes('pdf')) {
      setError("Invalid file type. Please upload video, image, or PDF files.");
      return;
    }

    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      setError("File size too large. Maximum size is 100MB.");
      return;
    }

    setResourceForm(prev => ({
      ...prev,
      file,
      type: fileType === 'video' ? 'video' : 
            fileType === 'image' ? 'image' : 
            file.type.includes('pdf') ? 'pdf' : 'other',
      name: file.name
    }));
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

    return { totalCourses, totalLessons, totalResources, publishedLessons };
  }, [courses]);

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

      {/* Modals - Keep your existing modal code, but update the select options */}
      {showAddResourceModal && selectedLessonForResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* ... existing modal content ... */}
          </div>
        </div>
      )}

      {showAddLessonModal && selectedCourseForLesson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            {/* ... existing modal content ... */}
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
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.filter(cat => cat !== 'all').map((category) => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
            <button 
              onClick={fetchCourses}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Filter size={20} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800">Total Courses</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.totalCourses}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800">Total Lessons</h3>
            <p className="text-3xl font-bold text-green-600">{stats.totalLessons}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-800">Total Resources</h3>
            <p className="text-3xl font-bold text-purple-600">{stats.totalResources}</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg">
            <h3 className="font-semibold text-amber-800">Published</h3>
            <p className="text-3xl font-bold text-amber-600">{stats.publishedLessons}</p>
            <p className="text-sm text-amber-700">lessons published</p>
          </div>
        </div>
      </div>

      {/* Course Structure */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Course Structure</h3>
              <p className="text-gray-600">Drag and drop to reorder lessons and resources</p>
            </div>
            <button
              onClick={fetchCourses}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
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
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-lg">{course.title}</h4>
                          {course.category && (
                            <span className={`px-2 py-1 text-xs font-medium rounded ${getCategoryColor(course.category)}`}>
                              {course.category}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm">
                          {course.lessons?.length || 0} lessons • 
                          {course.lessons?.filter(l => l.isPublished !== false).length || 0} published
                        </p>
                        {course.description && (
                          <p className="text-gray-600 text-sm mt-1">{course.description}</p>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedCourseForLesson(course);
                        setShowAddLessonModal(true);
                      }}
                      className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center gap-1 whitespace-nowrap"
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
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleLessonPublish(course.id, lesson.id, lesson.isPublished);
                                              }}
                                              className={`px-2 py-1 text-xs rounded ${
                                                lesson.isPublished !== false 
                                                  ? 'bg-green-100 text-green-800' 
                                                  : 'bg-gray-100 text-gray-800'
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
                                          <p className="text-sm text-gray-600 ml-6 mt-1">{lesson.description}</p>
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

                                  {/* Resources Section */}
                                  {expandedLessons[lesson.id] && (
                                    <div className="p-4 bg-white border-t">
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
                                                        <div {...provided.dragHandleProps} className="cursor-move">
                                                          <Move className="text-gray-400 hover:text-gray-600" size={16} />
                                                        </div>
                                                        <div className="p-2 bg-gray-100 rounded">
                                                          {getResourceIcon(resource.type)}
                                                        </div>
                                                        <div className="flex-1">
                                                          <p className="font-medium">{resource.name}</p>
                                                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                                                            <span className="uppercase">{resource.type}</span>
                                                            {resource.size && <span>• {resource.size}</span>}
                                                            {resource.createdAt && (
                                                              <span>• {new Date(resource.createdAt.seconds * 1000).toLocaleDateString()}</span>
                                                            )}
                                                          </div>
                                                          {resource.description && (
                                                            <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
                                                          )}
                                                        </div>
                                                      </div>
                                                      <div className="flex items-center gap-2">
                                                        {resource.url && (
                                                          <a 
                                                            href={resource.url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1"
                                                            title="View/download"
                                                          >
                                                            <Download size={14} />
                                                            {resource.type === 'link' ? 'Visit' : 'Download'}
                                                          </a>
                                                        )}
                                                        <button
                                                          onClick={() => handleDeleteResource(course.id, lesson.id, resource.id, resource.url)}
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
                        className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
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
    </div>
  );
}
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
  where
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
  FilePlus
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { storage } from "../firebase/config";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

export default function ContentLibrary() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
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

  // Fetch courses with error handling
  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let q;
      if (filterType !== "all") {
        q = query(collection(db, "courses"), 
          where("category", "==", filterType),
          orderBy("createdAt", "desc")
        );
      } else {
        q = query(collection(db, "courses"), orderBy("createdAt", "desc"));
      }
      
      const snapshot = await getDocs(q);
      const coursesData = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            lessons: data.lessons?.map(lesson => ({
              ...lesson,
              resources: lesson.resources || []
            })) || []
          };
        })
      );
      
      setCourses(coursesData);
    } catch (err) {
      console.error("Error fetching courses:", err);
      setError("Failed to load courses. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

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

  // Drag and drop with confirmation
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

    // Show confirmation for significant moves
    if (Math.abs(source.index - destination.index) > 2) {
      setDragConfirm({ result, type });
      return;
    }

    await performDragOperation(result);
  };

  const confirmDragOperation = async () => {
    if (!dragConfirm) return;
    await performDragOperation(dragConfirm.result);
    setDragConfirm(null);
  };

  const performDragOperation = async (result) => {
    const { source, destination, type } = result;

    try {
      if (type === "LESSON") {
        const courseId = source.droppableId;
        const course = courses.find(c => c.id === courseId);
        
        if (!course) return;

        const reorderedLessons = Array.from(course.lessons);
        const [movedLesson] = reorderedLessons.splice(source.index, 1);
        reorderedLessons.splice(destination.index, 0, movedLesson);

        // Update order numbers
        const updatedLessons = reorderedLessons.map((lesson, index) => ({
          ...lesson,
          order: index + 1
        }));

        await updateDoc(doc(db, "courses", courseId), {
          lessons: updatedLessons,
          updatedAt: new Date()
        });

        setCourses(prev => prev.map(c => 
          c.id === courseId ? { ...c, lessons: updatedLessons } : c
        ));
      }
      
      if (type === "RESOURCE") {
        const [courseId, lessonId] = source.droppableId.split('_');
        const course = courses.find(c => c.id === courseId);
        
        if (!course) return;

        const lesson = course.lessons.find(l => l.id === lessonId);
        const reorderedResources = Array.from(lesson.resources || []);
        const [movedResource] = reorderedResources.splice(source.index, 1);
        reorderedResources.splice(destination.index, 0, movedResource);

        // Update order numbers
        const updatedResources = reorderedResources.map((resource, index) => ({
          ...resource,
          order: index + 1
        }));

        const updatedLessons = course.lessons.map(l => 
          l.id === lessonId ? { ...l, resources: updatedResources } : l
        );

        await updateDoc(doc(db, "courses", courseId), {
          lessons: updatedLessons,
          updatedAt: new Date()
        });

        setCourses(prev => prev.map(c => 
          c.id === courseId ? { ...c, lessons: updatedLessons } : c
        ));
      }
    } catch (error) {
      console.error("Error updating order:", error);
      setError("Failed to update order. Please try again.");
      // Revert to original order
      fetchCourses();
    }
  };

  // Resource management
  const handleAddResource = async () => {
    if (!selectedLessonForResource || !resourceForm.name.trim()) return;

    try {
      setUploadingFile(true);
      
      let resourceData = {
        id: uuidv4(),
        name: resourceForm.name,
        type: resourceForm.type,
        description: resourceForm.description || "",
        order: selectedLessonForResource.resources?.length || 0,
        createdAt: new Date()
      };

      // Handle file upload
      if (resourceForm.file) {
        const fileRef = ref(storage, `resources/${uuidv4()}_${resourceForm.file.name}`);
        await uploadBytes(fileRef, resourceForm.file);
        const downloadURL = await getDownloadURL(fileRef);
        resourceData.url = downloadURL;
        resourceData.fileName = resourceForm.file.name;
        resourceData.size = `${(resourceForm.file.size / (1024 * 1024)).toFixed(2)} MB`;
      } else if (resourceForm.url) {
        resourceData.url = resourceForm.url;
      }

      const courseId = selectedLessonForResource.courseId;
      const lessonId = selectedLessonForResource.id;
      
      const course = courses.find(c => c.id === courseId);
      const updatedLessons = course.lessons.map(lesson => 
        lesson.id === lessonId ? {
          ...lesson,
          resources: [...(lesson.resources || []), resourceData]
        } : lesson
      );

      await updateDoc(doc(db, "courses", courseId), {
        lessons: updatedLessons,
        updatedAt: new Date()
      });

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
      fetchCourses();
      
    } catch (error) {
      console.error("Error adding resource:", error);
      setError("Failed to add resource. Please try again.");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteResource = async (courseId, lessonId, resourceId, resourceUrl) => {
    if (!window.confirm("Are you sure you want to delete this resource?")) return;

    try {
      // Delete file from storage if it's an uploaded file
      if (resourceUrl && resourceUrl.includes("firebasestorage.googleapis.com")) {
        const fileRef = ref(storage, resourceUrl);
        await deleteObject(fileRef).catch(() => {
          // Continue even if file deletion fails
        });
      }

      const course = courses.find(c => c.id === courseId);
      const updatedLessons = course.lessons.map(lesson => 
        lesson.id === lessonId ? {
          ...lesson,
          resources: lesson.resources.filter(r => r.id !== resourceId)
        } : lesson
      );

      await updateDoc(doc(db, "courses", courseId), {
        lessons: updatedLessons,
        updatedAt: new Date()
      });

      fetchCourses();
    } catch (error) {
      console.error("Error deleting resource:", error);
      setError("Failed to delete resource. Please try again.");
    }
  };

  // Lesson management
  const handleAddLesson = async () => {
    if (!selectedCourseForLesson || !lessonForm.title.trim()) return;

    try {
      const newLesson = {
        id: uuidv4(),
        title: lessonForm.title,
        description: lessonForm.description,
        duration: lessonForm.duration || "0 min",
        isPublished: lessonForm.isPublished,
        order: selectedCourseForLesson.lessons?.length || 0,
        createdAt: new Date(),
        resources: []
      };

      const updatedLessons = [...(selectedCourseForLesson.lessons || []), newLesson];

      await updateDoc(doc(db, "courses", selectedCourseForLesson.id), {
        lessons: updatedLessons,
        updatedAt: new Date()
      });

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
      fetchCourses();
      
    } catch (error) {
      console.error("Error adding lesson:", error);
      setError("Failed to add lesson. Please try again.");
    }
  };

  const handleDeleteLesson = async (courseId, lessonId) => {
    if (!window.confirm("Are you sure you want to delete this lesson and all its resources?")) return;

    try {
      const course = courses.find(c => c.id === courseId);
      const lesson = course.lessons.find(l => l.id === lessonId);
      
      // Delete all resource files from storage
      if (lesson.resources) {
        for (const resource of lesson.resources) {
          if (resource.url && resource.url.includes("firebasestorage.googleapis.com")) {
            const fileRef = ref(storage, resource.url);
            await deleteObject(fileRef).catch(() => {
              // Continue even if file deletion fails
            });
          }
        }
      }

      const updatedLessons = course.lessons.filter(l => l.id !== lessonId);

      await updateDoc(doc(db, "courses", courseId), {
        lessons: updatedLessons,
        updatedAt: new Date()
      });

      fetchCourses();
    } catch (error) {
      console.error("Error deleting lesson:", error);
      setError("Failed to delete lesson. Please try again.");
    }
  };

  const toggleLessonPublish = async (courseId, lessonId, currentStatus) => {
    try {
      const course = courses.find(c => c.id === courseId);
      const updatedLessons = course.lessons.map(lesson => 
        lesson.id === lessonId ? { ...lesson, isPublished: !currentStatus } : lesson
      );

      await updateDoc(doc(db, "courses", courseId), {
        lessons: updatedLessons,
        updatedAt: new Date()
      });

      fetchCourses();
    } catch (error) {
      console.error("Error updating lesson status:", error);
      setError("Failed to update lesson status. Please try again.");
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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2">Loading content library...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
          <button onClick={() => setError(null)}>
            <X className="h-5 w-5 text-red-600" />
          </button>
        </div>
      )}

      {/* Drag Confirmation Modal */}
      {dragConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Confirm Move</h3>
            <p className="text-gray-600 mb-4">
              You're moving this {dragConfirm.type.toLowerCase()} to position {dragConfirm.result.destination.index + 1}. 
              This will update the order for all items.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDragConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDragOperation}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Check size={16} />
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Resource Modal */}
      {showAddResourceModal && selectedLessonForResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Resource</h3>
              <button onClick={() => setShowAddResourceModal(false)}>
                <X className="h-5 w-5" />
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter resource name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resource Type
                </label>
                <select
                  value={resourceForm.type}
                  onChange={(e) => setResourceForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pdf">PDF Document</option>
                  <option value="video">Video</option>
                  <option value="image">Image</option>
                  <option value="link">External Link</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-800 font-medium">
                      Click to upload
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      or drag and drop (Max 100MB)
                    </p>
                  </label>
                  {resourceForm.file && (
                    <p className="text-sm text-green-600 mt-2">
                      {resourceForm.file.name} selected
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Or enter URL
                </label>
                <input
                  type="url"
                  value={resourceForm.url}
                  onChange={(e) => setResourceForm(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Brief description of this resource"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddResourceModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={uploadingFile}
              >
                Cancel
              </button>
              <button
                onClick={handleAddResource}
                disabled={!resourceForm.name.trim() || uploadingFile}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploadingFile ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Add Resource
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lesson Modal */}
      {showAddLessonModal && selectedCourseForLesson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Lesson to {selectedCourseForLesson.title}</h3>
              <button onClick={() => setShowAddLessonModal(false)}>
                <X className="h-5 w-5" />
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter lesson title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={lessonForm.description}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Brief description of this lesson"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Duration
                </label>
                <input
                  type="text"
                  value={lessonForm.duration}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, duration: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 30 min, 1 hour"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublished"
                  checked={lessonForm.isPublished}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, isPublished: e.target.checked }))}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isPublished" className="text-sm text-gray-700">
                  Publish immediately
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddLessonModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLesson}
                disabled={!lessonForm.title.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Lesson
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Content Library</h2>
            <p className="text-gray-600">Organize courses, lessons, and resources</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => {
                setSelectedCourseForLesson(courses[0]);
                setShowAddLessonModal(true);
              }}
              disabled={courses.length === 0}
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
              <option value="all">All Types</option>
              <option value="video">Video Courses</option>
              <option value="document">Document Courses</option>
              <option value="interactive">Interactive Courses</option>
            </select>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Filter size={20} />
              Filter
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No courses found</h3>
              <p className="text-gray-600">
                {searchQuery ? "Try a different search term" : "No courses available yet"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredCourses.map((course) => (
                <div key={course.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Folder className="text-blue-600" size={24} />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-lg">{course.title}</h4>
                          {course.category && (
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                              {course.category}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm">
                          {course.lessons?.length || 0} lessons • 
                          {course.lessons?.filter(l => l.isPublished !== false).length || 0} published • 
                          {course.enrolledStudents || 0} students
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedCourseForLesson(course);
                        setShowAddLessonModal(true);
                      }}
                      className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Add Lesson
                    </button>
                  </div>

                  <Droppable droppableId={course.id} type="LESSON">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-3 ${snapshot.isDraggingOver ? 'bg-blue-50 p-3 rounded-lg' : ''}`}
                      >
                        {course.lessons?.map((lesson, lessonIndex) => (
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
                                <div className="bg-gray-50 p-4 flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1">
                                    <div {...provided.dragHandleProps}>
                                      <GripVertical className="text-gray-400 cursor-move hover:text-gray-600" />
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
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold">Lesson {lesson.order || lessonIndex + 1}: {lesson.title}</span>
                                          {lesson.duration && (
                                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
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
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">
                                      {lesson.resources?.length || 0} resources
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <button 
                                        onClick={() => toggleLessonExpansion(lesson.id)}
                                        className="p-1 hover:bg-gray-200 rounded"
                                      >
                                        {expandedLessons[lesson.id] ? 'Hide' : 'Show'}
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedLessonForResource({ ...lesson, courseId: course.id });
                                          setShowAddResourceModal(true);
                                        }}
                                        className="p-1 hover:bg-blue-100 text-blue-600 rounded"
                                        title="Add resource"
                                      >
                                        <FilePlus size={16} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteLesson(course.id, lesson.id)}
                                        className="p-1 hover:bg-red-100 text-red-600 rounded"
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
                                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 flex items-center gap-1"
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
                                                    className={`flex items-center justify-between p-3 border rounded hover:bg-gray-50 ${
                                                      snapshot.isDragging 
                                                        ? 'border-blue-500 shadow-md' 
                                                        : 'border-gray-200'
                                                    }`}
                                                  >
                                                    <div className="flex items-center gap-3">
                                                      <div {...provided.dragHandleProps}>
                                                        <Move className="text-gray-400 cursor-move hover:text-gray-600" size={16} />
                                                      </div>
                                                      <div className="p-2 bg-gray-100 rounded">
                                                        {getResourceIcon(resource.type)}
                                                      </div>
                                                      <div>
                                                        <p className="font-medium">{resource.name}</p>
                                                        <div className="flex items-center gap-2 text-sm text-gray-500">
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
                                                          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1"
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
                </div>
              ))}
            </div>
          )}
        </div>
      </DragDropContext>
    </div>
  );
}
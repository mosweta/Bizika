// src/components/admin/CourseManager.jsx
import { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase/config";
import { getFunctions, httpsCallable } from "firebase/functions";

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Eye,
  BookOpen, 
  EyeOff, 
  Upload,
  Youtube,
  FileText,
  X,
  Check,
  Image as ImageIcon,
  Loader2,
  Download,
  File,
  FileSpreadsheet,
  Presentation,
  Folder,
  Link,
  Grid,
  List,
  Cloud,
  ExternalLink
} from "lucide-react";

// Import R2 Service
import R2Service from "/../Users/Deogracious/Bizika/bizika/src/services/r2service";

// File type mapping
const FILE_TYPES = {
  pdf: { icon: FileText, color: "text-red-600", bgColor: "bg-red-50" },
  doc: { icon: FileText, color: "text-blue-600", bgColor: "bg-blue-50" },
  docx: { icon: FileText, color: "text-blue-600", bgColor: "bg-blue-50" },
  xls: { icon: FileSpreadsheet, color: "text-green-600", bgColor: "bg-green-50" },
  xlsx: { icon: FileSpreadsheet, color: "text-green-600", bgColor: "bg-green-50" },
  ppt: { icon: Presentation, color: "text-orange-600", bgColor: "bg-orange-50" },
  pptx: { icon: Presentation, color: "text-orange-600", bgColor: "bg-orange-50" },
  zip: { icon: Folder, color: "text-purple-600", bgColor: "bg-purple-50" },
  jpg: { icon: ImageIcon, color: "text-pink-600", bgColor: "bg-pink-50" },
  jpeg: { icon: ImageIcon, color: "text-pink-600", bgColor: "bg-pink-50" },
  png: { icon: ImageIcon, color: "text-pink-600", bgColor: "bg-pink-50" },
  gif: { icon: ImageIcon, color: "text-pink-600", bgColor: "bg-pink-50" },
  mp4: { icon: File, color: "text-indigo-600", bgColor: "bg-indigo-50" },
  webm: { icon: File, color: "text-indigo-600", bgColor: "bg-indigo-50" },
  default: { icon: File, color: "text-gray-600", bgColor: "bg-gray-50" }
};

// Image compression utility
const compressImage = (file, options = {}) => {
  return new Promise((resolve) => {
    resolve(file);
  });
};

// Helper function to get file type
const getFileType = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  return FILE_TYPES[ext] ? ext : 'default';
};

// Helper function to get file icon
const FileIcon = ({ type, className = "h-5 w-5" }) => {
  const IconComponent = FILE_TYPES[type]?.icon || File;
  return <IconComponent className={className} />;
};

export default function CourseManager() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddLessonModal, setShowAddLessonModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [mobileView, setMobileView] = useState(false);
  const [activeDownloading, setActiveDownloading] = useState(null);
  const fileInputRef = useRef(null);
  
  // Firebase Functions
  const functions = getFunctions();

  // Detect mobile view
  useEffect(() => {
    const checkMobile = () => {
      setMobileView(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setViewMode("list");
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Form states
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    category: "",
    price: 0,
    isFree: true,
    duration: "",
    level: "beginner"
  });

  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    videoUrl: "",
    videoType: "youtube",
    duration: "",
    slides: [],
    documents: [],
    templates: [],
    resources: [],
    order: 1
  });

  const [courseImage, setCourseImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editImage, setEditImage] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  
  // New resource state
  const [newResource, setNewResource] = useState({
    name: "",
    file: null,
    type: "document",
    category: "document",
    description: "",
    downloadable: true,
    viewable: true
  });

  // Fetch courses on mount
  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const coursesRef = collection(db, "courses");
      const q = query(coursesRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const coursesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(coursesData);
    } catch (error) {
      console.error("Error fetching courses:", error);
      alert("Failed to load courses. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  // Simulate upload progress
  const simulateUploadProgress = () => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return prev;
        }
        return prev + Math.random() * 10;
      });
    }, 200);
    return interval;
  };

  // Handle file upload to R2
  const handleFileUpload = async (file) => {
    try {
      // Upload to R2
      const uploadedFile = await R2Service.uploadFile(file, 'course-resources');
      
      return {
        url: uploadedFile.url,
        key: uploadedFile.key,
        name: uploadedFile.originalName,
        fileName: uploadedFile.fileName,
        size: uploadedFile.size,
        type: uploadedFile.type,
        uploadedAt: uploadedFile.uploadedAt,
        publicUrl: uploadedFile.publicUrl,
      };
    } catch (error) {
      console.error("Error uploading to R2:", error);
      throw error;
    }
  };

  // Add resource to lesson with R2 upload
  const handleAddResource = async () => {
    if (!newResource.name || !newResource.file) {
      alert("Please provide a resource name and select a file");
      return;
    }

    try {
      setUploading(true);
      const progressInterval = simulateUploadProgress();
      
      // Upload file to R2
      const uploadedFile = await handleFileUpload(newResource.file);
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      const resource = {
        ...uploadedFile,
        category: newResource.category,
        description: newResource.description,
        downloadable: newResource.downloadable,
        viewable: newResource.viewable,
        addedAt: new Date().toISOString()
      };

      // Add to appropriate category
      const categoryKey = newResource.category === 'slides' ? 'slides' :
                         newResource.category === 'template' ? 'templates' : 'documents';
      
      setLessonForm(prev => ({
        ...prev,
        [categoryKey]: [...prev[categoryKey], resource]
      }));

      // Reset form
      setNewResource({
        name: "",
        file: null,
        type: "document",
        category: "document",
        description: "",
        downloadable: true,
        viewable: true
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setUploadProgress(0);
      alert("✅ Resource uploaded successfully to Cloudflare R2!");

    } catch (error) {
      console.error("Error adding resource:", error);
      alert(`Failed to add resource: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Remove resource (with optional R2 deletion)
  const removeResource = async (category, index) => {
    const resource = lessonForm[category][index];
    
    // Ask if user wants to delete from R2 as well
    if (resource.key && window.confirm("Delete this file from Cloudflare R2 storage as well?")) {
      try {
        await R2Service.deleteFile(resource.key);
        console.log("✅ File deleted from R2");
      } catch (error) {
        console.error("Error deleting from R2:", error);
        alert("File removed from list but could not delete from storage");
      }
    }
    
    // Remove from local state
    setLessonForm(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index)
    }));
  };

  // Calculate total resources
  const getTotalResources = () => {
    return lessonForm.slides.length + lessonForm.documents.length + lessonForm.templates.length;
  };

  // Download resource from R2
  const downloadResource = async (resource) => {
    try {
      setActiveDownloading(resource.key);
      
      // Get fresh signed URL from Cloud Function
      const generateUrlFunction = httpsCallable(functions, 'generateResourceUrl');
      const result = await generateUrlFunction({ 
        fileKey: resource.key || resource.fileName,
        expiresIn: 3600 
      });
      
      const url = result.data.url;
      
      // Trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = resource.name || resource.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => {
        setActiveDownloading(null);
      }, 1000);
      
    } catch (error) {
      console.error("Error downloading resource:", error);
      alert("Failed to download file. Please try again.");
      setActiveDownloading(null);
    }
  };

  // Preview resource (open in new tab)
  const previewResource = async (resource) => {
    try {
      setActiveDownloading(resource.key);
      
      // Get fresh signed URL from Cloud Function
      const generateUrlFunction = httpsCallable(functions, 'generateResourceUrl');
      const result = await generateUrlFunction({ 
        fileKey: resource.key || resource.fileName,
        expiresIn: 3600 
      });
      
      const url = result.data.url;
      
      // Open in new tab
      window.open(url, '_blank');
      
      setTimeout(() => {
        setActiveDownloading(null);
      }, 1000);
      
    } catch (error) {
      console.error("Error previewing resource:", error);
      alert("Failed to preview file. Please try again.");
      setActiveDownloading(null);
    }
  };

  // Render resource list with R2 integration
  const renderResourceList = (resources, category) => {
    if (resources.length === 0) {
      return (
        <div className="text-center py-4">
          <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No {category} yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {resources.map((resource, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`p-2 rounded ${FILE_TYPES[resource.type]?.bgColor || 'bg-gray-100'}`}>
                <FileIcon type={resource.type} className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {resource.name || resource.originalName}
                  </p>
                  {resource.key && (
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                      <Cloud size={10} />
                      <span className="hidden sm:inline">R2</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                  <span className="capitalize">{resource.category}</span>
                  <span>•</span>
                  <span>{resource.type?.toUpperCase() || 'FILE'}</span>
                  <span>•</span>
                  <span>{resource.size}</span>
                </div>
                {resource.description && (
                  <p className="text-xs text-gray-600 mt-1 truncate">{resource.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {resource.viewable !== false && (
                <button
                  type="button"
                  onClick={() => previewResource(resource)}
                  disabled={activeDownloading === resource.key}
                  className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center gap-1 disabled:opacity-50"
                  title="Preview"
                >
                  {activeDownloading === resource.key ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ExternalLink size={12} />
                  )}
                  <span className="hidden sm:inline">Preview</span>
                </button>
              )}
              {resource.downloadable !== false && (
                <button
                  type="button"
                  onClick={() => downloadResource(resource)}
                  disabled={activeDownloading === resource.key}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1 disabled:opacity-50"
                  title="Download from Cloudflare R2"
                >
                  {activeDownloading === resource.key ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download size={12} />
                  )}
                  <span className="hidden sm:inline">Download</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => removeResource(category, index)}
                className="ml-2 p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                aria-label={`Remove ${resource.name}`}
                title="Delete"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const handleImageUpload = async (e, isEdit = false) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      alert('Please select an image file (JPG, PNG, etc.)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      
      const compressedFile = await compressImage(file, {
        maxWidth: 1280,
        maxHeight: 720,
        quality: 0.7
      });
      
      if (isEdit) {
        setEditImage(compressedFile);
      } else {
        setCourseImage(compressedFile);
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEdit) {
          setEditImagePreview(reader.result);
        } else {
          setImagePreview(reader.result);
        }
        setUploading(false);
      };
      reader.readAsDataURL(compressedFile);
      
    } catch (error) {
      console.error("Error processing image:", error);
      alert("Error processing image. Please try another image.");
      setUploading(false);
    }
  };

  const uploadCourseImage = async (courseId, imageFile) => {
    if (!imageFile) return null;

    try {
      // Upload to Firebase Storage (for thumbnails)
      const timestamp = Date.now();
      const storagePath = `courses/${courseId}/thumbnail_${timestamp}.jpg`;
      const storageRef = ref(storage, storagePath);
      
      await uploadBytes(storageRef, imageFile);
      
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (loading || uploading) return;

    if (!courseImage) {
      alert("Please upload a course thumbnail");
      return;
    }

    try {
      setLoading(true);

      const courseData = {
        ...courseForm,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        published: false,
        enrolledCount: 0,
        lessonCount: 0,
        rating: 0,
        status: "draft"
      };

      const courseRef = await addDoc(collection(db, "courses"), courseData);
      const courseId = courseRef.id;

      let thumbnailUrl = null;
      try {
        thumbnailUrl = await uploadCourseImage(courseId, courseImage);
      } catch (uploadError) {
        console.error("Error uploading thumbnail:", uploadError);
        await deleteDoc(doc(db, "courses", courseId));
        alert("Failed to upload thumbnail. Please try again.");
        setLoading(false);
        return;
      }

      const courseDocRef = doc(db, "courses", courseId);
      await updateDoc(courseDocRef, {
        thumbnailUrl,
        updatedAt: serverTimestamp()
      });

      alert("✅ Course created successfully!");
      setShowCreateModal(false);
      resetCourseForm();
      fetchCourses();
    } catch (error) {
      console.error("Error creating course:", error);
      alert("Error creating course. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    if (!selectedCourse || loading) return;

    try {
      setLoading(true);

      const lessonData = {
        title: lessonForm.title,
        description: lessonForm.description,
        videoUrl: lessonForm.videoUrl,
        videoType: lessonForm.videoType,
        duration: lessonForm.duration,
        order: lessonForm.order,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isPublished: true,
        slides: lessonForm.slides.map(r => ({
          ...r,
          storageType: 'r2'
        })),
        documents: lessonForm.documents.map(r => ({
          ...r,
          storageType: 'r2'
        })),
        templates: lessonForm.templates.map(r => ({
          ...r,
          storageType: 'r2'
        })),
        resources: [
          ...lessonForm.slides.map(r => ({ ...r, storageType: 'r2' })),
          ...lessonForm.documents.map(r => ({ ...r, storageType: 'r2' })),
          ...lessonForm.templates.map(r => ({ ...r, storageType: 'r2' }))
        ]
      };

      const lessonsRef = collection(db, "courses", selectedCourse.id, "lessons");
      await addDoc(lessonsRef, lessonData);

      const courseRef = doc(db, "courses", selectedCourse.id);
      await updateDoc(courseRef, {
        lessonCount: selectedCourse.lessonCount + 1,
        updatedAt: serverTimestamp()
      });

      alert("✅ Lesson added successfully with R2 resources!");
      setShowAddLessonModal(false);
      resetLessonForm();
      fetchCourses();
    } catch (error) {
      console.error("Error adding lesson:", error);
      alert("Error adding lesson. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const togglePublishCourse = async (course) => {
    if (loading) return;

    if (!course.thumbnailUrl && !course.published) {
      alert("Please add a thumbnail before publishing the course.");
      return;
    }

    try {
      setLoading(true);
      
      const courseRef = doc(db, "courses", course.id);
      await updateDoc(courseRef, {
        published: !course.published,
        status: !course.published ? "published" : "draft",
        updatedAt: serverTimestamp()
      });
      
      alert(`Course ${!course.published ? 'published' : 'unpublished'} successfully!`);
      fetchCourses();
    } catch (error) {
      console.error("Error toggling publish status:", error);
      alert("Failed to update course status.");
    } finally {
      setLoading(false);
    }
  };

  const updateCourseThumbnail = async () => {
    if (!editingCourse || !editImage || loading) return;

    try {
      setLoading(true);
      
      const newThumbnailUrl = await uploadCourseImage(editingCourse.id, editImage);
      
      const courseRef = doc(db, "courses", editingCourse.id);
      await updateDoc(courseRef, {
        thumbnailUrl: newThumbnailUrl,
        updatedAt: serverTimestamp()
      });
      
      alert("✅ Thumbnail updated successfully!");
      
      setEditImage(null);
      setEditImagePreview(null);
      fetchCourses();
    } catch (error) {
      console.error("Error updating thumbnail:", error);
      alert("Failed to update thumbnail. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const deleteCourse = async (courseId) => {
    if (loading) return;

    if (!confirm("Are you sure you want to delete this course? This action cannot be undone and will delete all associated resources from Cloudflare R2.")) {
      return;
    }

    try {
      setLoading(true);
      
      // Optionally clean up R2 resources first
      if (window.confirm("Also delete all associated files from Cloudflare R2 storage?")) {
        try {
          const cleanupFunction = httpsCallable(functions, 'cleanupCourseResources');
          await cleanupFunction({ courseId });
          console.log("✅ R2 resources cleaned up");
        } catch (cleanupError) {
          console.error("Error cleaning up R2 resources:", cleanupError);
          // Continue with course deletion even if cleanup fails
        }
      }
      
      // Delete course from Firestore
      await deleteDoc(doc(db, "courses", courseId));
      
      alert("✅ Course deleted successfully!");
      setConfirmDelete(null);
      fetchCourses();
    } catch (error) {
      console.error("Error deleting course:", error);
      alert("Failed to delete course.");
    } finally {
      setLoading(false);
    }
  };

  const resetCourseForm = () => {
    setCourseForm({
      title: "",
      description: "",
      category: "",
      price: 0,
      isFree: true,
      duration: "",
      level: "beginner"
    });
    setCourseImage(null);
    setImagePreview(null);
  };

  const resetLessonForm = () => {
    setLessonForm({
      title: "",
      description: "",
      videoUrl: "",
      videoType: "youtube",
      duration: "",
      slides: [],
      documents: [],
      templates: [],
      resources: [],
      order: 1
    });
    setNewResource({
      name: "",
      file: null,
      type: "document",
      category: "document",
      description: "",
      downloadable: true,
      viewable: true
    });
    setUploadProgress(0);
  };

  const resetEditForm = () => {
    setEditingCourse(null);
    setEditImage(null);
    setEditImagePreview(null);
  };

  const getCategoryColor = (category) => {
    const colors = {
      business: "bg-blue-100 text-blue-800",
      technology: "bg-purple-100 text-purple-800",
      marketing: "bg-green-100 text-green-800",
      finance: "bg-yellow-100 text-yellow-800",
      entrepreneurship: "bg-pink-100 text-pink-800",
      leadership: "bg-indigo-100 text-indigo-800",
      fitness: "bg-red-100 text-red-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Course Management</h3>
          <p className="text-sm text-gray-600">Create and manage your courses with Cloudflare R2 storage</p>
        </div>
        
        <div className="flex items-center gap-3">
          {!mobileView && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded ${viewMode === "list" ? "bg-white shadow" : "hover:bg-gray-200"}`}
                title="List View"
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded ${viewMode === "grid" ? "bg-white shadow" : "hover:bg-gray-200"}`}
                title="Grid View"
              >
                <Grid size={16} />
              </button>
            </div>
          )}
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Create Course</span>
            <span className="sm:hidden">Create</span>
          </button>
        </div>
      </div>

      {/* Cloudflare R2 Status */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cloud className="h-6 w-6 text-blue-600" />
            <div>
              <h4 className="font-medium text-gray-900">Cloudflare R2 Storage</h4>
              <p className="text-sm text-gray-600">Course resources are stored securely in Cloudflare R2</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
            Active
          </span>
        </div>
      </div>

      {/* Course stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg p-3 shadow border">
          <div className="text-xl font-bold text-gray-900">{courses.length}</div>
          <div className="text-xs text-gray-600">Total Courses</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow border">
          <div className="text-xl font-bold text-green-600">
            {courses.filter(c => c.published).length}
          </div>
          <div className="text-xs text-gray-600">Published</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow border">
          <div className="text-xl font-bold text-yellow-600">
            {courses.filter(c => !c.published).length}
          </div>
          <div className="text-xs text-gray-600">Draft</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow border">
          <div className="text-xl font-bold text-blue-600">
            {courses.reduce((sum, course) => sum + (course.enrolledCount || 0), 0)}
          </div>
          <div className="text-xs text-gray-600">Total Enrollments</div>
        </div>
      </div>

      {/* Courses display */}
      {viewMode === "grid" && !mobileView ? (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading && !courses.length ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-2" />
              <p className="text-sm text-gray-600">Loading courses...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No courses yet</h3>
              <p className="text-gray-600 mb-4">Create your first course to get started</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
              >
                <Plus size={16} />
                Create Course
              </button>
            </div>
          ) : (
            courses.map((course) => (
              <div key={course.id} className="bg-white rounded-xl shadow border overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative">
                  {course.thumbnailUrl ? (
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      className="w-full h-40 object-cover"
                    />
                  ) : (
                    <div className="w-full h-40 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-white" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${course.published ? "bg-green-600" : "bg-yellow-600"} text-white`}>
                      {course.published ? "Published" : "Draft"}
                    </span>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 line-clamp-2">{course.title}</h4>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(course.category)}`}>
                      {course.category || "Uncategorized"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {course.lessonCount || 0} lessons
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                    <span>{course.enrolledCount || 0} students</span>
                    <span>{course.duration || "Self-paced"}</span>
                  </div>
                  
                  <div className="flex items-center justify-between border-t pt-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => togglePublishCourse(course)}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                        title={course.published ? "Unpublish" : "Publish"}
                      >
                        {course.published ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCourse(course);
                          setShowAddLessonModal(true);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                        title="Add Lesson"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingCourse(course);
                          setShowEditModal(true);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deleteCourse(course.id)}
                        className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        // List View (default, especially on mobile)
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lessons
                  </th>
                  <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Students
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading && !courses.length ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-2" />
                        <p className="text-sm text-gray-600">Loading courses...</p>
                      </div>
                    </td>
                  </tr>
                ) : courses.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <BookOpen className="h-12 w-12 text-gray-400 mb-3" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">No courses yet</h3>
                        <p className="text-gray-600 mb-4">Create your first course to get started</p>
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                          <Plus size={16} />
                          Create Course
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  courses.map((course) => (
                    <tr key={course.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 rounded-lg overflow-hidden">
                            {course.thumbnailUrl ? (
                              <img
                                src={course.thumbnailUrl}
                                alt={course.title}
                                className="h-10 w-10 object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                <BookOpen className="h-5 w-5 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {course.title}
                              {!course.thumbnailUrl && (
                                <span className="ml-1 text-xs text-red-600">(No thumbnail)</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 truncate max-w-[150px] sm:max-w-xs">
                              {course.description?.substring(0, 60)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(course.category)}`}>
                          {course.category || "Uncategorized"}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-4 py-4 text-sm text-gray-900">
                        {course.lessonCount || 0}
                      </td>
                      <td className="hidden lg:table-cell px-4 py-4 text-sm text-gray-900">
                        {course.enrolledCount || 0}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          course.published
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {course.published ? "Live" : "Draft"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => togglePublishCourse(course)}
                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                            title={course.published ? "Unpublish" : "Publish"}
                          >
                            {course.published ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCourse(course);
                              setShowAddLessonModal(true);
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                            title="Add Lesson"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingCourse(course);
                              setShowEditModal(true);
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => deleteCourse(course.id)}
                            className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Lesson Modal with Enhanced Resources */}
      {showAddLessonModal && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-xl sm:rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">Add New Lesson</h3>
                  <p className="text-sm text-gray-600">For: {selectedCourse.title}</p>
                </div>
                <button
                  onClick={() => {
                    setShowAddLessonModal(false);
                    resetLessonForm();
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  disabled={loading}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddLesson} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lesson Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={lessonForm.title}
                      onChange={(e) => setLessonForm({...lessonForm, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Introduction to Marketing"
                      disabled={loading}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration
                    </label>
                    <input
                      type="text"
                      value={lessonForm.duration}
                      onChange={(e) => setLessonForm({...lessonForm, duration: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="45 minutes"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={lessonForm.description}
                    onChange={(e) => setLessonForm({...lessonForm, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="What will students learn in this lesson?"
                    disabled={loading}
                  />
                </div>

                {/* Video */}
                <div className="border-t pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Youtube className="h-5 w-5 text-red-600" />
                    <h4 className="font-medium text-gray-900">Video Content</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Video URL *
                      </label>
                      <input
                        type="url"
                        required
                        value={lessonForm.videoUrl}
                        onChange={(e) => setLessonForm({...lessonForm, videoUrl: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://www.youtube.com/watch?v=..."
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                {/* Enhanced Resources Section */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Folder className="h-5 w-5 text-blue-600" />
                      <h4 className="font-medium text-gray-900">Learning Resources</h4>
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                        <Cloud size={12} />
                        Cloudflare R2
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Total: {getTotalResources()} files
                    </div>
                  </div>

                  {/* Add Resource Form */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-6">
                    <h5 className="font-medium text-gray-900 mb-4">Add New Resource</h5>
                    
                    <div className="space-y-4">
                      {/* Resource Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Resource Type
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {['slides', 'document', 'template'].map((type) => (
                            <button
                              type="button"
                              key={type}
                              onClick={() => setNewResource({...newResource, category: type})}
                              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                                newResource.category === type 
                                  ? 'bg-blue-100 border-blue-500 text-blue-700' 
                                  : 'border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Resource Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Resource Name *
                        </label>
                        <input
                          type="text"
                          value={newResource.name}
                          onChange={(e) => setNewResource({...newResource, name: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="e.g., Marketing Strategy Template"
                          disabled={uploading}
                        />
                      </div>

                      {/* File Upload */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          File Upload *
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                          {uploading ? (
                            <div className="py-4">
                              <Loader2 className="h-6 w-6 text-blue-600 animate-spin mx-auto mb-2" />
                              <p className="text-sm text-gray-600">Uploading to Cloudflare R2...</p>
                              
                              {/* Progress bar */}
                              {uploadProgress > 0 && (
                                <div className="mt-4">
                                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                                    <span>Progress</span>
                                    <span>{Math.round(uploadProgress)}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : newResource.file ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between bg-white p-3 rounded border">
                                <div className="flex items-center gap-3">
                                  <FileIcon type={getFileType(newResource.file.name)} />
                                  <div>
                                    <p className="text-sm font-medium truncate">{newResource.file.name}</p>
                                    <p className="text-xs text-gray-500">
                                      {(newResource.file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewResource({...newResource, file: null});
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                  }}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                              <p className="text-xs text-green-600">
                                ✓ File ready to upload to Cloudflare R2
                              </p>
                            </div>
                          ) : (
                            <label className="cursor-pointer">
                              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-600">Click to upload or drag & drop</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Files will be stored in Cloudflare R2 (Max 50MB)
                              </p>
                              <input
                                ref={fileInputRef}
                                type="file"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    if (file.size > 50 * 1024 * 1024) {
                                      alert('File size must be less than 50MB');
                                      return;
                                    }
                                    setNewResource({
                                      ...newResource,
                                      file,
                                      type: getFileType(file.name)
                                    });
                                  }
                                }}
                                className="hidden"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.jpg,.jpeg,.png,.gif,.mp4,.webm"
                                disabled={uploading}
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description (Optional)
                        </label>
                        <textarea
                          value={newResource.description}
                          onChange={(e) => setNewResource({...newResource, description: e.target.value})}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="Brief description of this resource..."
                          disabled={uploading}
                        />
                      </div>

                      {/* Options */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={newResource.downloadable}
                            onChange={(e) => setNewResource({...newResource, downloadable: e.target.checked})}
                            className="rounded"
                            disabled={uploading}
                          />
                          <label className="text-sm">Allow Download</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={newResource.viewable}
                            onChange={(e) => setNewResource({...newResource, viewable: e.target.checked})}
                            className="rounded"
                            disabled={uploading}
                          />
                          <label className="text-sm">Allow Preview</label>
                        </div>
                      </div>

                      {/* Add Button */}
                      <button
                        type="button"
                        onClick={handleAddResource}
                        disabled={!newResource.name || !newResource.file || uploading}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Cloud size={16} />
                            Upload to Cloudflare R2
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Resource Lists */}
                  <div className="space-y-6">
                    {/* Slides */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Presentation className="h-5 w-5 text-orange-600" />
                        <h5 className="font-medium text-gray-900">Slides & Presentations</h5>
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                          {lessonForm.slides.length}
                        </span>
                      </div>
                      {renderResourceList(lessonForm.slides, 'slides')}
                    </div>

                    {/* Documents */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <h5 className="font-medium text-gray-900">Documents & PDFs</h5>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {lessonForm.documents.length}
                        </span>
                      </div>
                      {renderResourceList(lessonForm.documents, 'documents')}
                    </div>

                    {/* Templates */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <FileSpreadsheet className="h-5 w-5 text-green-600" />
                        <h5 className="font-medium text-gray-900">Templates & Worksheets</h5>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          {lessonForm.templates.length}
                        </span>
                      </div>
                      {renderResourceList(lessonForm.templates, 'templates')}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddLessonModal(false);
                      resetLessonForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !lessonForm.title || !lessonForm.videoUrl}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus size={20} />
                        Add Lesson
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Course Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-xl sm:rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Create New Course</h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetCourseForm();
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  disabled={loading || uploading}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateCourse} className="space-y-6">
                {/* Thumbnail Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Course Thumbnail *
                    <span className="text-xs text-gray-500 ml-1">(Recommended: 1280x720px, Max 5MB)</span>
                  </label>
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Preview */}
                    <div className="w-full md:w-1/3">
                      <div className="relative aspect-video rounded-lg overflow-hidden border border-gray-300 bg-gradient-to-br from-blue-50 to-indigo-50">
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt="Thumbnail preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center">
                            <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-500">Preview</p>
                          </div>
                        )}
                        {uploading && (
                          <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Upload Controls */}
                    <div className="flex-1">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-blue-400 transition-colors">
                        {uploading ? (
                          <div className="py-6">
                            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-3" />
                            <p className="text-sm text-gray-600">Processing image...</p>
                          </div>
                        ) : (
                          <label className="cursor-pointer block">
                            <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                            <p className="text-sm font-medium text-gray-700 mb-1">
                              {imagePreview ? 'Change thumbnail' : 'Upload thumbnail'}
                            </p>
                            <p className="text-xs text-gray-500 mb-3">
                              Drag & drop or click to browse
                            </p>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, false)}
                              className="hidden"
                              disabled={uploading}
                            />
                            <div className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2">
                              <Upload size={16} />
                              Browse Files
                            </div>
                          </label>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-3">
                        Supports JPG, PNG, GIF • Max 5MB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Course Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Course Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={courseForm.title}
                      onChange={(e) => setCourseForm({...courseForm, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Digital Marketing Masterclass"
                      disabled={loading || uploading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <select
                      required
                      value={courseForm.category}
                      onChange={(e) => setCourseForm({...courseForm, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={loading || uploading}
                    >
                      <option value="">Select a category</option>
                      <option value="business">Business</option>
                      <option value="technology">Technology</option>
                      <option value="marketing">Marketing</option>
                      <option value="finance">Finance</option>
                      <option value="entrepreneurship">Entrepreneurship</option>
                      <option value="leadership">Leadership</option>
                      <option value="fitness">Fitness</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price ($)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={courseForm.price}
                        onChange={(e) => setCourseForm({...courseForm, price: parseFloat(e.target.value) || 0})}
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                        disabled={loading || uploading}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="isFree"
                            checked={courseForm.isFree}
                            onChange={(e) => setCourseForm({...courseForm, isFree: e.target.checked})}
                            className="rounded"
                            disabled={loading || uploading}
                          />
                          <label htmlFor="isFree" className="text-xs text-gray-600">
                            Free Course
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estimated Duration
                    </label>
                    <input
                      type="text"
                      value={courseForm.duration}
                      onChange={(e) => setCourseForm({...courseForm, duration: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 8 weeks, 30 hours"
                      disabled={loading || uploading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    required
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe what students will learn in this course..."
                    disabled={loading || uploading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Skill Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['beginner', 'intermediate', 'advanced'].map((level) => (
                      <button
                        type="button"
                        key={level}
                        onClick={() => setCourseForm({...courseForm, level})}
                        className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                          courseForm.level === level 
                            ? 'bg-blue-100 border-blue-500 text-blue-700' 
                            : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                        }`}
                        disabled={loading || uploading}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cloudflare R2 Note */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Cloud className="h-4 w-4 text-blue-600" />
                    <h4 className="text-sm font-medium text-blue-800">Cloudflare R2 Storage</h4>
                  </div>
                  <p className="text-xs text-blue-700">
                    Course resources (documents, slides, templates) will be stored in Cloudflare R2 for optimal performance and cost savings.
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetCourseForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    disabled={loading || uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!courseForm.title || !courseForm.category || !courseImage || loading || uploading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Check size={20} />
                        Create Course
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {showEditModal && editingCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-xl sm:rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Edit Course</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    resetEditForm();
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  disabled={loading || uploading}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Thumbnail Update Section */}
              <div className="mb-8">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Course Thumbnail</h4>
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Current Thumbnail */}
                  <div className="w-full md:w-1/3">
                    <div className="aspect-video rounded-lg overflow-hidden border border-gray-300">
                      <img
                        src={editImagePreview || editingCourse.thumbnailUrl || ''}
                        alt="Current thumbnail"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      {editImagePreview ? 'New thumbnail' : 'Current thumbnail'}
                    </p>
                  </div>

                  {/* Update Controls */}
                  <div className="flex-1 space-y-3">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                      {uploading ? (
                        <div className="py-4">
                          <Loader2 className="h-6 w-6 text-blue-600 animate-spin mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Processing...</p>
                        </div>
                      ) : (
                        <label className="cursor-pointer block">
                          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm font-medium text-gray-700 mb-1">
                            Upload new thumbnail
                          </p>
                          <p className="text-xs text-gray-500 mb-3">
                            JPG, PNG, GIF • Max 5MB
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, true)}
                            className="hidden"
                            disabled={uploading}
                          />
                          <div className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-1">
                            <Upload size={14} />
                            Select File
                          </div>
                        </label>
                      )}
                    </div>

                    {editImage && !uploading && (
                      <button
                        type="button"
                        onClick={updateCourseThumbnail}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                      >
                        <Upload size={16} />
                        Update Thumbnail
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="border-t pt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-4">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => togglePublishCourse(editingCourse)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    disabled={loading}
                  >
                    {editingCourse.published ? (
                      <>
                        <EyeOff size={16} />
                        Unpublish Course
                      </>
                    ) : (
                      <>
                        <Eye size={16} />
                        Publish Course
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDelete(editingCourse);
                      setShowEditModal(false);
                    }}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    disabled={loading}
                  >
                    <Trash2 size={16} />
                    Delete Course
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    resetEditForm();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={loading}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Course</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete <span className="font-semibold">{confirmDelete.title}</span>? 
                This action cannot be undone.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <Cloud className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-yellow-800">
                    All associated resources stored in Cloudflare R2 will also be deleted.
                  </p>
                </div>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteCourse(confirmDelete.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Delete Course
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { db, auth } from "../firebase/config";
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  addDoc,
  updateDoc,
  deleteDoc,  // Add this import
  onSnapshot
} from "firebase/firestore";
import {
  ArrowLeft,
  Clock,
  Users,
  BookOpen,
  Star,
  CheckCircle,
  Calendar,
  User,
  Globe,
  BarChart,
  Award,
  ChevronRight,
  MessageSquare,
  ThumbsUp,
  Edit,
  Trash2,
  X
} from "lucide-react"; // Add Edit, Trash2, X icons
import RatingDisplay from './ratingdisplay.jsx';


export default function CourseDetails() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [creator, setCreator] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [enrolling, setEnrolling] = useState(false);
  
  // Review form states
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [userReview, setUserReview] = useState('');
  const [userRating, setUserRating] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);
  
  // NEW: State for tracking user's existing review
  const [existingUserReview, setExistingUserReview] = useState(null);
  const [isEditingReview, setIsEditingReview] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await checkEnrollment(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (courseId) {
      fetchCourseDetails();
      fetchCourseReviews();
    }
  }, [courseId]);
  useEffect(() => {
  if (!courseId) return;
  
  // Real-time listener for course updates
  const courseRef = doc(db, "courses", courseId);
  const unsubscribe = onSnapshot(courseRef, (docSnapshot) => {
    if (docSnapshot.exists()) {
      const updatedCourse = {
        id: docSnapshot.id,
        ...docSnapshot.data()
      };
      setCourse(updatedCourse);
      console.log('📡 Real-time update: Course rating changed');
    }
  });
  
  return () => unsubscribe();
}, [courseId]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch course data
      const courseRef = doc(db, "courses", courseId);
      const courseSnap = await getDoc(courseRef);
      
      if (!courseSnap.exists()) {
        navigate("/catalog");
        return;
      }
      
      const courseData = {
        id: courseSnap.id,
        ...courseSnap.data()
      };
      setCourse(courseData);
      
      // Fetch creator info if creatorId exists
      if (courseData.creatorId) {
        const creatorRef = doc(db, "users", courseData.creatorId);
        const creatorSnap = await getDoc(creatorRef);
        if (creatorSnap.exists()) {
          setCreator(creatorSnap.data());
        }
      }
      
    } catch (error) {
      console.error("Error fetching course details:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseReviews = async () => {
    try {
      // Fetch actual reviews from Firestore
      const reviewsRef = collection(db, "reviews");
      const reviewsQuery = query(reviewsRef, where("courseId", "==", courseId));
      const reviewsSnap = await getDocs(reviewsQuery);
      
      const reviewsData = reviewsSnap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        // Convert Firestore timestamp to readable date
        date: doc.data().createdAt?.toDate().toLocaleDateString() || "Recently",
        updatedDate: doc.data().updatedAt?.toDate().toLocaleDateString()
      }));
      
      setReviews(reviewsData);
      
      // Check if current user has already reviewed
      if (user) {
        const userReview = reviewsData.find(review => review.userId === user.uid);
        if (userReview) {
          setExistingUserReview(userReview);
        } else {
          setExistingUserReview(null);
        }
      }
      
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  const checkEnrollment = async (userId) => {
    try {
      const enrollmentsRef = collection(db, "enrollments");
      const enrollmentQuery = query(
        enrollmentsRef,
        where("userId", "==", userId),
        where("courseId", "==", courseId)
      );
      const enrollmentSnap = await getDocs(enrollmentQuery);
      setIsEnrolled(!enrollmentSnap.empty);
    } catch (error) {
      console.error("Error checking enrollment:", error);
    }
  };

  // Function to handle review submission - UPDATED
 // In coursedetails.jsx, UPDATE handleSubmitReview:
const handleSubmitReview = async () => {
  if (!user) {
    alert('Please login to submit a review');
    navigate('/login');
    return;
  }
  
  if (!userRating || userReview.length < 10) {
    alert('Please provide a rating (1-5 stars) and review (minimum 10 characters)');
    return;
  }
  
  setSubmittingReview(true);
  
  try {
    // Check for existing review
    const reviewsRef = collection(db, "reviews");
    const existingReviewQuery = query(
      reviewsRef,
      where("courseId", "==", courseId),
      where("userId", "==", user.uid)
    );
    const existingReviewSnap = await getDocs(existingReviewQuery);
    
    let reviewData = {
      courseId,
      userId: user.uid,
      userName: user.displayName || user.email.split('@')[0],
      rating: userRating,
      comment: userReview,
      userInitials: (user.displayName || user.email[0]).toUpperCase(),
      updatedAt: serverTimestamp()
    };
    
    if (!existingReviewSnap.empty) {
      // UPDATE existing review
      const existingReviewDoc = existingReviewSnap.docs[0];
      reviewData.createdAt = existingReviewDoc.data().createdAt;
      
      await updateDoc(doc(db, "reviews", existingReviewDoc.id), reviewData);
      console.log('✅ Updated existing review');
      
    } else {
      // CREATE new review
      reviewData.createdAt = serverTimestamp();
      await addDoc(collection(db, "reviews"), reviewData);
      console.log('✅ Created new review');
    }
    
    // ⚠️ REMOVED: No need to call updateCourseRating anymore!
    // Cloud Function will handle it automatically
    
    // Reset form
    setUserReview('');
    setUserRating(0);
    setShowReviewForm(false);
    setIsEditingReview(false);
    
    // The rating will update automatically via Firestore real-time listeners
    // But we should still refresh to show the user's review immediately
    await fetchCourseReviews();
    
    // Show success message
    alert('✅ Review submitted successfully! The course rating will update momentarily.');
    
  } catch (error) {
    console.error('Error submitting review:', error);
    alert('❌ Failed to submit review. Please try again.');
  } finally {
    setSubmittingReview(false);
  }
};

  // Function to delete a review
  // Function to delete a review - UPDATED to refresh rating
const handleDeleteReview = async () => {
  if (!existingUserReview || !window.confirm('Are you sure you want to delete your review?')) {
    return;
  }
  
  try {
    const reviewRef = doc(db, "reviews", existingUserReview.id);
    await deleteDoc(reviewRef);
    
    // Update course rating AND get updated data
    
    
    // Refresh data
    await fetchCourseReviews();
    await fetchCourseDetails();
    
    setExistingUserReview(null);
    setIsEditingReview(false);
    setShowReviewForm(false);
    
    alert('✅ Review deleted successfully!');
  } catch (error) {
    console.error('Error deleting review:', error);
    alert('❌ Failed to delete review. Please try again.');
  }
};
  // Function to start editing review
  const handleEditReview = () => {
    if (existingUserReview) {
      setUserRating(existingUserReview.rating);
      setUserReview(existingUserReview.comment);
      setIsEditingReview(true);
      setShowReviewForm(true);
    }
  };
  // Function to handle unenrollment
const handleUnenroll = async () => {
  if (!user) {
    alert('Please login to manage your enrollments');
    navigate('/login');
    return;
  }

  if (!window.confirm(`Are you sure you want to unenroll from "${course.title}"?\n\nYour progress will be saved for 90 days. You can re-enroll anytime to continue.`)) {
    return;
  }

  try {
    // Find the enrollment document
    const enrollmentsRef = collection(db, "enrollments");
    const enrollmentQuery = query(
      enrollmentsRef,
      where("userId", "==", user.uid),
      where("courseId", "==", courseId)
    );
    
    const enrollmentSnap = await getDocs(enrollmentQuery);
    
    if (!enrollmentSnap.empty) {
      const enrollmentDoc = enrollmentSnap.docs[0];
      const enrollmentId = enrollmentDoc.id;
      const enrollmentData = enrollmentDoc.data();
      
      // Optional: Check if user is actually enrolled
      if (enrollmentData.userId !== user.uid) {
        alert('❌ Permission denied. This enrollment does not belong to you.');
        return;
      }
      
      // Save progress before deleting
      const progressData = {
        userId: user.uid,
        courseId,
        courseTitle: course.title,
        progress: enrollmentData.progress || 0,
        completedLessons: enrollmentData.completedLessons || [],
        lastAccessed: enrollmentData.lastAccessed || serverTimestamp(),
        enrolledAt: enrollmentData.enrolledAt || serverTimestamp(),
        unenrolledAt: serverTimestamp(),
        preservedUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
      };
      
      try {
        // Save progress to 'unenrolledProgress' collection
        await addDoc(collection(db, "unenrolledProgress"), progressData);
      } catch (progressError) {
        console.warn('Could not save progress backup:', progressError);
        // Continue anyway - main unenrollment is more important
      }
      
      // Delete the enrollment
      await deleteDoc(doc(db, "enrollments", enrollmentId));
      
      // Update local state
      setIsEnrolled(false);
      
      // Show success message
      alert(`✅ Successfully unenrolled from "${course.title}".\n\nYour progress has been saved. You can re-enroll anytime within 90 days to continue where you left off.`);
      
    } else {
      alert('Enrollment record not found. You may already be unenrolled.');
      setIsEnrolled(false);
    }
    
  } catch (error) {
    console.error('Error unenrolling:', error);
    
    // Show specific error message
    if (error.code === 'permission-denied') {
      alert('❌ Permission denied. Please make sure you are logged in and this enrollment belongs to you.');
    } else {
      alert('❌ Failed to unenroll. Please try again or contact support.');
    }
  }
};

  // Function to cancel review
  const handleCancelReview = () => {
    setShowReviewForm(false);
    setIsEditingReview(false);
    setUserReview('');
    setUserRating(0);
  };

  const handleEnroll = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    setEnrolling(true);
    try {
      await auth.currentUser.getIdToken(true);
      
      const enrollmentData = {
        userId: user.uid,
        courseId,
        enrolledAt: serverTimestamp(),
        progress: 0,
        completedLessons: [],
        status: "active"
      };

      try {
        await addDoc(collection(db, "enrollments"), enrollmentData);
      } catch (addError) {
        console.log("Note: addDoc threw error:", addError.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Verify enrollment
      const enrollmentsRef = collection(db, "enrollments");
      const verifyQuery = query(
        enrollmentsRef,
        where("userId", "==", user.uid),
        where("courseId", "==", courseId)
      );
      const verifySnap = await getDocs(verifyQuery);
      
      if (verifySnap.empty) {
        alert("Failed to enroll. Please try again.");
        return;
      }
      
      setIsEnrolled(true);
      navigate(`/course/${courseId}`);
      
    } catch (error) {
      console.error("Enrollment process error:", error);
      alert("Failed to enroll. Please try again.");
    } finally {
      setEnrolling(false);
    }
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
            onClick={() => navigate("/catalog")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Browse Courses
          </button>
        </div>
      </div>
    );
  }

  const isFree = course.isFree !== false && course.price === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Back Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={20} />
            <span>Back to Catalog</span>
          </button>
        </div>
      </div>

      {/* Course Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Course Image/Thumbnail */}
            <div className="lg:w-1/3">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                {course.thumbnailUrl ? (
                  <img 
                    src={course.thumbnailUrl} 
                    alt={course.title}
                    className="w-full h-64 object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-full h-64 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                    <BookOpen className="h-16 w-16 text-white/80" />
                  </div>
                )}
                
                {/* Price Badge */}
                <div className="mt-4 flex justify-between items-center">
                  <div>
                    {isFree ? (
                      <span className="text-3xl font-bold">Free</span>
                    ) : (
                      <div>
                        <span className="text-3xl font-bold">${course.price || 0}</span>
                        {course.originalPrice && (
                          <span className="ml-2 text-lg line-through text-gray-300">
                            ${course.originalPrice}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling || isEnrolled}
                    className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 ${
                      isEnrolled
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-white text-blue-600 hover:bg-gray-100"
                    } ${enrolling ? "opacity-70 cursor-not-allowed" : ""}`}
                  >
                    {enrolling ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        Processing...
                      </>
                    ) : isEnrolled ? (
                      <>
                        <CheckCircle size={20} />
                        Continue Learning
                      </>
                    ) : (
                      <>
                        Enroll Now
                        <ChevronRight size={20} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Course Info */}
            <div className="lg:w-2/3">
              <div className="mb-6">
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                  {course.category || "General"}
                </span>
                <h1 className="text-4xl font-bold mt-4 mb-3">{course.title}</h1>
                <p className="text-xl text-blue-100">{course.shortDescription}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">Duration</span>
                  </div>
                  <p className="text-lg">{course.duration || "Self-paced"}</p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-5 w-5" />
                    <span className="font-medium">Lessons</span>
                  </div>
                  <p className="text-lg">{course.lessonCount || 0} Lessons</p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5" />
                    <span className="font-medium">Students</span>
                  </div>
                  <p className="text-lg">{course.enrolledCount || 0} Enrolled</p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-5 w-5" />
                    <span className="font-medium">Rating</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RatingDisplay 
                      rating={course.averageRating || 0} 
                      size="sm" 
                      showNumber={false}
                    />
                    <span className="text-lg">
                      {course.averageRating?.toFixed(1) || "0.0"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rating Section - UPDATED */}
              <div className="mt-6 p-6 bg-white/10 backdrop-blur-sm rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Course Rating</h3>
                    <div className="flex items-center gap-4">
                      <RatingDisplay rating={course.averageRating || 0} size="lg" />
                      <div>
                        <div className="text-3xl font-bold">
                          {course.averageRating?.toFixed(1) || '0.0'}
                        </div>
                        <div className="text-blue-100">
                          {course.totalReviews || 0} {course.totalReviews === 1 ? 'review' : 'reviews'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Updated button with logic for existing reviews */}
                  {user && isEnrolled ? (
                    <div className="flex gap-2">
                      {existingUserReview && !showReviewForm && (
                        <>
                          <button
                            onClick={handleEditReview}
                            className="px-4 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 flex items-center gap-2"
                          >
                            <Edit size={18} />
                            Edit Review
                          </button>
                          <button
                            onClick={handleDeleteReview}
                            className="px-4 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 flex items-center gap-2"
                          >
                            <Trash2 size={18} />
                            Delete
                          </button>
                        </>
                      )}
                      {(!existingUserReview || showReviewForm) && (
                        <button
                          onClick={() => {
                            if (showReviewForm) {
                              handleCancelReview();
                            } else if (existingUserReview) {
                              handleEditReview();
                            } else {
                              setShowReviewForm(true);
                            }
                          }}
                          className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 flex items-center gap-2"
                        >
                          {showReviewForm ? (
                            <>
                              <X size={18} />
                              Cancel
                            </>
                          ) : existingUserReview ? (
                            <>
                              <Edit size={18} />
                              Edit Review
                            </>
                          ) : (
                            'Write a Review'
                          )}
                        </button>
                      )}
                    </div>
                  ) : user ? (
                    <button
                      onClick={handleEnroll}
                      className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100"
                    >
                      Enroll to Review
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/login')}
                      className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100"
                    >
                      Login to Review
                    </button>
                  )}
                </div>
              </div>

              {/* Creator Info */}
              {creator && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-6 mt-6">
                  <h3 className="font-semibold text-lg mb-3">Course Instructor</h3>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold">
                      {creator.firstName?.[0] || creator.email?.[0] || "A"}
                    </div>
                    <div>
                      <h4 className="font-semibold">
                        {creator.fullName || creator.email}
                      </h4>
                      <p className="text-blue-100 text-sm">
                        {creator.role === "admin" ? "Platform Admin" : "Instructor"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Review Form Section - UPDATED */}
      {showReviewForm && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white rounded-2xl shadow border p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">
                {existingUserReview ? 'Edit Your Review' : 'Write Your Review'}
              </h3>
              {existingUserReview && (
                <button
                  onClick={handleDeleteReview}
                  className="px-4 py-2 text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1"
                >
                  <Trash2 size={16} />
                  Delete Review
                </button>
              )}
            </div>
            
            {/* Show existing review preview when editing */}
            {existingUserReview && isEditingReview && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-2">Your Current Review:</h4>
                <div className="flex items-center gap-2 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={i < existingUserReview.rating 
                        ? 'text-yellow-500 fill-current' 
                        : 'text-gray-300'
                      }
                    />
                  ))}
                  <span className="text-sm text-gray-600">
                    {existingUserReview.rating}.0 stars
                  </span>
                </div>
                <p className="text-gray-700 text-sm italic">
                  "{existingUserReview.comment}"
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Posted on: {existingUserReview.date}
                </p>
              </div>
            )}
            
            {/* Star Rating */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Your Rating
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setUserRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      size={32}
                      className={`${
                        star <= userRating
                          ? 'text-yellow-500 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Selected: {userRating} out of 5
              </p>
            </div>
            
            {/* Review Text */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Review
              </label>
              <textarea
                value={userReview}
                onChange={(e) => setUserReview(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="4"
                placeholder={existingUserReview 
                  ? "Update your review..." 
                  : "Share your thoughts about this course..."
                }
                minLength="10"
              />
              <p className="text-sm text-gray-500 mt-2">
                Minimum 10 characters. Current: {userReview.length}
              </p>
            </div>
            
            {/* Submit Button */}
            <div className="flex gap-3">
              <button
                onClick={handleSubmitReview}
                disabled={!userRating || userReview.length < 10 || submittingReview}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submittingReview ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {existingUserReview ? 'Updating...' : 'Submitting...'}
                  </>
                ) : (
                  existingUserReview ? 'Update Review' : 'Submit Review'
                )}
              </button>
              
              <button
                onClick={handleCancelReview}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Course Details */}
          <div className="lg:col-span-2">
            {/* Course Description */}
            <div className="bg-white rounded-2xl shadow border p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Course Description</h2>
              <div className="prose max-w-none text-gray-700">
                {course.description ? (
                  <p className="whitespace-pre-line">{course.description}</p>
                ) : (
                  <p>No detailed description available for this course.</p>
                )}
              </div>
            </div>

            {/* What You'll Learn */}
            {course.learningOutcomes && course.learningOutcomes.length > 0 && (
              <div className="bg-white rounded-2xl shadow border p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">What You'll Learn</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {course.learningOutcomes.map((outcome, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{outcome}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews Section - UPDATED */}
            <div className="bg-white rounded-2xl shadow border p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Student Reviews</h2>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  <span className="text-lg font-semibold">
                    {course.averageRating?.toFixed(1) || "0.0"}
                  </span>
                  <span className="text-gray-500">({reviews.length} reviews)</span>
                </div>
              </div>

              {reviews.length > 0 ? (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b pb-6 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                            {review.userInitials || review.userName?.[0] || "U"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{review.userName}</h4>
                              {user && review.userId === user.uid && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  Your Review
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.rating
                                      ? "text-yellow-500 fill-current"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-500 text-sm block">{review.date}</span>
                          {review.updatedDate && review.updatedDate !== review.date && (
                            <span className="text-gray-400 text-xs block">Edited: {review.updatedDate}</span>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-700">{review.comment}</p>
                      
                      {/* Show edit/delete buttons for user's own reviews */}
                      {user && review.userId === user.uid && !showReviewForm && (
                            <div className="mt-2 flex gap-2">
                                <button
                                onClick={() => {
                                    setExistingUserReview(review);
                                    setUserRating(review.rating);
                                    setUserReview(review.comment);
                                    setShowReviewForm(true);
                                    setIsEditingReview(true);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 px-2 py-1 rounded border border-blue-200 hover:bg-blue-50 touch-manipulation"
                                >
                                <Edit size={12} />
                                Edit
                                </button>
                                <button
                                onClick={async () => {
                                    if (window.confirm('Are you sure you want to delete your review?')) {
                                    try {
                                        await deleteDoc(doc(db, "reviews", review.id));
                                        
                                        // Update course rating
                                        const ratingUpdate = await updateCourseRating(courseId);
                                        
                                        if (ratingUpdate.success) {
                                        // ✅ Update local state
                                        setCourse(prev => ({
                                            ...prev,
                                            averageRating: ratingUpdate.averageRating,
                                            totalReviews: ratingUpdate.reviewCount
                                        }));
                                        }
                                        
                                        // Refresh data
                                        await fetchCourseReviews();
                                        await fetchCourseDetails();
                                        
                                        alert('✅ Review deleted successfully!');
                                    } catch (error) {
                                        console.error('Error deleting review:', error);
                                        alert('❌ Failed to delete review. Please try again.');
                                    }
                                    }
                                }}
                                className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 px-2 py-1 rounded border border-red-200 hover:bg-red-50 touch-manipulation"
                                >
                                <Trash2 size={12} />
                                Delete
                                </button>
                            </div>
                            )}
                      
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Reviews Yet
                  </h3>
                  <p className="text-gray-600">
                    Be the first to review this course!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1">
            {/* Course Features */}
            <div className="bg-white rounded-2xl shadow border p-6 mb-6 sticky top-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Course Features</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Lifetime Access</h4>
                    <p className="text-sm text-gray-600">Access forever after enrolling</p>
                  </div>
                </div>
                
                
                
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Online Access</h4>
                    <p className="text-sm text-gray-600">Access from any device</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center">
                    <BarChart className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Beginner Friendly</h4>
                    <p className="text-sm text-gray-600">No prior knowledge required</p>
                  </div>
                </div>
              </div>
              
              {/* Enroll Button (for mobile/quick access) */}
              <div className="mt-8 pt-6 border-t">
                <button
                  onClick={handleEnroll}
                  disabled={enrolling || isEnrolled}
                  className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 ${
                    isEnrolled
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  } ${enrolling ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  {enrolling ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : isEnrolled ? (
                    <>
                      <CheckCircle size={20} />
                      Continue Learning
                    </>
                  ) : (
                    <>
                      Enroll Now
                      <ChevronRight size={20} />
                    </>
                  )}
                </button>
              </div>
            </div>
            {/* Unenroll Section */}
{isEnrolled && (
  <div className="mt-6 pt-6 border-t border-gray-200">
    <div className="space-y-3">
      <h4 className="font-medium text-gray-900">Manage Enrollment</h4>
      
      <button
        onClick={handleUnenroll}
        className="w-full py-3 px-4 bg-red-50 text-red-700 border border-red-200 rounded-lg font-medium hover:bg-red-100 hover:border-red-300 hover:text-red-800 transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Unenroll from Course
      </button>
      
      <div className="text-xs text-gray-500 space-y-1">
        <p className="flex items-start gap-1">
          <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>Your progress will be saved for 90 days</span>
        </p>
        <p className="flex items-start gap-1">
          <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>You can re-enroll anytime to continue</span>
        </p>
      </div>
    </div>
  </div>
)}

            {/* Share Course */}
            {/* <div className="bg-white rounded-2xl shadow border p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Share This Course</h3>
              <div className="flex gap-3">
                <button className="flex-1 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors">
                  Facebook
                </button>
                <button className="flex-1 py-2 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors">
                  Twitter
                </button>
                <button className="flex-1 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">
                  Email
                </button>
              </div>
            </div> */}
          </div>
        </div>
      </main>
    </div>
  );
}
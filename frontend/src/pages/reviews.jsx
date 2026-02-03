import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp 
} from "firebase/firestore";

const ReviewForm = ({ courseId, user, onReviewSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existingReview, setExistingReview] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Check for existing review when component mounts or user changes
  useEffect(() => {
    const checkExistingReview = async () => {
      if (user && courseId) {
        try {
          const reviewsRef = collection(db, "reviews");
          const reviewQuery = query(
            reviewsRef,
            where("userId", "==", user.uid),
            where("courseId", "==", courseId)
          );
          const reviewSnap = await getDocs(reviewQuery);
          
          if (!reviewSnap.empty) {
            const reviewDoc = reviewSnap.docs[0];
            setExistingReview({
              id: reviewDoc.id,
              ...reviewDoc.data()
            });
            // Pre-populate form with existing review
            setRating(reviewDoc.data().rating);
            setComment(reviewDoc.data().comment);
          } else {
            setExistingReview(null);
          }
        } catch (error) {
          console.error("Error checking existing review:", error);
        }
      }
    };
    
    checkExistingReview();
  }, [user, courseId]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating || comment.length < 10) {
      alert("Please provide a rating (1-5 stars) and review (minimum 10 characters)");
      return;
    }
    
    setSubmitting(true);
    try {
      const reviewData = {
        userId: user.uid,
        courseId,
        rating,
        comment,
        userName: user.displayName || user.email.split('@')[0],
        userAvatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}`,
        helpfulCount: 0,
        isVerifiedEnrollment: true,
        updatedAt: serverTimestamp()
      };
      
      let result;
      
      if (existingReview) {
        // UPDATE existing review
        reviewData.createdAt = existingReview.createdAt; // Keep original timestamp
        await updateDoc(doc(db, "reviews", existingReview.id), reviewData);
        result = { type: "updated", reviewId: existingReview.id };
        console.log("✅ Updated existing review");
      } else {
        // CREATE new review
        reviewData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, "reviews"), reviewData);
        result = { type: "created", reviewId: docRef.id };
        console.log("✅ Created new review");
      }
      
      // Update course average rating
      await updateCourseRating(courseId);
      
      onReviewSubmitted(result);
      setIsEditing(false);
      
      // Only reset form if it's a new review
      if (!existingReview) {
        setRating(0);
        setComment("");
      }
      
    } catch (error) {
      console.error("Error submitting review:", error);
      
      // Check for specific errors
      if (error.code === "failed-precondition") {
        alert("You have already reviewed this course. You can edit your existing review below.");
      } else if (error.message.includes("permission")) {
        alert("You don't have permission to submit a review. Please make sure you're enrolled in this course.");
      } else {
        alert("Failed to submit review. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleDeleteReview = async () => {
    if (!window.confirm("Are you sure you want to delete your review?")) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, "reviews", existingReview.id));
      
      // Update course rating
      await updateCourseRating(courseId);
      
      // Reset form
      setExistingReview(null);
      setRating(0);
      setComment("");
      setIsEditing(false);
      
      onReviewSubmitted({ type: "deleted" });
      alert("✅ Review deleted successfully!");
      
    } catch (error) {
      console.error("Error deleting review:", error);
      alert("❌ Failed to delete review. Please try again.");
    }
  };
  
  const handleCancelEdit = () => {
    if (existingReview) {
      // Restore original review values
      setRating(existingReview.rating);
      setComment(existingReview.comment);
    } else {
      setRating(0);
      setComment("");
    }
    setIsEditing(false);
  };
  
  return (
    <div className="bg-white rounded-xl shadow border p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-900">
          {existingReview ? (isEditing ? "Edit Your Review" : "Your Review") : "Write a Review"}
        </h3>
        
        {existingReview && !isEditing && (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Edit
            </button>
            <button
              onClick={handleDeleteReview}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-800"
            >
              Delete
            </button>
          </div>
        )}
      </div>
      
      {/* Show existing review when not editing */}
      {existingReview && !isEditing && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-2 mb-3">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className={`w-5 h-5 ${i < existingReview.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
            <span className="text-sm text-gray-600">
              {existingReview.rating}.0 stars
            </span>
          </div>
          <p className="text-gray-700 mb-2 italic">"{existingReview.comment}"</p>
          <p className="text-xs text-gray-500">
            Posted on: {existingReview.createdAt?.toDate().toLocaleDateString() || "Unknown date"}
            {existingReview.updatedAt && existingReview.updatedAt !== existingReview.createdAt && (
              <span className="ml-2">(Edited)</span>
            )}
          </p>
        </div>
      )}
      
      {/* Show form when creating new review or editing existing one */}
      {(!existingReview || isEditing) && (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Rating
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <svg
                    className={`w-8 h-8 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Selected: {rating} out of 5
            </p>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Review
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="4"
              placeholder="Share your experience with this course..."
              required
              minLength="10"
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum 10 characters. Current: {comment.length}
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!rating || comment.length < 10 || submitting}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {existingReview ? "Updating..." : "Submitting..."}
                </>
              ) : (
                existingReview ? "Update Review" : "Submit Review"
              )}
            </button>
            
            {(existingReview && isEditing) && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
      
      {/* Enrollment verification note */}
      {!existingReview && (
        <p className="text-xs text-gray-500 mt-4">
          Note: Only enrolled students can submit reviews. Your enrollment will be verified.
        </p>
      )}
    </div>
  );
};

// Helper component for displaying star ratings
const RatingStars = ({ rating, onRate, interactive = false }) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        interactive ? (
          <button
            key={star}
            type="button"
            onClick={() => onRate(star)}
            className="p-1 hover:scale-110 transition-transform"
          >
            <svg
              className={`w-6 h-6 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ) : (
          <svg
            key={star}
            className={`w-6 h-6 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )
      ))}
    </div>
  );
};

export default ReviewForm;
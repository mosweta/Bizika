// src/pages/coursedetails.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/config";
import {
  doc, getDoc, collection, query, where, getDocs,
  serverTimestamp, addDoc, updateDoc, deleteDoc, onSnapshot,
} from "firebase/firestore";
import {
  ArrowLeft, Clock, Users, BookOpen, Star, CheckCircle,
  ChevronRight, MessageSquare, Edit, Trash2, X,
} from "lucide-react";
import RatingDisplay from "./ratingdisplay.jsx";

export default function CourseDetails() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [enrolling, setEnrolling] = useState(false);

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [userReview, setUserReview] = useState("");
  const [userRating, setUserRating] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [existingUserReview, setExistingUserReview] = useState(null);
  const [isEditingReview, setIsEditingReview] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) await checkEnrollment(currentUser.uid);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (courseId) {
      fetchCourseDetails();
      fetchCourseReviews();
    }
  }, [courseId, user]);

  useEffect(() => {
    if (!courseId) return;
    const unsub = onSnapshot(doc(db, "courses", courseId), (snap) => {
      if (snap.exists()) setCourse({ id: snap.id, ...snap.data() });
    });
    return () => unsub();
  }, [courseId]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      const snap = await getDoc(doc(db, "courses", courseId));
      if (!snap.exists()) return navigate("/courses");
      setCourse({ id: snap.id, ...snap.data() });
    } catch (err) {
      console.error("Error fetching course:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseReviews = async () => {
    try {
      const q = query(collection(db, "reviews"), where("courseId", "==", courseId));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        date: d.data().createdAt?.toDate().toLocaleDateString() || "Recently",
        updatedDate: d.data().updatedAt?.toDate().toLocaleDateString(),
      }));
      setReviews(data);
      if (user) {
        const mine = data.find((r) => r.userId === user.uid);
        setExistingUserReview(mine || null);
      }
    } catch (err) {
      console.error("Error fetching reviews:", err);
    }
  };

  const checkEnrollment = async (userId) => {
    try {
      const q = query(
        collection(db, "enrollments"),
        where("userId", "==", userId),
        where("courseId", "==", courseId)
      );
      const snap = await getDocs(q);
      setIsEnrolled(!snap.empty);
    } catch (err) {
      console.error("Error checking enrollment:", err);
    }
  };

  const handleEnroll = async () => {
    if (!user) return navigate("/login");
    setEnrolling(true);
    try {
      await auth.currentUser.getIdToken(true);
      await addDoc(collection(db, "enrollments"), {
        userId: user.uid,
        courseId,
        enrolledAt: serverTimestamp(),
        progress: 0,
        completedLessons: [],
        status: "active",
      });
      await new Promise((r) => setTimeout(r, 400));
      const verify = await getDocs(
        query(
          collection(db, "enrollments"),
          where("userId", "==", user.uid),
          where("courseId", "==", courseId)
        )
      );
      if (verify.empty) return alert("Failed to enroll. Please try again.");
      setIsEnrolled(true);
      navigate(`/course/${courseId}`);
    } catch (err) {
      console.error("Enroll error:", err);
      alert("Failed to enroll. Please try again.");
    } finally {
      setEnrolling(false);
    }
  };

  const handleUnenroll = async () => {
    if (!user) return;
    if (!window.confirm(`Unenroll from "${course.title}"? Your progress will be lost.`)) return;
    try {
      const q = query(
        collection(db, "enrollments"),
        where("userId", "==", user.uid),
        where("courseId", "==", courseId)
      );
      const snap = await getDocs(q);
      if (snap.empty) return;
      await deleteDoc(doc(db, "enrollments", snap.docs[0].id));
      setIsEnrolled(false);
      alert("Unenrolled successfully.");
    } catch (err) {
      console.error("Unenroll error:", err);
      alert("Failed to unenroll.");
    }
  };

  const handleSubmitReview = async () => {
    if (!user) return navigate("/login");
    if (!userRating || userReview.length < 10) {
      return alert("Please provide a rating and at least 10 characters.");
    }
    setSubmittingReview(true);
    try {
      const existing = await getDocs(
        query(
          collection(db, "reviews"),
          where("courseId", "==", courseId),
          where("userId", "==", user.uid)
        )
      );
      const reviewData = {
        courseId,
        userId: user.uid,
        userName: user.displayName || user.email.split("@")[0],
        rating: userRating,
        comment: userReview,
        userInitials: (user.displayName || user.email[0]).toUpperCase(),
        updatedAt: serverTimestamp(),
      };
      if (!existing.empty) {
        reviewData.createdAt = existing.docs[0].data().createdAt;
        await updateDoc(doc(db, "reviews", existing.docs[0].id), reviewData);
      } else {
        reviewData.createdAt = serverTimestamp();
        await addDoc(collection(db, "reviews"), reviewData);
      }
      setUserReview("");
      setUserRating(0);
      setShowReviewForm(false);
      setIsEditingReview(false);
      await fetchCourseReviews();
      alert("Review submitted!");
    } catch (err) {
      console.error("Review error:", err);
      alert("Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!existingUserReview) return;
    if (!window.confirm("Delete your review?")) return;
    try {
      await deleteDoc(doc(db, "reviews", existingUserReview.id));
      setExistingUserReview(null);
      setShowReviewForm(false);
      await fetchCourseReviews();
      await fetchCourseDetails();
    } catch (err) {
      console.error("Delete review error:", err);
    }
  };

  const handleEditReview = () => {
    if (existingUserReview) {
      setUserRating(existingUserReview.rating);
      setUserReview(existingUserReview.comment);
      setIsEditingReview(true);
      setShowReviewForm(true);
    }
  };

  const handleCancelReview = () => {
    setShowReviewForm(false);
    setIsEditingReview(false);
    setUserReview("");
    setUserRating(0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="h-10 w-10 rounded-full border-2 border-slate-200 border-t-blue-800 animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Course not found</h2>
          <button
            onClick={() => navigate("/courses")}
            className="mt-4 rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
          >
            Browse courses
          </button>
        </div>
      </div>
    );
  }

  const isFree = course.isFree !== false && course.price === 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <div className="text-base font-semibold tracking-tight">Bizika LMS</div>
          </div>
        </div>
      </nav>

      {/* Header — royal blue band */}
      <section className="bg-blue-800 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            {/* Left: info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-blue-700 px-2.5 py-1 text-blue-100">
                  {course.category || "General"}
                </span>
                {course.level && (
                  <span className="rounded-full border border-blue-700 px-2.5 py-1 text-blue-100 capitalize">
                    {course.level}
                  </span>
                )}
                {isFree && (
                  <span className="rounded-full bg-green-600 px-2.5 py-1 font-medium">
                    Free
                  </span>
                )}
              </div>
              <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
                {course.title}
              </h1>
              {course.shortDescription && (
                <p className="mt-4 text-base text-blue-100 max-w-2xl leading-relaxed">
                  {course.shortDescription}
                </p>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-blue-100">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {course.duration || "Self-paced"}
                </span>
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  {course.lessonCount || 0} lessons
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {course.enrolledCount || 0} enrolled
                </span>
                <span className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {(course.averageRating || 0).toFixed(1)}
                  <span className="text-blue-200">
                    ({course.totalReviews || 0})
                  </span>
                </span>
              </div>

              <div className="mt-8">
                {isEnrolled ? (
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => navigate(`/course/${courseId}`)}
                      className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4" /> Continue learning
                    </button>
                    <button
                      onClick={handleUnenroll}
                      className="inline-flex items-center gap-2 rounded-lg border border-blue-700 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Unenroll
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-blue-800 hover:bg-slate-100 disabled:opacity-60"
                  >
                    {enrolling ? "Enrolling..." : "Enroll now"}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Right: thumbnail */}
            <div className="lg:w-80 flex-shrink-0">
              <div className="aspect-video rounded-lg overflow-hidden border border-blue-700 bg-blue-900/40">
                {course.thumbnailUrl ? (
                  <img
                    src={course.thumbnailUrl}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-blue-300" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-10">
            {/* About */}
            <section>
              <h2 className="text-xl font-semibold tracking-tight">About this course</h2>
              <p className="mt-4 text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {course.description || "No detailed description provided."}
              </p>
            </section>

            {/* What you'll learn */}
            {course.learningOutcomes?.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold tracking-tight">What you'll learn</h2>
                <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {course.learningOutcomes.map((o, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Reviews */}
            <section id="reviews">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">Student reviews</h2>
                {user && isEnrolled && !existingUserReview && !showReviewForm && (
                  <button
                    onClick={() => setShowReviewForm(true)}
                    className="text-sm font-medium text-blue-800 hover:text-blue-900"
                  >
                    Write a review
                  </button>
                )}
              </div>

              {/* Review form */}
              {showReviewForm && (
                <div className="mt-6 rounded-lg border border-slate-200 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      {existingUserReview ? "Edit your review" : "Write your review"}
                    </h3>
                    <button
                      onClick={handleCancelReview}
                      className="p-1 text-slate-400 hover:text-slate-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-5">
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                      Rating
                    </label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setUserRating(s)}
                          className="p-0.5"
                        >
                          <Star
                            className={`h-6 w-6 ${
                              s <= userRating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-slate-300"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5">
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                      Review
                    </label>
                    <textarea
                      value={userReview}
                      onChange={(e) => setUserReview(e.target.value)}
                      rows={4}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-800"
                      placeholder="Share your experience with this course..."
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      {userReview.length} / 10 minimum
                    </p>
                  </div>

                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={handleSubmitReview}
                      disabled={submittingReview || !userRating || userReview.length < 10}
                      className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
                    >
                      {submittingReview
                        ? "Submitting..."
                        : existingUserReview
                        ? "Update review"
                        : "Submit review"}
                    </button>
                    {existingUserReview && (
                      <button
                        onClick={handleDeleteReview}
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Existing user review banner */}
              {existingUserReview && !showReviewForm && (
                <div className="mt-6 rounded-lg border border-slate-200 p-5 bg-slate-50/60">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-800 flex items-center justify-center text-white text-xs font-semibold">
                          {existingUserReview.userInitials}
                        </div>
                        <div>
                          <p className="text-sm font-medium">Your review</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3.5 w-3.5 ${
                                  i < existingUserReview.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-slate-300"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-slate-700 italic">
                        "{existingUserReview.comment}"
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={handleEditReview}
                        className="p-2 text-slate-500 hover:text-blue-800"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleDeleteReview}
                        className="p-2 text-slate-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Reviews list */}
              {reviews.length > 0 ? (
                <div className="mt-6 space-y-6">
                  {reviews.map((r) => (
                    <div key={r.id} className="border-b border-slate-100 pb-6 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 text-xs font-semibold">
                          {r.userInitials || r.userName?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{r.userName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3.5 w-3.5 ${
                                    i < r.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-slate-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-slate-400">{r.date}</span>
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-slate-700">{r.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                !showReviewForm && (
                  <div className="mt-8 rounded-lg border border-dashed border-slate-300 p-10 text-center">
                    <MessageSquare className="mx-auto h-6 w-6 text-slate-400" />
                    <p className="mt-3 text-sm text-slate-500">
                      No reviews yet. Be the first.
                    </p>
                  </div>
                )
              )}
            </section>
          </div>

          {/* Right sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="rounded-lg border border-slate-200 p-5">
                <h3 className="text-sm font-semibold">Course summary</h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Level</dt>
                    <dd className="font-medium capitalize">{course.level || "All"}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Lessons</dt>
                    <dd className="font-medium">{course.lessonCount || 0}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Duration</dt>
                    <dd className="font-medium">{course.duration || "Self-paced"}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Enrolled</dt>
                    <dd className="font-medium">{course.enrolledCount || 0}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Rating</dt>
                    <dd className="flex items-center gap-1.5">
                      <RatingDisplay
                        rating={course.averageRating || 0}
                        size="sm"
                        showNumber={false}
                      />
                      <span className="font-medium">
                        {(course.averageRating || 0).toFixed(1)}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>

              {!isEnrolled && (
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="w-full rounded-lg bg-blue-800 px-4 py-3 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-60"
                >
                  {enrolling ? "Enrolling..." : "Enroll now"}
                </button>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
// src/components/CourseOverview.jsx
import { useState, useEffect } from "react";
import {
  BookOpen,
  Users,
  Star,
  User,
  Clock,
  Award,
  Calendar,
  Share2,
  Bookmark,
  ThumbsUp,
  MessageCircle,
  ChevronRight,
  Flag,
  ExternalLink,
  Mail,
  Globe,
  Twitter,
  Linkedin,
  Facebook,
  Copy,
  Check,
  Loader2
} from "lucide-react";

export const CourseOverview = ({ 
  course, 
  instructor, 
  enrollment,
  lessonsCount,
  totalProgress,
  onEnroll,
  onShare
}) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate average rating (mock data for now)
  const rating = course?.rating || 4.8;
  const totalReviews = course?.totalReviews || 1247;
  const studentsEnrolled = course?.enrolledCount || 0;

  // Rating distribution
  const ratingDistribution = [
    { stars: 5, percentage: 72 },
    { stars: 4, percentage: 18 },
    { stars: 3, percentage: 6 },
    { stars: 2, percentage: 3 },
    { stars: 1, percentage: 1 }
  ];

  const handleShare = (platform) => {
    const url = window.location.href;
    const text = `Check out ${course?.title} on Bizika LMS!`;
    
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      email: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`
    };

    if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }

    window.open(shareUrls[platform], '_blank', 'noopener,noreferrer');
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Recently';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* Main Content */}
      <div className="p-6 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Course Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & Badges */}
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    {course?.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full font-medium">
                      {course?.category || 'Course'}
                    </span>
                    {course?.level && (
                      <span className="px-3 py-1 bg-purple-50 text-purple-700 text-sm rounded-full capitalize">
                        {course.level} Level
                      </span>
                    )}
                    {course?.status === 'published' && (
                      <span className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full">
                        Published
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsBookmarked(!isBookmarked)}
                    className={`p-2 rounded-lg transition-colors ${
                      isBookmarked 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'hover:bg-gray-100 text-gray-500'
                    }`}
                    title={isBookmarked ? 'Remove bookmark' : 'Bookmark course'}
                  >
                    <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-blue-600' : ''}`} />
                  </button>
                  
                  <div className="relative">
                    <button
                      onClick={() => setShowShareMenu(!showShareMenu)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                      title="Share course"
                    >
                      <Share2 className="h-5 w-5" />
                    </button>

                    {showShareMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-20">
                        <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b">
                          Share this course
                        </div>
                        <button
                          onClick={() => handleShare('twitter')}
                          className="w-full px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3"
                        >
                          <Twitter className="h-4 w-4 text-blue-400" />
                          Twitter
                        </button>
                        <button
                          onClick={() => handleShare('linkedin')}
                          className="w-full px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3"
                        >
                          <Linkedin className="h-4 w-4 text-blue-600" />
                          LinkedIn
                        </button>
                        <button
                          onClick={() => handleShare('facebook')}
                          className="w-full px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3"
                        >
                          <Facebook className="h-4 w-4 text-blue-700" />
                          Facebook
                        </button>
                        <button
                          onClick={() => handleShare('email')}
                          className="w-full px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3"
                        >
                          <Mail className="h-4 w-4 text-gray-600" />
                          Email
                        </button>
                        <button
                          onClick={() => handleShare('copy')}
                          className="w-full px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3"
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-400" />
                          )}
                          {copied ? 'Copied!' : 'Copy Link'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="prose prose-gray max-w-none">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                About This Course
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {course?.description}
              </p>
            </div>

            {/* What You'll Learn */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                What You'll Learn
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  'Master core concepts and principles',
                  'Build real-world projects and applications',
                  'Develop practical skills through hands-on exercises',
                  'Understand industry best practices',
                  'Gain confidence through practical experience'
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Course Content Preview */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Course Content
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <BookOpen className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <div className="text-xl font-bold text-gray-900">{lessonsCount}</div>
                  <div className="text-xs text-gray-500">Lessons</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Clock className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <div className="text-xl font-bold text-gray-900">
                    {course?.duration || 'Self'}
                  </div>
                  <div className="text-xs text-gray-500">Duration</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Award className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                  <div className="text-xl font-bold text-gray-900 capitalize">
                    {course?.level || 'Beginner'}
                  </div>
                  <div className="text-xs text-gray-500">Level</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Calendar className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <div className="text-sm font-medium text-gray-900">
                    {formatDate(course?.updatedAt)}
                  </div>
                  <div className="text-xs text-gray-500">Last Updated</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Stats & Actions */}
          <div className="space-y-6">
            {/* Enroll Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">
                  Free
                </div>
                <p className="text-sm text-gray-600 mt-1">Full course access</p>

                <button
                  onClick={onEnroll}
                  disabled={isLoading}
                  className="mt-4 w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : enrollment ? (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      Enrolled
                    </>
                  ) : (
                    <>
                      <Users className="h-5 w-5" />
                      Enroll Now
                    </>
                  )}
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-blue-200 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Students enrolled</span>
                  <span className="font-semibold text-gray-900">
                    {studentsEnrolled.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total lessons</span>
                  <span className="font-semibold text-gray-900">{lessonsCount}</span>
                </div>
                {totalProgress > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Your progress</span>
                    <span className="font-semibold text-blue-600">{totalProgress}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Rating Card */}
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="text-3xl font-bold text-gray-900">{rating}</div>
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map((star) => (
                      <Star 
                        key={star} 
                        className={`h-4 w-4 ${
                          star <= Math.round(rating) 
                            ? 'fill-yellow-400 text-yellow-400' 
                            : 'text-gray-300'
                        }`} 
                      />
                    ))}
                  </div>
                  <div className="text-xs text-gray-500">
                    {totalReviews.toLocaleString()} reviews
                  </div>
                </div>

                <div className="flex-1 space-y-1">
                  {ratingDistribution.map((item) => (
                    <div key={item.stars} className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5 text-xs">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {item.stars}
                      </div>
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-yellow-400 rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => window.scrollTo({ top: document.getElementById('reviews').offsetTop - 100, behavior: 'smooth' })}
                className="mt-3 w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Read all reviews →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Instructor Section */}
      <div className="border-t bg-gray-50 p-6 md:p-8">
        <div className="max-w-4xl">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Course Instructor
          </h3>
          
          <div className="flex flex-col md:flex-row gap-6">
            {/* Instructor Avatar */}
            <div className="flex-shrink-0">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                {instructor?.name?.[0]?.toUpperCase() || 'A'}
              </div>
            </div>

            {/* Instructor Info */}
            <div className="flex-1 space-y-3">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  {instructor?.name || 'Admin'}
                </h4>
                <p className="text-sm text-gray-600">
                  {instructor?.title || 'Course Instructor'}
                </p>
              </div>

              {instructor?.bio && (
                <p className="text-sm text-gray-700 leading-relaxed">
                  {instructor.bio}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm">
                {instructor?.email && (
                  <a 
                    href={`mailto:${instructor.email}`}
                    className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    {instructor.email}
                  </a>
                )}
                {instructor?.website && (
                  <a 
                    href={instructor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Globe className="h-4 w-4" />
                    Website
                  </a>
                )}
                {instructor?.twitter && (
                  <a 
                    href={`https://twitter.com/${instructor.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-blue-400 hover:text-blue-600 transition-colors"
                  >
                    <Twitter className="h-4 w-4" />
                    @{instructor.twitter}
                  </a>
                )}
              </div>

              {/* Instructor Stats */}
              <div className="flex flex-wrap gap-6 pt-2">
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {instructor?.coursesCount || 8}
                  </div>
                  <div className="text-xs text-gray-500">Courses</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {instructor?.studentsCount || '2.5k'}
                  </div>
                  <div className="text-xs text-gray-500">Students</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {instructor?.reviewsCount || '100+'}
                  </div>
                  <div className="text-xs text-gray-500">Reviews</div>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-lg font-semibold text-yellow-500">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {instructor?.rating || 4.8}
                  </div>
                  <div className="text-xs text-gray-500">Instructor Rating</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
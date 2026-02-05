import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { 
  collection, 
  query, 
  where, 
  getDocs,
  getDoc,
  doc,
  getCountFromServer,
  orderBy,
  limit,
  Timestamp,
  startAfter,
  endBefore
} from "firebase/firestore";
import {
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  Clock,
  Award,
  Eye,
  Calendar,
  DollarSign,
  CheckCircle
} from "lucide-react";

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("all"); // "7d", "30d", "90d", "all"
  const [stats, setStats] = useState({
    totalCourses: 0,
    publishedCourses: 0,
    totalUsers: 0,
    totalEnrollments: 0,
    completionRate: 0,
    averageWatchTime: "0h",
    revenue: 0,
    activeUsers: 0,
    totalLessons: 0,
    completedLessons: 0
  });

  const [chartData, setChartData] = useState({
    enrollments: [],
    users: [],
    revenue: []
  });

  const [topCourses, setTopCourses] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [userGrowth, setUserGrowth] = useState([]);
  const [enrollmentTrends, setEnrollmentTrends] = useState([]);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const getDateRange = () => {
    const now = new Date();
    let startDate = new Date();
    
    switch(timeRange) {
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate = null; // All time
    }
    
    return { startDate, endDate: now };
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const { startDate } = getDateRange();

      // Fetch all data in parallel for better performance
      const [
        coursesCount,
        usersCount,
        enrollmentsCount,
        enrollmentsData,
        usersData,
        allCourses,
        enrollmentsQuery
      ] = await Promise.all([
        getCountFromServer(collection(db, "courses")),
        getCountFromServer(collection(db, "users")),
        getCountFromServer(collection(db, "enrollments")),
        getDocs(collection(db, "enrollments")),
        getDocs(collection(db, "users")),
        getDocs(collection(db, "courses")),
        getDocs(query(collection(db, "enrollments"), orderBy("enrolledAt", "desc")))
      ]);

      // Get published courses
      const publishedQuery = query(collection(db, "courses"), where("published", "==", true));
      const publishedSnapshot = await getDocs(publishedQuery);

      // Calculate real completion rate
      let totalCompletedLessons = 0;
      let totalLessonsInCourses = 0;
      
      const enrollments = enrollmentsData.docs;
      enrollments.forEach(enrollment => {
        const data = enrollment.data();
        totalCompletedLessons += (data.completedLessons || []).length;
      });

      // Calculate total lessons across all courses
      for (const courseDoc of allCourses.docs) {
        const lessonsRef = collection(db, "courses", courseDoc.id, "lessons");
        const lessonsSnap = await getCountFromServer(lessonsRef);
        totalLessonsInCourses += lessonsSnap.data().count * enrollments.length;
      }

      const completionRate = totalLessonsInCourses > 0 
        ? Math.round((totalCompletedLessons / totalLessonsInCourses) * 100)
        : 0;

      // Calculate active users (users with enrollments in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const activeUsersQuery = query(
        collection(db, "enrollments"),
        where("lastAccessed", ">=", Timestamp.fromDate(thirtyDaysAgo))
      );
      const activeUsersSnap = await getDocs(activeUsersQuery);
      const activeUserIds = new Set(activeUsersSnap.docs.map(doc => doc.data().userId));
      
      // Get top enrolled courses with real data
      const coursesWithEnrollments = await Promise.all(
        allCourses.docs.map(async (docSnap) => {
          const enrollmentsRef = collection(db, "enrollments");
          const enrollmentsQuery = query(enrollmentsRef, where("courseId", "==", docSnap.id));
          const enrollmentsSnap = await getCountFromServer(enrollmentsQuery);
          
          return {
            id: docSnap.id,
            ...docSnap.data(),
            enrollments: enrollmentsSnap.data().count
          };
        })
      );

      // Sort by enrollments
      const sortedCourses = coursesWithEnrollments
        .filter(course => course.enrollments > 0)
        .sort((a, b) => b.enrollments - a.enrollments)
        .slice(0, 5);

      // Calculate total revenue from paid courses
      let totalRevenue = 0;
      const paidCourses = allCourses.docs.filter(doc => {
        const data = doc.data();
        return !data.isFree && data.price > 0;
      });

      for (const courseDoc of paidCourses) {
        const courseId = courseDoc.id;
        const courseData = courseDoc.data();
        
        const courseEnrollmentsQuery = query(
          collection(db, "enrollments"),
          where("courseId", "==", courseId)
        );
        const courseEnrollmentsSnap = await getDocs(courseEnrollmentsQuery);
        
        totalRevenue += courseEnrollmentsSnap.size * (courseData.price || 0);
      }

      // Generate real chart data from enrollments
      const enrollmentsByDay = {};
      const usersByDay = {};
      
      const now = new Date();
      const daysToShow = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 30;
      
      // Initialize days
      for (let i = daysToShow - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        enrollmentsByDay[dateKey] = 0;
        usersByDay[dateKey] = new Set();
      }

      // Process enrollments
      enrollmentsQuery.docs.forEach(doc => {
        const data = doc.data();
        const enrolledAt = data.enrolledAt?.toDate();
        
        if (enrolledAt) {
          const dateKey = enrolledAt.toISOString().split('T')[0];
          if (enrollmentsByDay.hasOwnProperty(dateKey)) {
            enrollmentsByDay[dateKey]++;
            usersByDay[dateKey].add(data.userId);
          }
        }
      });

      // Convert to chart data format
      const enrollmentChartData = Object.entries(enrollmentsByDay).map(([date, count]) => ({
        day: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count
      }));

      const userChartData = Object.entries(usersByDay).map(([date, userSet]) => ({
        day: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: userSet.size
      }));

      // Generate real recent activity
      const recentEnrollments = await getDocs(
        query(collection(db, "enrollments"), orderBy("enrolledAt", "desc"), limit(10))
      );

      const activity = [];
      for (const enrollmentDoc of recentEnrollments.docs) {
        const enrollmentData = enrollmentDoc.data();
        
        // Get user details
        const userDoc = await getDoc(doc(db, "users", enrollmentData.userId));
        const userData = userDoc.exists() ? userDoc.data() : null;
        
        // Get course details
        const courseDoc = await getDoc(doc(db, "courses", enrollmentData.courseId));
        const courseData = courseDoc.exists() ? courseDoc.data() : null;
        
        if (userData && courseData) {
          activity.push({
            type: "enrollment",
            user: userData.fullName || userData.email || "User",
            course: courseData.title,
            time: enrollmentData.enrolledAt?.toDate().toLocaleString() || "Recently"
          });
        }
      }

      // Calculate average watch time (mock for now - would need tracking)
      // You'd need to add a field to track watch time per lesson
      const averageWatchTime = "25m"; // Placeholder

      // Set all stats with real data
      setStats({
        totalCourses: coursesCount.data().count,
        publishedCourses: publishedSnapshot.size,
        totalUsers: usersCount.data().count,
        totalEnrollments: enrollmentsCount.data().count,
        completionRate,
        averageWatchTime,
        revenue: totalRevenue,
        activeUsers: activeUserIds.size,
        totalLessons: totalLessonsInCourses,
        completedLessons: totalCompletedLessons
      });

      setTopCourses(sortedCourses);
      setRecentActivity(activity);
      
      setChartData({
        enrollments: enrollmentChartData,
        users: userChartData,
        revenue: [] // You'd need payment data for this
      });

    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch(type) {
      case "enrollment": return <BookOpen size={16} className="text-blue-600" />;
      case "completion": return <Award size={16} className="text-green-600" />;
      case "registration": return <Users size={16} className="text-purple-600" />;
      case "course_published": return <Eye size={16} className="text-orange-600" />;
      default: return <Calendar size={16} className="text-gray-600" />;
    }
  };

  const StatCard = ({ title, value, icon: Icon, change, color, description }) => (
    <div className="bg-white rounded-xl p-6 shadow border hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Platform Analytics</h3>
          <p className="text-sm text-gray-600">Real-time data from your platform</p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All Time</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          icon={Users}
          color="bg-blue-500"
          description={`${stats.activeUsers} active users`}
        />
        <StatCard
          title="Total Enrollments"
          value={stats.totalEnrollments.toLocaleString()}
          icon={BookOpen}
          color="bg-green-500"
          description="Across all courses"
        />
        <StatCard
          title="Completion Rate"
          value={`${stats.completionRate}%`}
          icon={Award}
          color="bg-purple-500"
          description={`${stats.completedLessons}/${stats.totalLessons} lessons`}
        />
        
      </div>

      {/* Charts and Top Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollments Chart */}
        <div className="bg-white rounded-xl p-6 shadow border">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="font-semibold text-gray-900">Enrollment Trends</h4>
              <p className="text-sm text-gray-600">{timeRange === "all" ? "Last 30 days" : `Last ${timeRange}`}</p>
            </div>
            <BarChart3 className="text-blue-600" />
          </div>
          <div className="space-y-4">
            {chartData.enrollments.length > 0 ? (
              chartData.enrollments.map((item, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-20 text-sm text-gray-600">{item.day}</div>
                  <div className="flex-1 ml-4">
                    <div className="flex items-center">
                      <div 
                        className="h-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded"
                        style={{ 
                          width: `${Math.min((item.count / Math.max(...chartData.enrollments.map(d => d.count))) * 100, 100)}%` 
                        }}
                      />
                      <span className="ml-3 text-sm font-medium text-gray-900">{item.count}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No enrollment data for this period
              </div>
            )}
          </div>
        </div>

        {/* Top Courses */}
        <div className="bg-white rounded-xl p-6 shadow border">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-semibold text-gray-900">Top Performing Courses</h4>
            <TrendingUp className="text-green-600" />
          </div>
          <div className="space-y-4">
            {topCourses.length > 0 ? (
              topCourses.map((course, index) => (
                <div key={course.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      <span className="font-bold">#{index + 1}</span>
                    </div>
                    <div className="ml-3">
                      <div className="font-medium text-gray-900 truncate max-w-xs">
                        {course.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="capitalize">{course.category}</span>
                        <span>•</span>
                        <span>{course.enrollments} enrollments</span>
                        {course.isFree && <span className="text-green-600">FREE</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {course.enrollments.toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No enrollment data yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-6 shadow border">
        <div className="flex items-center justify-between mb-6">
          <h4 className="font-semibold text-gray-900">Recent Activity</h4>
          <Calendar className="text-gray-600" />
        </div>
        <div className="space-y-4">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">
                      <span className="font-semibold">{activity.user}</span>
                      <span className="font-normal text-gray-600 ml-2">
                        {activity.type === "enrollment" && `enrolled in`}
                        <span className="font-medium text-gray-900 ml-1">{activity.course}</span>
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">{activity.time}</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No recent activity
            </div>
          )}
        </div>
      </div>

      {/* Platform Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow border text-center">
          <div className="text-xl font-bold text-gray-900">{stats.publishedCourses}</div>
          <div className="text-sm text-gray-600 mt-1">Published Courses</div>
          <div className="text-xs text-gray-500 mt-2">
            {stats.totalCourses - stats.publishedCourses} in draft
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow border text-center">
          <div className="text-xl font-bold text-green-600">{stats.activeUsers}</div>
          <div className="text-sm text-gray-600 mt-1">Active Users</div>
          <div className="text-xs text-gray-500 mt-2">
            Last 30 days
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow border text-center">
          <div className="text-xl font-bold text-blue-600">
            {stats.totalUsers > 0 
              ? (stats.totalEnrollments / stats.totalUsers).toFixed(1)
              : "0.0"}
          </div>
          <div className="text-sm text-gray-600 mt-1">Avg. Courses per User</div>
          <div className="text-xs text-gray-500 mt-2">
            Engagement rate
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow border text-center">
          <div className="text-xl font-bold text-purple-600">{stats.averageWatchTime}</div>
          <div className="text-sm text-gray-600 mt-1">Avg. Watch Time</div>
          <div className="text-xs text-gray-500 mt-2">
            Per lesson
          </div>
        </div>
      </div>
    </div>
  );
}
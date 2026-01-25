import { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  updateDoc, 
  doc,
  where,
  serverTimestamp
} from "firebase/firestore";
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Mail,
  Calendar,
  BookOpen,
  Shield,
  RefreshCw,
  CheckCircle,
  XCircle
} from "lucide-react";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 20;

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    students: 0,
    admins: 0,
    activeToday: 0
  });

  // Fetch users with pagination
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, "users");
      
      let q;
      if (roleFilter !== "all") {
        q = query(usersRef, where("role", "==", roleFilter), orderBy("createdAt", "desc"));
      } else {
        q = query(usersRef, orderBy("createdAt", "desc"));
      }
      
      const snapshot = await getDocs(q);
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));
      
      setUsers(usersData);
      setTotalUsers(usersData.length);
      setHasMore(usersData.length === pageSize);
      
      // Calculate stats
      calculateStats(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (usersData) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const stats = {
      total: usersData.length,
      students: usersData.filter(u => u.role === "student").length,
      admins: usersData.filter(u => u.role === "admin").length,
      activeToday: usersData.filter(u => {
        const lastLogin = u.lastLogin?.toDate?.();
        return lastLogin && lastLogin >= today;
      }).length
    };
    
    setStats(stats);
  };

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      fetchUsers();
      return;
    }
    
    const filtered = users.filter(user => 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setUsers(filtered);
  };

  const updateUserRole = async (userId, newRole) => {
    if (!confirm(`Change this user's role to ${newRole}?`)) return;
    
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      
      // Recalculate stats
      calculateStats(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
      
      alert(`✅ User role updated to ${newRole}`);
    } catch (error) {
      console.error("Error updating user role:", error);
      alert("Failed to update user role");
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        status: currentStatus === "active" ? "suspended" : "active",
        updatedAt: serverTimestamp()
      });
      
      setUsers(prev => prev.map(user => 
        user.id === userId ? { 
          ...user, 
          status: currentStatus === "active" ? "suspended" : "active" 
        } : user
      ));
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };
const formatLastLogin = (date) => {
  if (!date) {
    return (
      <div className="flex flex-col">
        <span className="text-gray-400 italic">Never logged in</span>
        <span className="text-xs text-gray-500 mt-1">User has never signed in</span>
      </div>
    );
  }
  
  const dateObj = date instanceof Date ? date : date.toDate?.() || new Date(date);
  const now = new Date();
  const diffMs = now - dateObj;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  const getTimeAgo = () => {
    if (diffHours < 1) {
      const mins = Math.floor(diffMs / (1000 * 60));
      return mins < 1 ? "just now" : `${mins} minutes ago`;
    }
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };
  
  const getStatusColor = () => {
    if (diffHours < 24) return "text-green-600 bg-green-50";
    if (diffDays < 7) return "text-blue-600 bg-blue-50";
    if (diffDays < 30) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };
  
  return (
    <div className="flex flex-col">
      <span className={`text-xs px-2 py-1 rounded inline-block w-fit ${getStatusColor()}`}>
        {getTimeAgo()}
      </span>
      <span className="text-xs text-gray-500 mt-1">
        {dateObj.toLocaleDateString()}
      </span>
    </div>
  );
};
  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const formatDate = (date) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString();
  };

  const getRoleColor = (role) => {
    switch(role) {
      case "admin": return "bg-purple-100 text-purple-800";
      case "tutor": return "bg-green-100 text-green-800";
      default: return "bg-blue-100 text-blue-800";
    }
  };

  const getStatusColor = (status) => {
    return status === "active" 
      ? "bg-green-100 text-green-800" 
      : "bg-red-100 text-red-800";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
          <p className="text-sm text-gray-600">Manage all users in your platform</p>
        </div>
        <button
          onClick={fetchUsers}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 shadow border">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Users</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow border">
          <div className="text-2xl font-bold text-blue-600">{stats.students}</div>
          <div className="text-sm text-gray-600">Students</div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow border">
          <div className="text-2xl font-bold text-purple-600">{stats.admins}</div>
          <div className="text-sm text-gray-600">Admins</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow border">
          <div className="text-2xl font-bold text-orange-600">{stats.activeToday}</div>
          <div className="text-sm text-gray-600">Active Today</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl p-4 shadow border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="tutor">Tutors</option>
              <option value="admin">Admins</option>
            </select>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Search
            </button>
            <button
              onClick={() => {
                setSearchTerm("");
                setRoleFilter("all");
                fetchUsers();
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.slice((page - 1) * pageSize, page * pageSize).map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          {user.avatarColor ? (
                            <div 
                              className="h-10 w-10 rounded-full"
                              style={{ backgroundColor: user.avatarColor }}
                            />
                          ) : (
                            <span className="text-blue-600 font-semibold">
                              {user.email?.[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="ml-3">
                          <div className="font-medium text-gray-900">
                            {user.fullName || "No name set"}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail size={12} />
                            {user.email}
                          </div>
                          {user.enrolledCourses && (
                            <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                              <BookOpen size={12} />
                              {user.enrolledCourses.length} courses
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(user.status)}`}>
                        {user.status || "active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(user.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatDate(user.lastLogin)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <select
                          value={user.role}
                          onChange={(e) => updateUserRole(user.id, e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="student">Student</option>
                          
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() => toggleUserStatus(user.id, user.status)}
                          className={`text-xs px-2 py-1 rounded flex items-center justify-center gap-1 ${
                            user.status === "active" 
                              ? "bg-red-50 text-red-700 hover:bg-red-100" 
                              : "bg-green-50 text-green-700 hover:bg-green-100"
                          }`}
                        >
                          {user.status === "active" ? (
                            <>
                              <XCircle size={12} />
                              Suspend
                            </>
                          ) : (
                            <>
                              <CheckCircle size={12} />
                              Activate
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {users.length > pageSize && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to{" "}
              <span className="font-medium">{Math.min(page * pageSize, users.length)}</span> of{" "}
              <span className="font-medium">{users.length}</span> users
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded-lg disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-1 text-sm">
                Page {page} of {Math.ceil(users.length / pageSize)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(users.length / pageSize)}
                className="px-3 py-1 border rounded-lg disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h4 className="font-medium text-gray-900 mb-3">User Statistics</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-white rounded-lg">
            <div className="text-lg font-bold text-gray-900">{stats.students}</div>
            <div className="text-sm text-gray-600">Students</div>
          </div>
          
          <div className="text-center p-3 bg-white rounded-lg">
            <div className="text-lg font-bold text-purple-600">{stats.admins}</div>
            <div className="text-sm text-gray-600">Admins</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg">
            <div className="text-lg font-bold text-orange-600">{stats.activeToday}</div>
            <div className="text-sm text-gray-600">Active Today</div>
          </div>
        </div>
      </div>
    </div>
  );
}
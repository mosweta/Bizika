// src/components/admin/AdminDashboard.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, functions } from "../firebase/config";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db } from "../firebase/config";
import Analytics from "./analytics";
import UserManagement from "./usermanagement";
import ContentLibrary from "./contentlibrary";
import QuizManager from "./quizmanager";
import CourseManager from "./courses";

import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Video, 
  FileText, 
  BarChart,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Home,
  RefreshCw,
  Search,
  Bell,
  HelpCircle,
  Settings
} from "lucide-react";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(false);
  const [initResult, setInitResult] = useState(null);
  const [initError, setInitError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState(3);
  const sidebarRef = useRef(null);
  const navigate = useNavigate();

  // Auto-adjust sidebar based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        // Desktop large: sidebar always open, can collapse
        setSidebarOpen(true);
      } else if (window.innerWidth >= 1024) {
        // Desktop: sidebar always open
        setSidebarOpen(true);
        setCollapsed(false);
      } else if (window.innerWidth >= 768) {
        // Tablet: sidebar closed by default, can open
        setSidebarOpen(false);
        setCollapsed(false);
      } else {
        // Mobile: sidebar closed, slide in overlay
        setSidebarOpen(false);
        setCollapsed(false);
      }
    };

    // Set initial state
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar when clicking outside on mobile/tablet
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (window.innerWidth < 1024 && 
          sidebarRef.current && 
          !sidebarRef.current.contains(event.target) && 
          !event.target.closest('#sidebar-toggle') && 
          sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sidebarOpen]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      const userDoc = await getDoc(doc(db, "users", currentUser.uid));

      if (!userDoc.exists() || userDoc.data().role !== "admin") {
        navigate("/unauthorized");
        return;
      }

      setUser(currentUser);
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Initialize enrollment counts function
  const initializeAllCounts = async () => {
    try {
      setInitializing(true);
      setInitError(null);
      setInitResult(null);
      
      const initializeCounts = httpsCallable(functions, 'initializeAllEnrollmentCounts');
      const result = await initializeCounts();
      
      setInitResult(result.data);
      console.log('✅ Initialization successful:', result.data);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setInitResult(null);
      }, 5000);
      
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      setInitError(error.message || "Failed to initialize counts");
      
      // Clear error after 5 seconds
      setTimeout(() => {
        setInitError(null);
      }, 5000);
    } finally {
      setInitializing(false);
    }
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, badge: null },
    { id: "courses", label: "Course Manager", icon: BookOpen, badge: null },
    { id: "users", label: "User Management", icon: Users, badge: null },
    { id: "content", label: "Content Library", icon: Video, badge: null},
    { id: "analytics", label: "Analytics", icon: BarChart, badge: null },
    { id: "quizzes", label: "Quiz Manager", icon: FileText, badge: null },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <CourseManager />;
      case "courses":
        return <CourseManager />;
      case "users":
        return <UserManagement />;
      case "analytics":
        return <Analytics />;
      case "content":
        return <ContentLibrary />;
      case "quizzes":
        return <QuizManager />;
      default:
        return <CourseManager />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar - Mobile */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              id="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Pavoc LMS Admin</h1>
              <p className="text-xs text-gray-500 capitalize">
                {activeTab.replace("-", " ")}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            
            
            {/* User Avatar */}
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user?.email?.[0]?.toUpperCase() || "A"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar Overlay - Mobile/Tablet */}
      {sidebarOpen && window.innerWidth < 1024 && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        ref={sidebarRef}
        id="admin-sidebar"
        className={`fixed lg:relative inset-y-0 left-0 z-40 transform transition-all duration-300 ease-in-out ${
          sidebarOpen 
            ? collapsed ? 'w-20' : 'w-64' 
            : '-translate-x-full'
        } lg:translate-x-0 lg:flex lg:flex-shrink-0`}
      >
        <div className="flex flex-col h-full bg-white border-r border-gray-200 shadow-lg lg:shadow-none">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <div className={`flex items-center gap-3 ${collapsed ? 'justify-center w-full' : ''}`}>
              <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              {!collapsed && (
                <h1 className="text-lg font-bold text-gray-900">Pavoc Admin</h1>
              )}
            </div>
            
            {/* Desktop Toggle Collapse Button */}
            {sidebarOpen && window.innerWidth >= 1024 && !collapsed && (
              <button
                onClick={() => setCollapsed(true)}
                className="hidden lg:block p-1 hover:bg-gray-100 rounded"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            
            {sidebarOpen && window.innerWidth >= 1024 && collapsed && (
              <button
                onClick={() => setCollapsed(false)}
                className="hidden lg:block p-1 hover:bg-gray-100 rounded rotate-180"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            
            {/* Mobile Close Button */}
            {window.innerWidth < 1024 && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* User Info - Only show when not collapsed */}
          {!collapsed && (
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold">
                    {user?.email?.[0]?.toUpperCase() || "A"}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">Administrator</p>
                  <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Collapsed User Info */}
          {collapsed && (
            <div className="py-4 border-b border-gray-200 flex justify-center">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-semibold">
                  {user?.email?.[0]?.toUpperCase() || "A"}
                </span>
              </div>
            </div>
          )}

          

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                    activeTab === item.id
                      ? "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200 shadow-sm"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:shadow-sm"
                  } ${collapsed ? 'justify-center' : ''}`}
                  title={collapsed ? item.label : ''}
                >
                  <div className="relative">
                    <Icon size={20} className="flex-shrink-0" />
                    {item.badge && !collapsed && (
                      <span className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {!collapsed && (
                    <>
                      <span className="font-medium text-left flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Initialize Counts Button */}
          <div className="p-3 border-t border-gray-200">
            <button
              onClick={initializeAllCounts}
              disabled={initializing}
              className={`w-full flex items-center justify-center gap-2 px-3 py-3 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 hover:from-green-100 hover:to-emerald-100 border border-green-200 rounded-lg transition-all disabled:opacity-50 active:scale-[0.98] ${
                collapsed ? 'px-3' : ''
              }`}
              title={collapsed ? "Refresh Counts" : ""}
            >
              <RefreshCw size={18} className={initializing ? "animate-spin" : ""} />
              {!collapsed && (
                <span className="font-medium text-sm">
                  {initializing ? "Initializing..." : "Refresh Counts"}
                </span>
              )}
            </button>
            
            {/* Status Messages */}
            {!collapsed && initResult && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs text-green-700">
                  ✅ {initResult.processed} courses updated
                </p>
              </div>
            )}
            
            {!collapsed && initError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700">
                  ❌ {initError}
                </p>
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="p-3 border-t border-gray-200 space-y-2">
            
            {collapsed && (
              <button
                onClick={() => navigate("/")}
                className="w-full flex items-center justify-center p-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Site"
              >
                <Home size={20} />
              </button>
            )}
            
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-3 py-3 text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-100 ${
                collapsed ? 'justify-center' : ''
              }`}
              title={collapsed ? "Log Out" : ""}
            >
              <LogOut size={20} />
              {!collapsed && <span className="font-medium text-sm">Log Out</span>}
            </button>
          </div>

          {/* Settings Button - Bottom */}
          
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col transition-all duration-300 ${
        sidebarOpen 
          ? collapsed ? 'lg:ml-20' : 'lg:ml-64' 
          : 'lg:ml-0'
      }`}>
        {/* Desktop Header */}
        <header className="hidden lg:block bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4">
                  {/* Desktop Sidebar Toggle */}
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    {sidebarOpen ? (
                      <Menu size={20} />
                    ) : (
                      <Menu size={20} />
                    )}
                  </button>
                  
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 capitalize">
                      {activeTab.replace("-", " ")}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Manage your LMS platform
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Search Bar - Desktop */}
                <div className="relative hidden md:block">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search admin panel..."
                    className="pl-10 pr-4 py-2 w-64 bg-gray-100 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                
                {/* Desktop Init Status */}
                {initResult && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200">
                    <RefreshCw size={14} />
                    <span className="text-sm">
                      {initResult.processed} courses updated
                    </span>
                  </div>
                )}
                
                {initError && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg border border-red-200">
                    <span className="text-sm">❌ {initError}</span>
                  </div>
                )}
                

                
                {/* User Profile Dropdown */}
                <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                  <div className="text-right">
                    <p className="font-medium text-gray-900 text-sm">Administrator</p>
                    <p className="text-xs text-gray-500 truncate max-w-[150px]">{user?.email}</p>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {user?.email?.[0]?.toUpperCase() || "A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Container - Add padding for mobile header */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto mt-16 lg:mt-0 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            {/* Breadcrumb - Desktop */}
            <div className="hidden lg:flex items-center gap-2 mb-6 text-sm text-gray-600">
              <span className="hover:text-blue-600 cursor-pointer">Admin</span>
              <ChevronLeft size={14} className="rotate-180" />
              <span className="text-gray-900 font-medium capitalize">
                {activeTab.replace("-", " ")}
              </span>
            </div>
            
           
            
            {/* Main Content */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {renderContent()}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation - Only for small screens */}
      {window.innerWidth < 768 && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-xl lg:hidden">
          <div className="flex justify-around px-1">
            {menuItems.slice(0, 4).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center py-3 px-1 flex-1 min-w-0 ${
                    activeTab === item.id
                      ? "text-blue-600 bg-blue-50 mx-1 rounded-lg"
                      : "text-gray-600"
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-xs mt-1 truncate w-full text-center">
                    {item.label.split(' ')[0]}
                  </span>
                </button>
              );
            })}
            
            {/* More button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex flex-col items-center py-3 px-1 flex-1 min-w-0 text-gray-600"
            >
              <Menu size={20} />
              <span className="text-xs mt-1">More</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
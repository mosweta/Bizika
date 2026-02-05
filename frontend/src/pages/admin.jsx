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
import AdminLearnDashboard from "./adminlearn.jsx";

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
  Home,
  RefreshCw,
  Search,
  HelpCircle,
  Settings,
  ChevronRight,
  Plus,
  Download,
  Upload,
  Eye,
  MoreVertical
} from "lucide-react";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(false);
  const [initResult, setInitResult] = useState(null);
  const [initError, setInitError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sidebarRef = useRef(null);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();

  // Detect mobile/tablet
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        // Desktop: always show sidebar
        setSidebarOpen(true);
        setShowSearch(false);
      } else {
        // Mobile: hide sidebar by default
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobile && 
          sidebarOpen && 
          sidebarRef.current && 
          !sidebarRef.current.contains(event.target) && 
          !event.target.closest('#sidebar-toggle') &&
          !event.target.closest('#mobile-nav-more')) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [sidebarOpen, isMobile]);

  // Focus search input when opened
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      setTimeout(() => searchInputRef.current.focus(), 100);
    }
  }, [showSearch]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Close sidebar with Escape
      if (e.key === 'Escape') {
        if (sidebarOpen && isMobile) {
          setSidebarOpen(false);
        }
        if (showSearch) {
          setShowSearch(false);
        }
      }
      // Search shortcut (Cmd/Ctrl + K)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen, showSearch, isMobile]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobile, sidebarOpen]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      const userDoc = await getDoc(doc(db, "users", currentUser.uid));

      if (!userDoc.exists() || userDoc.data().role !== "admin") {
        navigate("/login");
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
      alert("Logout failed. Please try again.");
    }
  };

  // Search function
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      alert(`Searching for: ${searchQuery}`);
      console.log("Search query:", searchQuery);
      setSearchQuery("");
      setShowSearch(false);
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
      
      setTimeout(() => setInitResult(null), 5000);
      
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      setInitError(error.message || "Failed to initialize counts");
      setTimeout(() => setInitError(null), 5000);
    } finally {
      setInitializing(false);
    }
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, badge: null },
    { id: "courses", label: "Learning", icon: BookOpen, badge: null },
    { id: "users", label: "User Management", icon: Users, badge: null },
    { id: "content", label: "Content Library", icon: Video, badge: null },
    { id: "analytics", label: "Analytics", icon: BarChart, badge: null },
    { id: "quizzes", label: "Quiz Manager", icon: FileText, badge: null },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <CourseManager />;
      case "courses":
        return <AdminLearnDashboard />;
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Search Overlay */}
      {showSearch && isMobile && (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="flex items-center h-16 px-4 border-b border-gray-200">
            <form onSubmit={handleSearch} className="flex-1 flex items-center">
              <button
                type="button"
                onClick={() => setShowSearch(false)}
                className="p-2 mr-2"
                aria-label="Close search"
              >
                <X size={24} />
              </button>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search admin panel..."
                className="flex-1 border-none outline-none text-lg"
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-2 text-gray-400"
                  aria-label="Clear search"
                >
                  <X size={20} />
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Sidebar - Desktop: static, Mobile: overlay with scroll */}
      <aside 
        ref={sidebarRef}
        className={`
          fixed lg:relative inset-y-0 left-0 z-40
          bg-white border-r border-gray-200
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarOpen ? 'w-64 md:w-72' : 'lg:w-20'}
          flex-shrink-0
          flex flex-col
          h-screen
          lg:h-auto
        `}
      >
        {/* Scrollable container for mobile */}
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 shrink-0">
            <div className={`flex items-center gap-3 ${!sidebarOpen && !isMobile ? 'justify-center w-full' : ''}`}>
              <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              {sidebarOpen && (
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Pavoc Admin</h1>
                  <p className="text-xs text-gray-500">Dashboard</p>
                </div>
              )}
            </div>
            
            {/* Mobile Close Button */}
            {isMobile && sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Close sidebar"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* User Info */}
          <div className={`p-4 border-b border-gray-200 shrink-0 ${!sidebarOpen && !isMobile ? 'flex justify-center' : ''}`}>
            {sidebarOpen ? (
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
            ) : (
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto">
                <span className="text-white font-semibold">
                  {user?.email?.[0]?.toUpperCase() || "A"}
                </span>
              </div>
            )}
          </div>

          {/* Navigation - Scrollable on mobile */}
          <div className="flex-1 overflow-y-auto">
            <nav className="p-3 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (isMobile) {
                        setSidebarOpen(false);
                      }
                    }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all
                      ${isActive
                        ? "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      }
                      ${!sidebarOpen && !isMobile ? 'justify-center' : ''}
                    `}
                    title={!sidebarOpen && !isMobile ? item.label : ''}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon size={20} className="flex-shrink-0" />
                    {sidebarOpen && (
                      <>
                        <span className="font-medium text-left flex-1 truncate">{item.label}</span>
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
          </div>

          {/* Action Buttons - Fixed at bottom */}
          <div className="p-3 space-y-2 border-t border-gray-200 shrink-0">
            {/* Refresh Button */}
            <button
              onClick={initializeAllCounts}
              disabled={initializing}
              className={`
                w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg
                bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 
                hover:from-green-100 hover:to-emerald-100 border border-green-200 
                transition-all disabled:opacity-50
                ${!sidebarOpen && !isMobile ? 'px-3' : ''}
              `}
              title={!sidebarOpen && !isMobile ? "Refresh Counts" : ""}
            >
              <RefreshCw size={18} className={initializing ? "animate-spin" : ""} />
              {sidebarOpen && (
                <span className="font-medium text-sm">
                  {initializing ? "Initializing..." : "Refresh Counts"}
                </span>
              )}
            </button>

            {/* Status Messages */}
            {sidebarOpen && initResult && (
              <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs text-green-700">
                  ✅ {initResult.processed} courses updated
                </p>
              </div>
            )}
            
            {sidebarOpen && initError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700">
                  ❌ {initError}
                </p>
              </div>
            )}

            {/* Home Button */}
            <button
              onClick={() => navigate("/")}
              className={`
                w-full flex items-center gap-3 px-3 py-3 rounded-lg
                text-gray-700 hover:bg-gray-100 transition-colors
                ${!sidebarOpen && !isMobile ? 'justify-center' : ''}
              `}
              title={!sidebarOpen && !isMobile ? "Back to Site" : ""}
            >
              <Home size={20} />
              {sidebarOpen && <span className="font-medium text-sm">Back to Site</span>}
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className={`
                w-full flex items-center gap-3 px-3 py-3 rounded-lg
                text-red-700 hover:bg-red-50 border border-red-100 transition-colors
                ${!sidebarOpen && !isMobile ? 'justify-center' : ''}
              `}
              title={!sidebarOpen && !isMobile ? "Log Out" : ""}
            >
              <LogOut size={20} />
              {sidebarOpen && <span className="font-medium text-sm">Log Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="h-16 flex items-center justify-between px-4">
            {/* Left: Menu Button & Title */}
            <div className="flex items-center gap-3">
              <button
                id="sidebar-toggle"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
                aria-label="Toggle menu"
              >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg hidden lg:block"
                aria-label="Toggle sidebar"
              >
                <Menu size={24} />
              </button>
              
              <div>
                <h1 className="text-lg font-bold text-gray-900 truncate max-w-[180px] sm:max-w-none">
                  Pavoc LMS Admin
                </h1>
                <p className="text-xs text-gray-500 capitalize hidden sm:block">
                  {activeTab.replace("-", " ")}
                </p>
              </div>
            </div>

            {/* Center: Desktop Search */}
            

            {/* Right: Actions - UPDATED for mobile */}
            <div className="flex items-center gap-2">
              {/* Status Indicators */}
              {initResult && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg border border-green-200">
                  <RefreshCw size={14} />
                  <span className="text-xs">
                    {initResult.processed} courses updated
                  </span>
                </div>
              )}
              
              {initError && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg border border-red-200">
                  <span className="text-xs">❌ {initError}</span>
                </div>
              )}

              {/* Mobile: Home Button (replaces search) */}
              {isMobile && (
                <button
                  onClick={() => navigate("/")}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-700"
                  title="Go to Home"
                >
                  <Home size={20} />
                </button>
              )}

              {/* Mobile: Logout Button (replaces three dots) */}
              {isMobile && (
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                  title="Log Out"
                >
                  <LogOut size={20} />
                </button>
              )}

              {/* Desktop: Home Button */}
              {!isMobile && (
                <button
                  onClick={() => navigate("/")}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-700 hidden lg:flex items-center gap-2"
                  title="Go to Home"
                >
                  <Home size={20} />
                  <span className="text-sm hidden lg:inline">Home</span>
                </button>
              )}

              {/* Desktop: User Profile */}
              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <p className="font-medium text-gray-900 text-sm">Administrator</p>
                  <p className="text-xs text-gray-500 truncate max-w-[120px]">
                    {user?.email}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-xs">
                    {user?.email?.[0]?.toUpperCase() || "A"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Breadcrumb */}
        {isMobile && (
          <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <span>Admin</span>
              <ChevronRight size={14} />
              <span className="font-medium text-gray-900 capitalize">
                {activeTab.replace("-", " ")}
              </span>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-4 md:p-6">
            {/* Desktop Breadcrumb */}
            <div className="hidden lg:flex items-center gap-2 mb-6 text-sm text-gray-600">
              <button 
                onClick={() => setActiveTab("dashboard")}
                className="hover:text-blue-600 cursor-pointer"
              >
                Admin
              </button>
              <ChevronRight size={14} />
              <span className="text-gray-900 font-medium capitalize">
                {activeTab.replace("-", " ")}
              </span>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {renderContent()}
            </div>

            {/* Mobile Help Section */}
            {/* Mobile Help Section */}
            {isMobile && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <HelpCircle size={18} className="text-blue-600" />
                  <h3 className="font-medium text-blue-900">Need Help?</h3>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  Use the bottom navigation to quickly switch between sections.
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => alert("Support contact")}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                  >
                    
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
         

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
          <div className="flex justify-around px-1 py-2">
            {menuItems.slice(0, 4).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`
                    flex flex-col items-center py-2 px-1 flex-1 min-w-0
                    ${isActive ? "text-blue-600" : "text-gray-500"}
                  `}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon size={20} />
                  <span className="text-xs mt-1 truncate w-full text-center">
                    {item.label.split(' ')[0]}
                  </span>
                  {isActive && (
                    <div className="h-1 w-1/2 bg-blue-600 rounded-full mt-1"></div>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
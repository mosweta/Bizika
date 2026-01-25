// src/components/admin/AdminDashboard.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase/config";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import Analytics from "./analytics";
import UserManagement from "./usermanagement";
import ContentLibrary from "./contentlibrary";

import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Video, 
  FileText, 
  BarChart,
  LogOut,
  Menu,
  X
} from "lucide-react";
import CourseManager from "./courses";
// import UserManagement from "./UserManagement";
// import Analytics from "./Analytics";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("courses");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

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

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    // { id: "courses", label: "Course Manager", icon: BookOpen },
    { id: "users", label: "User Management", icon: Users },
    { id: "content", label: "Content Library", icon: Video },
    { id: "analytics", label: "Analytics", icon: BarChart },
  ];

  const renderContent = () => {
    switch (activeTab) {
    //   case "courses":
    //     return <CourseManager />;
      case "users":
        return <UserManagement />;
      case "analytics":
        return <Analytics />;
      case "content":
        return <ContentLibrary />;
      default:
        return <CourseManager />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-white shadow-md"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed lg:relative inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:flex lg:flex-shrink-0`}>
          <div className="flex flex-col w-64 h-full bg-white border-r border-gray-200">
            {/* Logo */}
            <div className="flex items-center h-16 px-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Bizika Admin</h1>
              </div>
            </div>

            {/* User info */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">
                    {user?.email?.[0]?.toUpperCase() || "A"}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Administrator</p>
                  <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === item.id
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Logout button */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors"
              >
                <LogOut size={20} />
                <span className="font-medium">Log Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-white border-b border-gray-200">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 capitalize">
                    {activeTab.replace("-", " ")}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Manage your LMS platform
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden lg:block text-sm text-gray-600">
                    Admin Panel
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 p-4 md:p-6 overflow-y-auto">
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
}
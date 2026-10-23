// src/pages/admin.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/config";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import Analytics from "./analytics";
import UserManagement from "./usermanagement";
import ContentLibrary from "./contentlibrary";
import QuizManager from "./quizmanager";
import CourseManager from "./courses";
import AdminLearnDashboard from "./adminlearn";

import {
  LayoutDashboard, BookOpen, Users, Video, BarChart3, FileText,
  LogOut, Menu, X, Home, ChevronRight, MoreHorizontal,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Nav config — single source of truth
// ─────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "courses",   label: "Learning",  icon: BookOpen },
  { id: "users",     label: "Users",     icon: Users },
  { id: "content",   label: "Content",   icon: Video },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "quizzes",   label: "Quizzes",   icon: FileText },
];

const MOBILE_PRIMARY = NAV_ITEMS.slice(0, 4);
const MOBILE_MORE    = NAV_ITEMS.slice(4);

// ─────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────
function Sidebar({
  activeTab, setActiveTab,
  onHome, onLogout,
  collapsed, setCollapsed,
  isMobile, open, setOpen,
}) {
  const isTablet = !isMobile && collapsed; // icon-rail
  const isDrawer = isMobile;

  const widthClass = isDrawer ? "w-64" : isTablet ? "w-16" : "w-64";

  return (
    <>
      {isDrawer && open && (
        <div
          className="fixed inset-0 z-30 bg-black/40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-40 h-screen
          bg-white border-r border-slate-200
          flex flex-col flex-shrink-0
          transition-all duration-200
          ${widthClass}
          ${isDrawer
            ? open ? "translate-x-0" : "-translate-x-full"
            : "translate-x-0"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-slate-200 flex-shrink-0">
          <button
            onClick={onHome}
            className={`flex items-center gap-2.5 ${isTablet ? "mx-auto" : ""}`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-800 flex-shrink-0">
              <BookOpen className="h-4 w-4 text-white" />
            </span>
            {!isTablet && (
              <span className="text-sm font-semibold tracking-tight text-slate-900">
                Bizika LMS
              </span>
            )}
          </button>
          {isDrawer && (
            <button
              onClick={() => setOpen(false)}
              className="ml-auto p-1.5 text-slate-400 hover:text-slate-700 rounded"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (isDrawer) setOpen(false);
                }}
                title={isTablet ? item.label : undefined}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5 text-sm
                  transition-colors
                  ${active
                    ? "bg-blue-50 text-blue-800 font-medium"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}
                  ${isTablet ? "justify-center px-3" : ""}
                `}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!isTablet && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="border-t border-slate-200 py-3 flex-shrink-0">
          <button
            onClick={onHome}
            title={isTablet ? "Home" : undefined}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors ${
              isTablet ? "justify-center px-3" : ""
            }`}
          >
            <Home className="h-4 w-4 flex-shrink-0" />
            {!isTablet && <span>Home</span>}
          </button>
          <button
            onClick={onLogout}
            title={isTablet ? "Sign out" : undefined}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors ${
              isTablet ? "justify-center px-3" : ""
            }`}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!isTablet && <span>Sign out</span>}
          </button>
        </div>

        {/* Desktop collapse toggle */}
        {!isDrawer && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center h-9 border-t border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform ${collapsed ? "" : "rotate-180"}`}
            />
          </button>
        )}
      </aside>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────
function Header({ activeTab, user, onMenuClick, onLogout }) {
  const current = NAV_ITEMS.find((n) => n.id === activeTab);
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight text-slate-900 truncate">
              {current?.label || "Admin"}
            </h1>
            <p className="text-xs text-slate-500 truncate hidden sm:block">
              Bizika LMS Admin
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:block text-right">
            <div className="text-sm font-medium text-slate-900">Administrator</div>
            <div className="text-xs text-slate-500 truncate max-w-[180px]">
              {user?.email}
            </div>
          </div>
          <div className="h-8 w-8 rounded-full bg-blue-800 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">
              {user?.email?.[0]?.toUpperCase() || "A"}
            </span>
          </div>
          <button
            onClick={onLogout}
            className="hidden md:flex p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
// Mobile bottom nav — 4 primary + More
// ─────────────────────────────────────────────────────────────
function MobileBottomNav({ activeTab, setActiveTab }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MOBILE_MORE.some((n) => n.id === activeTab);

  return (
    <>
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/30 md:hidden"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-slate-200 md:hidden">
            {MOBILE_MORE.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMoreOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-5 py-3 text-sm border-b border-slate-100 last:border-0 ${
                    active
                      ? "bg-blue-50 text-blue-800 font-medium"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 md:hidden">
        <div className="flex">
          {MOBILE_PRIMARY.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex-1 flex flex-col items-center py-2.5 ${
                  active ? "text-blue-800" : "text-slate-500"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="mt-0.5 text-[10px] truncate w-full text-center">
                  {item.label}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex-1 flex flex-col items-center py-2.5 ${
              moreActive || moreOpen ? "text-blue-800" : "text-slate-500"
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="mt-0.5 text-[10px]">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const navigate = useNavigate();

  // Breakpoint tracking
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = isMobile && sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, sidebarOpen]);

  // Esc closes drawer
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && isMobile) setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobile]);

  // Auth guard
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) return navigate("/login");
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (!snap.exists() || snap.data().role !== "admin") {
          return navigate("/login");
        }
        setUser(u);
      } catch (e) {
        console.error("auth check failed:", e);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return <CourseManager />;
      case "courses":   return <AdminLearnDashboard />;
      case "users":     return <UserManagement />;
      case "analytics": return <Analytics />;
      case "content":   return <ContentLibrary />;
      case "quizzes":   return <QuizManager />;
      default:          return <CourseManager />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-blue-800 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onHome={() => navigate("/")}
        onLogout={handleLogout}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        isMobile={isMobile}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          activeTab={activeTab}
          user={user}
          onMenuClick={() => setSidebarOpen(true)}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 pb-24 md:pb-6">
            {renderContent()}
          </div>
        </main>
      </div>

      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    </div>
  );
}
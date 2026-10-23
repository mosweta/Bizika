// src/pages/home/header.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { auth, db } from "../../firebase/config";
import { doc, getDoc } from "firebase/firestore";
import {
  Menu, X, ChevronDown, LogOut, Home as HomeIcon, BookMarked, BookOpen,
} from "lucide-react";

export default function Header() {
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setUser);
    return () => unsub();
  }, []);

  const goToDashboard = async () => {
    const current = auth.currentUser;
    if (!current) return navigate("/login");
    const userDoc = await getDoc(doc(db, "users", current.uid));
    if (!userDoc.exists()) return navigate("/login");
    const role = userDoc.data().role?.toLowerCase() || "student";
    navigate(role === "admin" ? "/admin/dashboard" : "/student/dashboard");
  };

  const handleLogout = async () => {
    await auth.signOut();
    setMobileMenuOpen(false);
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-800">
              <BookOpen className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Bizika LMS</span>
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/courses" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Courses
            </Link>
            <Link to="/contact" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Contact
            </Link>

            {user ? (
              <div className="relative group">
                <button className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <span className="h-8 w-8 rounded-full bg-blue-800 text-white text-xs font-semibold flex items-center justify-center">
                    {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                  </span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
                <div className="absolute right-0 mt-2 w-52 origin-top-right rounded-lg border border-slate-200 bg-white opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <button
                    onClick={goToDashboard}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-t-lg"
                  >
                    <HomeIcon className="h-4 w-4" /> Dashboard
                  </button>
                  <Link
                    to="/courses"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <BookMarked className="h-4 w-4" /> Browse courses
                  </Link>
                  <div className="border-t border-slate-100" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate("/login")}
                  className="text-sm font-medium text-slate-700 hover:text-slate-900"
                >
                  Sign in
                </button>
                <button
                  onClick={() => navigate("/signup")}
                  className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 transition-colors"
                >
                  Get started
                </button>
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-700"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-slate-200 md:hidden">
          <div className="px-4 py-4 space-y-1">
            <Link
              to="/courses"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
            >
              Courses
            </Link>
            <Link
              to="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
            >
              Contact
            </Link>
            {user ? (
              <>
                <button
                  onClick={() => {
                    goToDashboard();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                >
                  Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <button
                  onClick={() => {
                    navigate("/login");
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
                >
                  Sign in
                </button>
                <button
                  onClick={() => {
                    navigate("/signup");
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full rounded-lg bg-blue-800 px-3 py-2 text-sm font-medium text-white"
                >
                  Get started
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
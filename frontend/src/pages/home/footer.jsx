// src/pages/home/footer.jsx
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-800">
                <BookOpen className="h-4 w-4 text-white" />
              </span>
              <span className="text-base font-semibold tracking-tight">Bizika LMS</span>
            </div>
            <p className="mt-4 text-sm text-slate-500 leading-relaxed">
              A focused learning platform for professionals.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900">Platform</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link to="/courses" className="text-slate-500 hover:text-slate-900">
                  Courses
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-slate-500 hover:text-slate-900">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900">Legal</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link to="/privacy" className="text-slate-500 hover:text-slate-900">
                  Privacy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-slate-500 hover:text-slate-900">
                  Terms
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900">Account</h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link to="/login" className="text-slate-500 hover:text-slate-900">
                  Sign in
                </Link>
              </li>
              <li>
                <Link to="/signup" className="text-slate-500 hover:text-slate-900">
                  Create account
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Bizika LMS. All rights reserved.
          </p>
          <p className="text-xs text-slate-500">Built for focused learning.</p>
        </div>
      </div>
    </footer>
  );
}
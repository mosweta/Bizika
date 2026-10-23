// src/pages/usermanagement.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "../firebase/config";
import {
  collection, query, orderBy, where, limit, startAfter,
  getDocs, getCountFromServer, updateDoc, doc, serverTimestamp,
} from "firebase/firestore";
import {
  Search, RefreshCw, ChevronDown, ChevronUp, X,
  User as UserIcon, Mail, Shield, BookOpen, Loader2,
} from "lucide-react";
import { SkeletonStatRow, SkeletonBar, SkeletonCircle } from "../components/Skeletons";

const PAGE_SIZE = 25;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function formatDate(value) {
  if (!value) return "—";
  const d = value.toDate ? value.toDate() : new Date(value);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─────────────────────────────────────────────────────────────
// Stat tile
// ─────────────────────────────────────────────────────────────
function Stat({ label, value, accent }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-semibold ${accent || "text-slate-900"}`}>
        {value}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Enrollment detail drawer (opened by expanding a row)
// ─────────────────────────────────────────────────────────────
function EnrollmentPanel({ userId }) {
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const snap = await getDocs(
          query(collection(db, "enrollments"), where("userId", "==", userId))
        );
        if (cancelled) return;

        // Fetch course titles for the enrollment rows in parallel
        const courseIds = snap.docs.map((d) => d.data().courseId).filter(Boolean);
        const courseMap = new Map();
        await Promise.all(
          courseIds.map(async (cid) => {
            const c = await getDocs(query(collection(db, "courses"), where("__name__", "==", cid)));
            if (!c.empty) courseMap.set(cid, c.docs[0].data());
          })
        );

        if (cancelled) return;
        setEnrollments(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              courseId: data.courseId,
              courseTitle: courseMap.get(data.courseId)?.title || "Unknown course",
              progress: data.progress || 0,
            };
          })
        );
      } catch (e) {
        console.error("EnrollmentPanel error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) {
    return (
      <div className="px-5 py-4 bg-slate-50/60 border-t border-slate-100">
        <SkeletonBar className="h-3 w-32 mb-3" />
        <SkeletonBar className="h-3 w-48 mb-2" />
        <SkeletonBar className="h-3 w-40" />
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <div className="px-5 py-4 bg-slate-50/60 border-t border-slate-100 text-sm text-slate-500">
        Not enrolled in any courses.
      </div>
    );
  }

  return (
    <div className="px-5 py-4 bg-slate-50/60 border-t border-slate-100">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500 mb-3">
        <BookOpen className="h-3.5 w-3.5" />
        {enrollments.length} {enrollments.length === 1 ? "enrollment" : "enrollments"}
      </div>
      <ul className="space-y-2">
        {enrollments.map((enr) => (
          <li key={enr.id} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-slate-700 truncate">{enr.courseTitle}</span>
            <span className="text-slate-500 text-xs flex-shrink-0">{enr.progress}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Role picker with inline confirm
// ─────────────────────────────────────────────────────────────
function RoleControl({ currentRole, onSave }) {
  const [pending, setPending] = useState(null);

  const handleSelect = (newRole) => {
    if (newRole === currentRole) return;
    setPending(newRole);
  };

  const confirm = async () => {
    const next = pending;
    setPending(null);
    await onSave(next);
  };

  if (pending) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-slate-500">
          Change to <strong>{pending}</strong>?
        </span>
        <button
          onClick={confirm}
          className="text-xs px-2 py-1 rounded bg-blue-800 text-white hover:bg-blue-900"
        >
          Yes
        </button>
        <button
          onClick={() => setPending(null)}
          className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <select
      value={currentRole}
      onChange={(e) => handleSelect(e.target.value)}
      className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:border-blue-800"
    >
      <option value="student">Student</option>
      <option value="admin">Admin</option>
    </select>
  );
}

// ─────────────────────────────────────────────────────────────
// Row
// ─────────────────────────────────────────────────────────────
function UserRow({ user, expanded, onToggle, onChangeRole, onToggleStatus }) {
  return (
    <>
      <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold"
              style={{ backgroundColor: user.avatarColor || "#1E40AF" }}
            >
              {(user.fullName || user.email || "U")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">
                {user.fullName || "—"}
              </div>
              <div className="text-xs text-slate-500 truncate">{user.email}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-block text-xs px-2 py-0.5 rounded ${
              user.role === "admin"
                ? "bg-blue-50 text-blue-800"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {user.role || "student"}
          </span>
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-block text-xs px-2 py-0.5 rounded ${
              user.status === "suspended"
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {user.status || "active"}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-slate-600">{formatDate(user.createdAt)}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <RoleControl
              currentRole={user.role || "student"}
              onSave={(role) => onChangeRole(user.id, role)}
            />
            <button
              onClick={() => onToggleStatus(user.id, user.status)}
              className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              {user.status === "suspended" ? "Activate" : "Suspend"}
            </button>
            <button
              onClick={onToggle}
              className="p-1 text-slate-400 hover:text-slate-700 rounded"
              title={expanded ? "Hide enrollments" : "Show enrollments"}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="p-0">
            <EnrollmentPanel userId={user.id} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <table className="w-full">
        <tbody>
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <SkeletonCircle className="h-9 w-9" />
                  <div className="flex-1">
                    <SkeletonBar className="h-3.5 w-32" />
                    <SkeletonBar className="mt-1.5 h-3 w-48" />
                  </div>
                </div>
              </td>
              <td className="px-4 py-3"><SkeletonBar className="h-5 w-16" /></td>
              <td className="px-4 py-3"><SkeletonBar className="h-5 w-16" /></td>
              <td className="px-4 py-3"><SkeletonBar className="h-3 w-20" /></td>
              <td className="px-4 py-3"><SkeletonBar className="h-7 w-40" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────
export default function UserManagement() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const [roleFilter, setRoleFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const mountedRef = useRef(true);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim().toLowerCase()), 150);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Load stats (parallel counts)
  const loadStats = useCallback(async () => {
    try {
      const [total, students, admins, suspended] = await Promise.all([
        getCountFromServer(collection(db, "users")),
        getCountFromServer(query(collection(db, "users"), where("role", "==", "student"))),
        getCountFromServer(query(collection(db, "users"), where("role", "==", "admin"))),
        getCountFromServer(query(collection(db, "users"), where("status", "==", "suspended"))),
      ]);
      if (!mountedRef.current) return;
      setStats({
        total: total.data().count,
        students: students.data().count,
        admins: admins.data().count,
        suspended: suspended.data().count,
      });
    } catch (e) {
      console.error("loadStats error:", e);
    }
  }, []);

  // Load first page
  const loadFirstPage = useCallback(async () => {
    setLoadingInitial(true);
    try {
      const baseConstraints = [orderBy("createdAt", "desc"), limit(PAGE_SIZE)];
      const q =
        roleFilter === "all"
          ? query(collection(db, "users"), ...baseConstraints)
          : query(
              collection(db, "users"),
              where("role", "==", roleFilter),
              ...baseConstraints
            );

      const snap = await getDocs(q);
      if (!mountedRef.current) return;
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setCursor(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.size === PAGE_SIZE);
    } catch (e) {
      console.error("loadFirstPage error:", e);
    } finally {
      if (mountedRef.current) setLoadingInitial(false);
    }
  }, [roleFilter]);

  // Load next page
  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "users"),
        orderBy("createdAt", "desc"),
        startAfter(cursor),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      if (!mountedRef.current) return;
      setUsers((prev) => [...prev, ...snap.docs.map((d) => ({ id: d.id, ...d.data() }))]);
      setCursor(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.size === PAGE_SIZE);
    } catch (e) {
      console.error("loadMore error:", e);
    } finally {
      if (mountedRef.current) setLoadingMore(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    // Fire stats + first page in parallel
    Promise.all([loadStats(), loadFirstPage()]);
    return () => { mountedRef.current = false; };
  }, [loadStats, loadFirstPage]);

  // Reload when role filter changes
  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  const refresh = () => {
    Promise.all([loadStats(), loadFirstPage()]);
  };

  // Optimistic role change
  const handleChangeRole = async (userId, newRole) => {
    const previous = users.find((u) => u.id === userId);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    try {
      await updateDoc(doc(db, "users", userId), {
        role: newRole,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Role change failed:", e);
      if (previous) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? previous : u))
        );
      }
      alert("Failed to update role.");
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    const next = currentStatus === "suspended" ? "active" : "suspended";
    const previous = users.find((u) => u.id === userId);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: next } : u))
    );
    try {
      await updateDoc(doc(db, "users", userId), {
        status: next,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Status change failed:", e);
      if (previous) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? previous : u))
        );
      }
      alert("Failed to update status.");
    }
  };

  // Client-side filter of loaded rows only
  const visibleUsers = searchQuery
    ? users.filter(
        (u) =>
          (u.fullName || "").toLowerCase().includes(searchQuery) ||
          (u.email || "").toLowerCase().includes(searchQuery)
      )
    : users;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">User management</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Manage user accounts, roles, and access
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loadingInitial}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loadingInitial ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      {!stats ? (
        <SkeletonStatRow count={4} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Total users" value={stats.total.toLocaleString()} />
          <Stat label="Students" value={stats.students.toLocaleString()} />
          <Stat label="Admins" value={stats.admins.toLocaleString()} />
          <Stat
            label="Suspended"
            value={stats.suspended.toLocaleString()}
            accent={stats.suspended > 0 ? "text-red-600" : undefined}
          />
        </div>
      )}

      {/* Filters */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Filter loaded users…"
              className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-800"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-800"
          >
            <option value="all">All roles</option>
            <option value="student">Students</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loadingInitial ? (
        <TableSkeleton />
      ) : visibleUsers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-12 text-center">
          <UserIcon className="mx-auto h-6 w-6 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            {searchQuery ? "No users match this filter." : "No users found."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/60 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Joined
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    expanded={expandedRow === user.id}
                    onToggle={() =>
                      setExpandedRow((prev) => (prev === user.id ? null : user.id))
                    }
                    onChangeRole={handleChangeRole}
                    onToggleStatus={handleToggleStatus}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && !searchQuery && (
            <div className="px-4 py-3 border-t border-slate-100 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading…
                  </>
                ) : (
                  "Load more"
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
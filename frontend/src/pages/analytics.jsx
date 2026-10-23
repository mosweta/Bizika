// src/pages/analytics.jsx
import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase/config";
import {
  collection, query, where, orderBy, limit, getDocs,
  getCountFromServer, Timestamp,
} from "firebase/firestore";
import { SkeletonStatRow, SkeletonChart, SkeletonBar } from "../components/Skeletons";

const RANGE_OPTIONS = [
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
  { id: "all", label: "All time", days: null },
];

// ─────────────────────────────────────────────────────────────
// Stat tile
// ─────────────────────────────────────────────────────────────
function Stat({ label, value, sublabel }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      {sublabel && <div className="mt-1 text-xs text-slate-400">{sublabel}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Enrollment trend — bar chart drawn in divs, no library
// ─────────────────────────────────────────────────────────────
function EnrollmentTrend({ data, rangeLabel }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Enrollment trend</h3>
          <p className="mt-0.5 text-xs text-slate-500">{rangeLabel}</p>
        </div>
        <span className="text-xs text-slate-400">
          Peak: {max.toLocaleString()} {max === 1 ? "enrollment" : "enrollments"}
        </span>
      </div>

      {data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-sm text-slate-400">
          No enrollment data for this period.
        </div>
      ) : (
        <div className="flex items-end gap-1 h-40">
          {data.map((d, i) => {
            const heightPct = max > 0 ? (d.count / max) * 100 : 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center group relative">
                <div
                  className="w-full rounded-t bg-blue-800 hover:bg-blue-900 transition-colors"
                  style={{ height: `${Math.max(heightPct, 2)}%`, minHeight: 2 }}
                />
                <div className="absolute -top-7 hidden group-hover:block bg-slate-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                  {d.label}: {d.count}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data.length > 0 && (
        <div className="mt-3 flex justify-between text-xs text-slate-400">
          <span>{data[0].label}</span>
          <span>{data[data.length - 1].label}</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Top courses
// ─────────────────────────────────────────────────────────────
function TopCourses({ courses }) {
  if (courses.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="text-base font-semibold text-slate-900">Top courses</h3>
        <p className="mt-6 text-sm text-slate-400 text-center">
          No enrollment data yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h3 className="text-base font-semibold text-slate-900">Top courses</h3>
      <p className="mt-0.5 text-xs text-slate-500">By enrollment count</p>

      <ul className="mt-5 space-y-3">
        {courses.map((course, i) => (
          <li key={course.id} className="flex items-center gap-3">
            <span className="w-6 text-sm text-slate-400 tabular-nums flex-shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-900 truncate">{course.title}</div>
              {course.category && (
                <div className="text-xs text-slate-400 capitalize truncate">
                  {course.category}
                </div>
              )}
            </div>
            <span className="text-sm font-medium text-slate-700 tabular-nums flex-shrink-0">
              {course.enrollmentCount.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────
export default function Analytics() {
  const [range, setRange] = useState("30d");
  const [stats, setStats] = useState(null);
  const [trend, setTrend] = useState(null);
  const [topCourses, setTopCourses] = useState(null);

  const loadStats = useCallback(async (rangeId) => {
    try {
      const option = RANGE_OPTIONS.find((o) => o.id === rangeId);
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [totalUsers, totalEnrollments, activeUsers, completed] = await Promise.all([
        getCountFromServer(collection(db, "users")),
        getCountFromServer(collection(db, "enrollments")),
        getCountFromServer(
          query(
            collection(db, "enrollments"),
            where("lastAccessed", ">=", Timestamp.fromDate(thirtyDaysAgo))
          )
        ),
        getCountFromServer(
          query(collection(db, "enrollments"), where("progress", "==", 100))
        ),
      ]);

      const total = totalEnrollments.data().count;
      const completedCount = completed.data().count;
      const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

      setStats({
        totalUsers: totalUsers.data().count,
        totalEnrollments: total,
        activeUsers: activeUsers.data().count,
        completionRate,
        completedCount,
      });
    } catch (e) {
      console.error("loadStats error:", e);
      setStats({
        totalUsers: 0,
        totalEnrollments: 0,
        activeUsers: 0,
        completionRate: 0,
        completedCount: 0,
      });
    }
  }, []);

  const loadTrend = useCallback(async (rangeId) => {
    try {
      const option = RANGE_OPTIONS.find((o) => o.id === rangeId);
      const days = option?.days || 30;

      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - days);

      const snap = await getDocs(
        query(
          collection(db, "enrollments"),
          where("enrolledAt", ">=", Timestamp.fromDate(start)),
          orderBy("enrolledAt", "asc")
        )
      );

      // Bucket by day
      const buckets = new Map();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        buckets.set(key, 0);
      }

      snap.docs.forEach((d) => {
        const enrolled = d.data().enrolledAt?.toDate?.();
        if (!enrolled) return;
        const key = enrolled.toISOString().slice(0, 10);
        if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1);
      });

      // If period is long, group by week to keep the chart readable
      const entries = Array.from(buckets.entries());
      const points =
        days > 45
          ? // weekly buckets
            entries.reduce((acc, [key, count], i) => {
              if (i % 7 === 0) acc.push({ label: formatShort(key), count: 0, _key: key });
              if (acc.length) acc[acc.length - 1].count += count;
              return acc;
            }, [])
          : entries.map(([key, count]) => ({ label: formatShort(key), count }));

      setTrend(points);
    } catch (e) {
      console.error("loadTrend error:", e);
      setTrend([]);
    }
  }, []);

  const loadTopCourses = useCallback(async () => {
    try {
      // Try fast path — courses that already carry enrollmentCount
      const fast = await getDocs(
        query(collection(db, "courses"), orderBy("enrollmentCount", "desc"), limit(10))
      );

      if (fast.docs.some((d) => (d.data().enrollmentCount || 0) > 0)) {
        setTopCourses(
          fast.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((c) => (c.enrollmentCount || 0) > 0)
            .slice(0, 5)
        );
        return;
      }

      // Fallback: count top 10 courses in parallel
      const top = await getDocs(
        query(collection(db, "courses"), orderBy("createdAt", "desc"), limit(10))
      );
      const withCounts = await Promise.all(
        top.docs.map(async (d) => {
          const count = await getCountFromServer(
            query(collection(db, "enrollments"), where("courseId", "==", d.id))
          );
          return {
            id: d.id,
            title: d.data().title,
            category: d.data().category,
            enrollmentCount: count.data().count,
          };
        })
      );
      setTopCourses(
        withCounts
          .filter((c) => c.enrollmentCount > 0)
          .sort((a, b) => b.enrollmentCount - a.enrollmentCount)
          .slice(0, 5)
      );
    } catch (e) {
      console.error("loadTopCourses error:", e);
      setTopCourses([]);
    }
  }, []);

  useEffect(() => {
    setStats(null);
    setTrend(null);
    Promise.all([loadStats(range), loadTrend(range)]);
  }, [range, loadStats, loadTrend]);

  useEffect(() => {
    loadTopCourses();
  }, [loadTopCourses]);

  const rangeLabel = RANGE_OPTIONS.find((o) => o.id === range)?.label || "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Analytics</h1>
          <p className="mt-0.5 text-sm text-slate-500">Platform metrics</p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setRange(opt.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                range === opt.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {opt.id === "all" ? "All" : opt.label.replace("Last ", "")}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {!stats ? (
        <SkeletonStatRow count={4} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Total users" value={stats.totalUsers.toLocaleString()} />
          <Stat label="Enrollments" value={stats.totalEnrollments.toLocaleString()} />
          <Stat
            label="Completion rate"
            value={`${stats.completionRate}%`}
            sublabel={`${stats.completedCount.toLocaleString()} completed`}
          />
          <Stat
            label="Active users"
            value={stats.activeUsers.toLocaleString()}
            sublabel="Last 30 days"
          />
        </div>
      )}

      {/* Trend + Top courses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {!trend ? <SkeletonChart /> : <EnrollmentTrend data={trend} rangeLabel={rangeLabel} />}
        </div>
        <div>
          {!topCourses ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <SkeletonBar className="h-4 w-32" />
              <div className="mt-5 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <SkeletonBar className="h-3 w-4" />
                    <SkeletonBar className="h-3 flex-1" />
                    <SkeletonBar className="h-3 w-10" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <TopCourses courses={topCourses} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Small helper
// ─────────────────────────────────────────────────────────────
function formatShort(isoDate) {
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
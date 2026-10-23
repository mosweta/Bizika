// src/components/Skeletons.jsx
// Shared skeleton primitives. Atoms here, compositions per page.

export function SkeletonBar({ className = "" }) {
  return <div className={`bg-slate-100 rounded animate-pulse ${className}`} />;
}

export function SkeletonCircle({ className = "" }) {
  return <div className={`bg-slate-100 rounded-full animate-pulse ${className}`} />;
}

// ─────────────────────────────────────────────────────────────
// Common patterns (used identically across multiple pages)
// ─────────────────────────────────────────────────────────────

export function SkeletonStatCard() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <SkeletonBar className="h-3 w-24" />
      <SkeletonBar className="mt-3 h-7 w-16" />
    </div>
  );
}

export function SkeletonStatRow({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonChart({ bars = 14 }) {
  // Deterministic heights so SSR / repeated renders don't jitter
  const heights = [40, 55, 35, 70, 60, 45, 80, 65, 50, 75, 90, 60, 45, 70];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <SkeletonBar className="h-4 w-32" />
      <div className="mt-6 flex items-end gap-1.5 h-40">
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-slate-100 rounded-t animate-pulse"
            style={{ height: `${heights[i % heights.length]}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonCard({ className = "" }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-4 ${className}`}>
      <SkeletonBar className="h-4 w-3/4" />
      <SkeletonBar className="mt-2 h-3 w-1/2" />
    </div>
  );
}
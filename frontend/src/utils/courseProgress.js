// src/utils/courseProgress.js
// Single source of truth for course progress math, shared by
// student.jsx and adminlearn.jsx.

// ─────────────────────────────────────────────────────────────
// Duration parsing
// ─────────────────────────────────────────────────────────────

/**
 * Parse a lesson duration string into minutes.
 * Returns 0 if the string is unparseable or empty.
 *
 * Examples:
 *   "45 min"       → 45
 *   "1 hr"         → 60
 *   "1 hr 30 min"  → 90
 *   "15 min read"  → 15
 *   "30"           → 30
 */
export function parseDurationToMinutes(durationStr) {
  if (!durationStr) return 0;
  const s = String(durationStr).toLowerCase();

  // "X min read" / "X minutes read"
  if (s.includes("read")) {
    const m = s.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }

  let total = 0;
  const h = s.match(/(\d+)\s*(?:hour|hr|h)/i);
  const m = s.match(/(\d+)\s*(?:minute|min|m)(?!\s*read)/i);
  if (h) total += parseInt(h[1], 10) * 60;
  if (m) total += parseInt(m[1], 10);

  // Bare number → assume minutes
  if (total === 0) {
    const n = s.match(/(\d+)/);
    if (n) total = parseInt(n[0], 10);
  }
  return total;
}

// ─────────────────────────────────────────────────────────────
// Learning-time estimate
// ─────────────────────────────────────────────────────────────

const READING_WORDS_PER_MINUTE = 200;

/**
 * Compute the estimated duration (minutes) of a lesson.
 *
 * Priority:
 *   1. If lesson.duration is set and parses to > 0, use it.
 *   2. If it's a reading lesson with markdown, estimate from
 *       word count at 200 wpm.
 *   3. Otherwise 0 (we don't fabricate a number for videos
 *      that lack a duration).
 */
export function estimateLessonMinutes(lesson) {
  const parsed = parseDurationToMinutes(lesson?.duration);
  if (parsed > 0) return parsed;

  const isReading =
    lesson?.lessonType === "reading" ||
    (!lesson?.videoUrl && typeof lesson?.markdown === "string");

  if (isReading && lesson.markdown) {
    const words = lesson.markdown.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / READING_WORDS_PER_MINUTE));
  }

  return 0;
}

// ─────────────────────────────────────────────────────────────
// Progress computation
// ─────────────────────────────────────────────────────────────

/**
 * Compute a student's progress on a course.
 *
 * Progress is based on ACTIVE lessons only (status !== "archived").
 * Archived lessons still count toward "total lessons completed"
 * and "learning time" — they were legitimately done — but they
 * don't inflate or deflate the percentage.
 *
 * @param {Object} enrollment  Firestore enrollment doc
 * @param {Array}  allLessons  All lessons (active + archived)
 * @returns {{
 *   activeLessons: Array,
 *   archivedLessons: Array,
 *   completedActive: number,
 *   completedTotal: number,
 *   progress: number,
 *   learningMinutes: number,
 *   isComplete: boolean,
 * }}
 */
export function computeCourseProgress(enrollment, allLessons) {
  const active = (allLessons || []).filter((l) => l.status !== "archived");
  const archived = (allLessons || []).filter((l) => l.status === "archived");

  const completedSet = new Set(enrollment?.completedLessons || []);
  const completedActive = active.filter((l) => completedSet.has(l.id)).length;
  const completedTotal = [...active, ...archived].filter((l) =>
    completedSet.has(l.id)
  ).length;

  const progress =
    active.length > 0
      ? Math.min(Math.round((completedActive / active.length) * 100), 100)
      : 0;

  let learningMinutes = 0;
  [...active, ...archived].forEach((lesson) => {
    if (completedSet.has(lesson.id)) {
      learningMinutes += estimateLessonMinutes(lesson);
    }
  });

  return {
    activeLessons: active,
    archivedLessons: archived,
    completedActive,
    completedTotal,
    progress,
    learningMinutes,
    isComplete: progress === 100 && active.length > 0,
  };
}

// ─────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────

/**
 * "45m" / "2h" / "2.5h"
 */
export function formatHours(minutes) {
  if (!minutes || minutes <= 0) return "0m";
  if (minutes < 60) return `${minutes}m`;
  const h = minutes / 60;
  const rounded = Math.round(h * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}h` : `${rounded.toFixed(1)}h`;
}

/**
 * "just now" / "5m ago" / "3h ago" / "2d ago" / "Mar 4"
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return "Recently";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Button label for a course card, based on progress.
 */
export function progressCta(progress) {
  if (progress === 0) return "Start";
  if (progress >= 100) return "Review";
  return "Continue";
}
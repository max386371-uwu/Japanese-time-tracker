// Date-range and formatting helpers. All session times are stored as
// epoch-ms (start/end) with duration in minutes, in the user's local time.

export const DAY_MS = 24 * 60 * 60 * 1000;

let WEEK_STARTS_MONDAY = true;
export function setWeekStart(startsMonday) {
  WEEK_STARTS_MONDAY = startsMonday !== false;
}

let DAY_START_MINUTES = 0; // minutes after local midnight when the tracked "day" begins
export function setDayStart(minutes) {
  DAY_START_MINUTES = Number.isFinite(minutes) ? ((minutes % 1440) + 1440) % 1440 : 0;
}

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  const calMidnight = new Date(x);
  calMidnight.setHours(0, 0, 0, 0);
  if (DAY_START_MINUTES === 0) return calMidnight;
  const boundary = new Date(calMidnight.getTime() + DAY_START_MINUTES * 60000);
  if (x.getTime() < boundary.getTime()) {
    boundary.setDate(boundary.getDate() - 1);
  }
  return boundary;
}

export function endOfDay(d = new Date()) {
  const s = startOfDay(d);
  const next = new Date(s);
  next.setDate(next.getDate() + 1);
  return new Date(next.getTime() - 1);
}

export function startOfWeek(d = new Date()) {
  const x = startOfDay(d);
  const day = WEEK_STARTS_MONDAY ? (x.getDay() + 6) % 7 : x.getDay();
  x.setDate(x.getDate() - day);
  return x;
}

export function startOfMonth(d = new Date()) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

export function startOfYear(d = new Date()) {
  const x = startOfDay(d);
  x.setMonth(0, 1);
  return x;
}

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMonths(d, n) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

export function isSameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

// period: 'day' | 'week' | 'month' | 'year' | 'all'
export function rangeForPeriod(period, ref = new Date(), earliestStart = null) {
  const now = new Date(ref);
  switch (period) {
    case "day":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "week": {
      const s = startOfWeek(now);
      return { start: s, end: new Date(addDays(s, 7).getTime() - 1) };
    }
    case "month": {
      const s = startOfMonth(now);
      const e = addMonths(s, 1);
      return { start: s, end: new Date(e.getTime() - 1) };
    }
    case "year": {
      const s = startOfYear(now);
      const e = new Date(s);
      e.setFullYear(e.getFullYear() + 1);
      return { start: s, end: new Date(e.getTime() - 1) };
    }
    case "all":
    default:
      return {
        start: earliestStart ? startOfDay(earliestStart) : startOfDay(new Date(2000, 0, 1)),
        end: endOfDay(now),
      };
  }
}

export function shiftRange(period, ref, dir) {
  // dir: -1 previous, +1 next
  const d = new Date(ref);
  if (period === "day") return addDays(d, dir);
  if (period === "week") return addDays(d, dir * 7);
  if (period === "month") return addMonths(d, dir);
  if (period === "year") {
    d.setFullYear(d.getFullYear() + dir);
    return d;
  }
  return d;
}

export function sessionsInRange(sessions, start, end) {
  const s = start.getTime();
  const e = end.getTime();
  return sessions.filter((sess) => sess.start >= s && sess.start <= e);
}

export function totalMinutes(sessions) {
  return sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
}

export function formatDuration(minutes, opts = {}) {
  const { longForm = false } = opts;
  const mins = Math.round(minutes || 0);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (longForm) {
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} hr`;
    return `${h} hr ${m} min`;
  }
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function formatClock(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function formatDateLabel(d) {
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatMonthLabel(d) {
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

export function formatTimeLabel(d) {
  return new Date(d).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// Consecutive-day streak, counting backward from today (or yesterday if
// nothing logged yet today so an in-progress day doesn't break the streak).
export function computeStreak(sessions) {
  if (!sessions.length) return 0;
  const daysWithTime = new Set(
    sessions.filter((s) => s.duration > 0).map((s) => startOfDay(new Date(s.start)).getTime())
  );
  let streak = 0;
  let cursor = startOfDay(new Date());
  if (!daysWithTime.has(cursor.getTime())) {
    cursor = addDays(cursor, -1);
  }
  while (daysWithTime.has(cursor.getTime())) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function groupByDay(sessions) {
  const map = new Map();
  for (const s of sessions) {
    const key = startOfDay(new Date(s.start)).getTime();
    map.set(key, (map.get(key) || 0) + s.duration);
  }
  return map;
}

export function groupByProject(sessions) {
  const map = new Map();
  for (const s of sessions) {
    map.set(s.projectId, (map.get(s.projectId) || 0) + s.duration);
  }
  return map;
}

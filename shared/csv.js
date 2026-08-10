// Small dependency-free CSV parser (handles quoted fields, embedded
// commas, escaped "" quotes, and \r\n or \n line endings) plus a mapper
// that turns a Toggl-style "Detailed report" export into plain rows.

export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export function rowsToObjects(rows) {
  if (!rows.length) return { headers: [], records: [] };
  const headers = rows[0].map((h) => h.trim());
  const records = rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = (r[i] ?? "").trim()));
    return obj;
  });
  return { headers, records };
}

// Candidate header names (lowercase) we'll accept for each logical field.
const FIELD_ALIASES = {
  project: ["project", "project name"],
  description: ["description", "task", "notes", "note"],
  tags: ["tags", "tag"],
  startDate: ["start date", "start day", "date"],
  startTime: ["start time"],
  endDate: ["end date", "end day"],
  endTime: ["end time"],
  duration: ["duration", "duration (h)", "duration (decimal)"],
  client: ["client"],
};

export function detectColumnMap(headers) {
  const lower = headers.map((h) => h.toLowerCase());
  const map = {};
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const idx = lower.findIndex((h) => aliases.includes(h));
    if (idx !== -1) map[field] = headers[idx];
  }
  return map;
}

function parseDurationToMs(raw) {
  if (!raw) return null;
  const s = raw.trim();
  // HH:MM:SS or H:MM:SS ("Improved" duration format)
  const hms = s.match(/^(\d+):(\d{1,2}):(\d{1,2})$/);
  if (hms) {
    const [, h, m, sec] = hms;
    return (Number(h) * 3600 + Number(m) * 60 + Number(sec)) * 1000;
  }
  // MM:SS
  const ms = s.match(/^(\d{1,2}):(\d{1,2})$/);
  if (ms) {
    const [, m, sec] = ms;
    return (Number(m) * 60 + Number(sec)) * 1000;
  }
  // Decimal hours, e.g. "1.25"
  const dec = s.match(/^-?\d+(\.\d+)?$/);
  if (dec) return Math.round(parseFloat(s) * 3600 * 1000);
  return null;
}

function parseDateTime(dateStr, timeStr) {
  if (!dateStr) return null;
  const combined = timeStr ? `${dateStr} ${timeStr}` : dateStr;
  let t = Date.parse(combined);
  if (!isNaN(t)) return t;
  // Fallback: try swapping "YYYY-MM-DD" strictly with a manual regex,
  // since Date.parse is inconsistent across locales/browsers for
  // anything other than ISO-ish strings.
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m && timeStr) {
    const tm = timeStr.match(/(\d{1,2}):(\d{2})(:(\d{2}))?\s*(AM|PM)?/i);
    if (tm) {
      let h = Number(tm[1]);
      const min = Number(tm[2]);
      const sec = Number(tm[4] || 0);
      if (tm[5]) {
        const isPM = tm[5].toUpperCase() === "PM";
        if (isPM && h < 12) h += 12;
        if (!isPM && h === 12) h = 0;
      }
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), h, min, sec);
      t = d.getTime();
      if (!isNaN(t)) return t;
    }
  }
  return null;
}

// Turns parsed CSV records into normalized rows ready to become sessions.
// Returns { rows, skipped, projectNames, tagNames } where rows is
// [{ projectName, tagNames, notes, start, end, duration }] (start/end in ms,
// duration in minutes).
export function mapTogglRows(records, columnMap) {
  const rows = [];
  let skipped = 0;
  const projectNames = new Set();
  const tagNames = new Set();

  for (const rec of records) {
    const projectName = (columnMap.project ? rec[columnMap.project] : "") || "Imported";
    const startDate = columnMap.startDate ? rec[columnMap.startDate] : "";
    const startTime = columnMap.startTime ? rec[columnMap.startTime] : "";
    const endDate = columnMap.endDate ? rec[columnMap.endDate] : startDate;
    const endTime = columnMap.endTime ? rec[columnMap.endTime] : "";
    const durationRaw = columnMap.duration ? rec[columnMap.duration] : "";

    const start = parseDateTime(startDate, startTime);
    const durationMs = parseDurationToMs(durationRaw);
    let end = null;
    if (start !== null && durationMs !== null) {
      end = start + durationMs;
    } else if (endDate) {
      end = parseDateTime(endDate, endTime);
    }

    if (start === null || end === null || end <= start) {
      skipped++;
      continue;
    }

    const tags = columnMap.tags
      ? rec[columnMap.tags]
          .split(/[;,]/)
          .map((t) => t.trim())
          .filter(Boolean)
      : [];
    tags.forEach((t) => tagNames.add(t));
    projectNames.add(projectName);

    rows.push({
      projectName,
      tagNames: tags,
      notes: columnMap.description ? rec[columnMap.description] : "",
      start,
      end,
      duration: Math.max(0, Math.round((end - start) / 60000)),
    });
  }

  return { rows, skipped, projectNames: [...projectNames], tagNames: [...tagNames] };
}

// ---------- Export: sessions -> Toggl/Clockify-compatible CSV ----------

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function csvDate(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function csvTime(ms) {
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function csvDuration(minutes) {
  const totalSec = Math.max(0, Math.round(minutes * 60));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

// data: the full app data object from getData(). Produces a "Detailed
// report" style CSV — the same shape Toggl/Clockify export and import —
// so it round-trips cleanly with both.
export function sessionsToCSV(data) {
  const header = ["Project", "Description", "Start date", "Start time", "End date", "End time", "Duration", "Tags"];
  const lines = [header.join(",")];
  const sorted = [...data.sessions].sort((a, b) => a.start - b.start);
  for (const s of sorted) {
    const project = data.projects.find((p) => p.id === s.projectId);
    const tagNames = (s.tagIds || [])
      .map((id) => data.tags.find((t) => t.id === id)?.name)
      .filter(Boolean);
    const row = [
      project ? project.name : "Imported",
      s.notes || "",
      csvDate(s.start),
      csvTime(s.start),
      csvDate(s.end),
      csvTime(s.end),
      csvDuration(s.duration),
      tagNames.join(","),
    ];
    lines.push(row.map(csvEscape).join(","));
  }
  return lines.join("\r\n");
}

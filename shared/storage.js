import { newId } from "./id.js";

export const DATA_KEY = "jt_data";
export const TIMER_KEY = "jt_active_timer";
export const SCHEMA_VERSION = 1;

export const DEFAULT_PALETTE = [
  "#6EC1E4", // light blue (brand accent)
  "#8FD6BD", // seafoam
  "#C9A6F2", // lavender
  "#F2A65A", // amber
  "#F28FAD", // rose
  "#7EA8F2", // periwinkle
  "#E4D96E", // gold
  "#6EE4C9", // teal
  "#F28F6E", // coral
  "#A6C9F2", // powder blue
];

const DEFAULT_PROJECT_SEEDS = [
  { name: "Reading", color: DEFAULT_PALETTE[0] },
  { name: "Listening", color: DEFAULT_PALETTE[1] },
  { name: "Grammar", color: DEFAULT_PALETTE[2] },
];

// Every sidebar item except Settings (which always shows) can be hidden.
export const SIDEBAR_ROUTES = ["dashboard", "timer", "projects", "reports", "notebook", "search"];

function defaultSettings() {
  return {
    theme: {
      preset: "navy",
      bg: "#0D1B30",
      surface: "#142944",
      surfaceAlt: "#1B3355",
      text: "#F5F7FA",
      textMuted: "#8FA3BF",
      accent: "#6EC1E4",
      accent2: "#8FD6BD",
    },
    icon: {
      mode: "theme", // "theme" | "color" | "image"
      color: "#6EC1E4",
      imageDataUrl: null,
    },
    layout: {
      sidebarPosition: "left", // "left" | "right"
      density: "comfortable", // "comfortable" | "compact"
      fontSize: "medium", // "small" | "medium" | "large"
      corners: "rounded", // "rounded" | "sharp"
      mode: "standard", // "standard" | "simple"
    },
    dashboardWidgets: ["stats", "projects", "heatmap"],
    sidebarVisibility: {
      dashboard: true,
      timer: true,
      projects: true,
      reports: true,
      notebook: true,
      search: true,
    },
    sidebarOrder: ["dashboard", "timer", "projects", "reports", "notebook", "search"],
    weekStartsMonday: true,
    minSessionSeconds: 30,
    dayStartMinutes: 0, // minutes after midnight when the tracked "day" begins (0 = normal midnight-to-midnight)
  };
}

export function defaultData() {
  const now = Date.now();
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: {
      startDate: now,
      createdAt: now,
    },
    projects: DEFAULT_PROJECT_SEEDS.map((p, i) => ({
      id: newId(),
      name: p.name,
      color: p.color,
      order: i,
      archived: false,
      goals: [],
      createdAt: now,
    })),
    sessions: [],
    tags: [],
    notebook: {
      entries: [],
    },
    settings: defaultSettings(),
  };
}

function deepMerge(base, extra) {
  if (Array.isArray(base)) return extra !== undefined ? extra : base;
  if (typeof base === "object" && base !== null) {
    const out = { ...base };
    for (const k of Object.keys(base)) {
      if (extra && Object.prototype.hasOwnProperty.call(extra, k)) {
        out[k] = deepMerge(base[k], extra[k]);
      }
    }
    return out;
  }
  return extra !== undefined ? extra : base;
}

// Defensive read: merges stored data over defaults so a partially-shaped
// or older-version blob never crashes the UI.
export async function getData() {
  const res = await chrome.storage.local.get(DATA_KEY);
  const stored = res[DATA_KEY];
  if (!stored) {
    const fresh = defaultData();
    await chrome.storage.local.set({ [DATA_KEY]: fresh });
    return fresh;
  }
  return deepMerge(defaultData(), stored);
}

export async function setData(data) {
  await chrome.storage.local.set({ [DATA_KEY]: data });
  return data;
}

export async function mutate(fn) {
  const data = await getData();
  const result = fn(data);
  await setData(data);
  return result !== undefined ? result : data;
}

export async function getActiveTimer() {
  const res = await chrome.storage.local.get(TIMER_KEY);
  return res[TIMER_KEY] || null;
}

export async function setActiveTimer(timer) {
  await chrome.storage.local.set({ [TIMER_KEY]: timer });
  return timer;
}

// ---------- Projects ----------

export async function addProject({ name, color, goals } = {}) {
  return mutate((data) => {
    const usedColors = new Set(data.projects.map((p) => p.color));
    const autoColor =
      DEFAULT_PALETTE.find((c) => !usedColors.has(c)) ||
      DEFAULT_PALETTE[data.projects.length % DEFAULT_PALETTE.length];
    const project = {
      id: newId(),
      name: name?.trim() || "Untitled",
      color: color || autoColor,
      order: data.projects.length,
      archived: false,
      goals: goals || [],
      createdAt: Date.now(),
    };
    data.projects.push(project);
    return project;
  });
}

export async function updateProject(id, patch) {
  return mutate((data) => {
    const p = data.projects.find((x) => x.id === id);
    if (p) Object.assign(p, patch);
    return p;
  });
}

export async function deleteProject(id) {
  return mutate((data) => {
    data.projects = data.projects.filter((p) => p.id !== id);
  });
}

export async function reorderProjects(orderedIds) {
  return mutate((data) => {
    orderedIds.forEach((id, i) => {
      const p = data.projects.find((x) => x.id === id);
      if (p) p.order = i;
    });
    data.projects.sort((a, b) => a.order - b.order);
  });
}

// ---------- Tags ----------
// A standalone, freeform list managed from the Projects page. Not
// currently attached to sessions/projects — just a simple named list.

export async function addTag(name) {
  return mutate((data) => {
    const clean = (name || "").trim();
    if (!clean) return null;
    const existing = data.tags.find((t) => t.name.toLowerCase() === clean.toLowerCase());
    if (existing) return existing;
    const tag = { id: newId(), name: clean, createdAt: Date.now() };
    data.tags.push(tag);
    return tag;
  });
}

export async function deleteTag(id) {
  return mutate((data) => {
    data.tags = data.tags.filter((t) => t.id !== id);
    for (const s of data.sessions) {
      s.tagIds = (s.tagIds || []).filter((tid) => tid !== id);
    }
  });
}

// Bulk find-or-create by name, e.g. from a comma-separated tag input.
// Returns the resolved tag ids in order (duplicates removed).
export async function getOrCreateTagsByNames(names) {
  return mutate((data) => {
    const ids = [];
    for (const raw of names) {
      const clean = (raw || "").trim().replace(/^#/, "");
      if (!clean) continue;
      let tag = data.tags.find((t) => t.name.toLowerCase() === clean.toLowerCase());
      if (!tag) {
        tag = { id: newId(), name: clean, createdAt: Date.now() };
        data.tags.push(tag);
      }
      if (!ids.includes(tag.id)) ids.push(tag.id);
    }
    return ids;
  });
}

// ---------- Sessions ----------

export async function addSession({ projectId, tagIds = [], start, end, notes = "" }) {
  return mutate((data) => {
    const duration = Math.max(0, Math.round((end - start) / 60000));
    const session = {
      id: newId(),
      projectId,
      tagIds,
      start,
      end,
      duration,
      notes,
      createdAt: Date.now(),
    };
    data.sessions.push(session);
    return session;
  });
}

export async function updateSession(id, patch) {
  return mutate((data) => {
    const s = data.sessions.find((x) => x.id === id);
    if (!s) return null;
    Object.assign(s, patch);
    if (patch.start !== undefined || patch.end !== undefined) {
      s.duration = Math.max(0, Math.round((s.end - s.start) / 60000));
    }
    return s;
  });
}

export async function deleteSession(id) {
  return mutate((data) => {
    data.sessions = data.sessions.filter((s) => s.id !== id);
  });
}

// ---------- Notebook ----------

export async function addNotebookEntry(entry) {
  return mutate((data) => {
    const item = {
      id: newId(),
      type: entry.type || "note", // milestone | note | goal | reflection | log
      title: entry.title || "",
      date: entry.date || Date.now(),
      notes: entry.notes || "",
      completed: entry.completed || false,
      order: data.notebook.entries.length,
      createdAt: Date.now(),
    };
    data.notebook.entries.push(item);
    return item;
  });
}

export async function updateNotebookEntry(id, patch) {
  return mutate((data) => {
    const e = data.notebook.entries.find((x) => x.id === id);
    if (e) Object.assign(e, patch);
    return e;
  });
}

export async function deleteNotebookEntry(id) {
  return mutate((data) => {
    data.notebook.entries = data.notebook.entries.filter((e) => e.id !== id);
  });
}

// ---------- Settings ----------

export async function updateSettings(patch) {
  return mutate((data) => {
    data.settings = deepMerge(data.settings, patch);
    return data.settings;
  });
}

// Bulk-imports rows shaped like { projectName, notes, start, end, duration }
// (see shared/csv.js) in a single storage write. Projects are matched by
// case-insensitive name and created if missing.
export async function importSessionsFromRows(rows) {
  return mutate((data) => {
    const findOrCreateProject = (name) => {
      const clean = (name || "Imported").trim() || "Imported";
      let p = data.projects.find((x) => x.name.toLowerCase() === clean.toLowerCase());
      if (!p) {
        const usedColors = new Set(data.projects.map((x) => x.color));
        const color =
          DEFAULT_PALETTE.find((c) => !usedColors.has(c)) ||
          DEFAULT_PALETTE[data.projects.length % DEFAULT_PALETTE.length];
        p = {
          id: newId(),
          name: clean,
          color,
          order: data.projects.length,
          archived: false,
          goals: [],
          createdAt: Date.now(),
        };
        data.projects.push(p);
      }
      return p;
    };

    const findOrCreateTag = (name) => {
      const clean = name.trim();
      let t = data.tags.find((x) => x.name.toLowerCase() === clean.toLowerCase());
      if (!t) {
        t = { id: newId(), name: clean, createdAt: Date.now() };
        data.tags.push(t);
      }
      return t;
    };

    let imported = 0;
    let earliestStart = data.meta.startDate;
    for (const row of rows) {
      const project = findOrCreateProject(row.projectName);
      const tagIds = (row.tagNames || []).map((n) => findOrCreateTag(n).id);
      data.sessions.push({
        id: newId(),
        projectId: project.id,
        tagIds,
        start: row.start,
        end: row.end,
        duration: row.duration,
        notes: row.notes || "",
        createdAt: Date.now(),
      });
      imported++;
      if (!earliestStart || row.start < earliestStart) earliestStart = row.start;
    }
    if (earliestStart && earliestStart < data.meta.startDate) {
      data.meta.startDate = earliestStart;
    }
    return { imported, projects: data.projects.length, tags: data.tags.length };
  });
}

// ---------- Export / Import ----------

export async function exportBackup() {
  const data = await getData();
  return {
    app: "Japanese Tracker",
    exportedAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
    data,
  };
}

// Validates the *shape* of a parsed backup file before we touch storage
// with it — catches truncated downloads, hand-edited JSON, or files from
// an unrelated app, so a bad import fails loudly instead of leaving
// corrupted data behind. Returns a list of problems (empty = valid).
function validateBackupShape(incoming) {
  const problems = [];
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    return ["Not a valid backup file."];
  }
  const isArrayIfPresent = (key, label) => {
    if (incoming[key] !== undefined && !Array.isArray(incoming[key])) {
      problems.push(`"${label}" should be a list.`);
    }
  };
  isArrayIfPresent("projects", "projects");
  isArrayIfPresent("sessions", "sessions");
  isArrayIfPresent("tags", "tags");

  if (incoming.projects) {
    for (const p of incoming.projects) {
      if (!p || typeof p !== "object" || typeof p.name !== "string") {
        problems.push("One or more projects are malformed.");
        break;
      }
    }
  }
  if (incoming.sessions) {
    for (const s of incoming.sessions) {
      if (!s || typeof s !== "object" || typeof s.start !== "number" || typeof s.end !== "number" || s.end < s.start) {
        problems.push("One or more sessions have invalid start/end times.");
        break;
      }
    }
  }
  if (incoming.notebook !== undefined) {
    if (typeof incoming.notebook !== "object" || incoming.notebook === null || !Array.isArray(incoming.notebook.entries)) {
      problems.push('"notebook.entries" should be a list.');
    }
  }
  if (incoming.settings !== undefined && (typeof incoming.settings !== "object" || incoming.settings === null || Array.isArray(incoming.settings))) {
    problems.push('"settings" should be an object.');
  }
  return problems;
}

function unwrapBackup(backup) {
  const incoming = backup && backup.data ? backup.data : backup;
  const problems = validateBackupShape(incoming);
  if (problems.length) {
    throw new Error(
      problems.length === 1 && problems[0] === "Not a valid backup file."
        ? "That file doesn't look like a Japanese Tracker backup."
        : `That backup file looks corrupted: ${problems.join(" ")}`
    );
  }
  return incoming;
}

// Full restore: the backup file's contents replace everything currently
// stored (merged only against schema defaults, e.g. for older backups
// missing a newer field).
export async function importBackupReplace(backup) {
  const incoming = unwrapBackup(backup);
  const merged = deepMerge(defaultData(), incoming);
  await setData(merged);
  return merged;
}

// True merge: combines the backup into whatever is already on this
// device. Projects are matched by case-insensitive name (like the Toggl
// importer); sessions and notebook entries are de-duplicated by a
// content signature so re-importing the same backup twice is harmless.
// Settings/theme are left untouched.
export async function importBackupMerge(backup) {
  const incoming = unwrapBackup(backup);
  return mutate((data) => {
    const projectIdMap = {};
    for (const p of incoming.projects || []) {
      let existing = data.projects.find((x) => x.name.toLowerCase() === (p.name || "").toLowerCase());
      if (!existing) {
        const usedColors = new Set(data.projects.map((x) => x.color));
        const color =
          DEFAULT_PALETTE.find((c) => !usedColors.has(c)) ||
          DEFAULT_PALETTE[data.projects.length % DEFAULT_PALETTE.length];
        existing = {
          id: newId(),
          name: p.name || "Imported",
          color: p.color || color,
          order: data.projects.length,
          archived: !!p.archived,
          goals: p.goals || [],
          createdAt: Date.now(),
        };
        data.projects.push(existing);
      }
      projectIdMap[p.id] = existing.id;
    }

    const tagIdMap = {};
    for (const t of incoming.tags || []) {
      let existing = data.tags.find((x) => x.name.toLowerCase() === (t.name || "").toLowerCase());
      if (!existing) {
        existing = { id: newId(), name: t.name, createdAt: Date.now() };
        data.tags.push(existing);
      }
      tagIdMap[t.id] = existing.id;
    }

    const sessionSigs = new Set(data.sessions.map((s) => `${s.start}|${s.end}|${s.projectId}`));
    let addedSessions = 0;
    for (const s of incoming.sessions || []) {
      const projectId = projectIdMap[s.projectId] || s.projectId;
      const sig = `${s.start}|${s.end}|${projectId}`;
      if (sessionSigs.has(sig)) continue;
      data.sessions.push({
        id: newId(),
        projectId,
        tagIds: (s.tagIds || []).map((tid) => tagIdMap[tid] || tid),
        start: s.start,
        end: s.end,
        duration: s.duration,
        notes: s.notes || "",
        createdAt: Date.now(),
      });
      sessionSigs.add(sig);
      addedSessions++;
    }

    const entrySigs = new Set(data.notebook.entries.map((e) => `${e.type}|${e.title}|${e.date}`));
    let addedEntries = 0;
    for (const e of (incoming.notebook && incoming.notebook.entries) || []) {
      const sig = `${e.type}|${e.title}|${e.date}`;
      if (entrySigs.has(sig)) continue;
      data.notebook.entries.push({
        id: newId(),
        type: e.type || "note",
        title: e.title || "",
        date: e.date || Date.now(),
        notes: e.notes || "",
        completed: !!e.completed,
        order: data.notebook.entries.length,
        createdAt: Date.now(),
      });
      entrySigs.add(sig);
      addedEntries++;
    }

    if (incoming.meta && incoming.meta.startDate && incoming.meta.startDate < data.meta.startDate) {
      data.meta.startDate = incoming.meta.startDate;
    }

    return { addedSessions, addedEntries, projects: data.projects.length };
  });
}

export async function resetAllData() {
  const fresh = defaultData();
  await setData(fresh);
  await setActiveTimer(null);
  return fresh;
}

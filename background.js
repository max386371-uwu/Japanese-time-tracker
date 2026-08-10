import { getData, getActiveTimer, setActiveTimer, addSession, DATA_KEY } from "./shared/storage.js";
import { renderIconImageDataSet } from "./shared/iconRender.js";

const MENU_START_LAST = "jt-start-last";
const MENU_START_WITH = "jt-start-with";
const MENU_PROJECT_PREFIX = "jt-project-";
const LAST_PROJECT_KEY = "jt_last_project_id";

async function rebuildContextMenus() {
  await chrome.contextMenus.removeAll();

  chrome.contextMenus.create({
    id: MENU_START_LAST,
    title: "Start Japanese Tracker timer",
    contexts: ["all"],
  });

  const data = await getData();
  const active = data.projects.filter((p) => !p.archived).sort((a, b) => a.order - b.order);

  if (active.length) {
    chrome.contextMenus.create({
      id: MENU_START_WITH,
      title: "Start timer with project…",
      contexts: ["all"],
    });
    for (const p of active) {
      chrome.contextMenus.create({
        id: MENU_PROJECT_PREFIX + p.id,
        parentId: MENU_START_WITH,
        title: p.name,
        contexts: ["all"],
      });
    }
  }
}

async function startTimer(projectId) {
  const existing = await getActiveTimer();
  if (existing) {
    if (existing.projectId === projectId) return existing;
    // A different project's timer is already running — save its
    // progress as a session (respecting the minimum-length setting)
    // instead of silently discarding it.
    await stopAndSaveTimer(existing);
  }
  const timer = {
    id: `${Date.now()}`,
    projectId,
    startTime: Date.now(),
    accumulatedMs: 0,
    status: "running",
  };
  await setActiveTimer(timer);
  await chrome.storage.local.set({ [LAST_PROJECT_KEY]: projectId });

  const data = await getData();
  const project = data.projects.find((p) => p.id === projectId);
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: "Japanese Tracker",
    message: `Timer started — ${project ? project.name : "Untitled"}`,
  });

  return timer;
}

async function stopAndSaveTimer(active) {
  active = active || (await getActiveTimer());
  if (!active) return;
  const totalMs = (active.accumulatedMs || 0) + (Date.now() - active.startTime);
  const end = Date.now();
  const start = end - totalMs;
  const data = await getData();
  if (totalMs >= (data.settings.minSessionSeconds ?? 30) * 1000) {
    await addSession({ projectId: active.projectId, tagIds: active.tagIds || [], start, end });
  }
  await setActiveTimer(null);
}

// ---------- Toolbar icon re-theming ----------
// The pinned toolbar icon is a static image by default; we re-render it
// on the fly with chrome.action.setIcon whenever the selected theme or
// custom icon settings change, or a timer starts/stops, so the icon
// always matches Settings and shows color (tracking) vs. grayscale
// (idle) at a glance.

let lastIconSignature = null;

async function updateActionIcon(settings, tracking) {
  const sig = JSON.stringify({ theme: settings.theme, icon: settings.icon, tracking });
  if (sig === lastIconSignature) return;
  lastIconSignature = sig;
  try {
    const imageData = await renderIconImageDataSet(settings, settings.theme, [16, 32, 48, 128], { tracking });
    await chrome.action.setIcon({ imageData });
  } catch (err) {
    // OffscreenCanvas/font/image issues shouldn't take down the service
    // worker — the static packaged icon stays as a safe fallback.
    console.warn("Japanese Tracker: couldn't re-theme the toolbar icon", err);
  }
}

async function refreshIcon() {
  const data = await getData();
  const timer = await getActiveTimer();
  await updateActionIcon(data.settings, !!timer);
}

chrome.runtime.onInstalled.addListener(async () => {
  await getData(); // ensures default data + start date exists
  await rebuildContextMenus();
  await refreshIcon();
});

chrome.runtime.onStartup.addListener(async () => {
  rebuildContextMenus();
  refreshIcon();
});

// Keep the context menu's project list — and the toolbar icon — in sync
// whenever data changes elsewhere (Settings, Projects, import).
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "local" || !changes[DATA_KEY]) return;
  rebuildContextMenus();
  refreshIcon();
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === MENU_START_LAST) {
    const res = await chrome.storage.local.get(LAST_PROJECT_KEY);
    const data = await getData();
    const projectId =
      res[LAST_PROJECT_KEY] && data.projects.some((p) => p.id === res[LAST_PROJECT_KEY])
        ? res[LAST_PROJECT_KEY]
        : data.projects[0]?.id;
    if (projectId) await startTimer(projectId);
  } else if (String(info.menuItemId).startsWith(MENU_PROJECT_PREFIX)) {
    const projectId = String(info.menuItemId).slice(MENU_PROJECT_PREFIX.length);
    await startTimer(projectId);
  }
});

// Alt+Shift+J: toggle the last-used timer — stop & save if one is
// running, otherwise start a new one for the last-used project.
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-timer") return;
  const active = await getActiveTimer();
  if (active) {
    await stopAndSaveTimer();
  } else {
    const res = await chrome.storage.local.get(LAST_PROJECT_KEY);
    const data = await getData();
    const projectId =
      res[LAST_PROJECT_KEY] && data.projects.some((p) => p.id === res[LAST_PROJECT_KEY])
        ? res[LAST_PROJECT_KEY]
        : data.projects[0]?.id;
    if (projectId) await startTimer(projectId);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.jt_active_timer) {
    refreshIcon();
  }
});

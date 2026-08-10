import {
  getData,
  getActiveTimer,
  setActiveTimer,
  addSession,
  getOrCreateTagsByNames,
} from "../shared/storage.js";
import { applyTheme } from "../shared/theme.js";
import { applyLayout } from "../shared/layout.js";
import { applyIconStyleToDOM } from "../shared/icon.js";
import { formatClock } from "../shared/time.js";

let data = null;
let timer = null;
let tickHandle = null;
let pendingTagIds = [];

const timerSection = document.getElementById("timerSection");
const recentList = document.getElementById("recentList");

async function boot() {
  data = await getData();
  applyTheme(data.settings.theme);
  applyLayout(data.settings.layout);
  applyIconStyleToDOM(data.settings);
  timer = await getActiveTimer();
  render();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.jt_data) {
      data = changes.jt_data.newValue;
      applyTheme(data.settings.theme);
      applyLayout(data.settings.layout);
      applyIconStyleToDOM(data.settings);
    }
    if (changes.jt_active_timer) timer = changes.jt_active_timer.newValue;
    render();
  });
}

function elapsedMs(t) {
  if (!t) return 0;
  return (t.accumulatedMs || 0) + (Date.now() - t.startTime);
}

function project(id) {
  return data.projects.find((p) => p.id === id);
}

function stopTicking() {
  if (tickHandle) {
    clearInterval(tickHandle);
    tickHandle = null;
  }
}

function render() {
  stopTicking();
  if (timer) {
    renderActiveTimer();
  } else {
    renderStartForm();
  }
  renderRecent();
}

function renderChips(container, ids, onRemove) {
  container.innerHTML = "";
  for (const id of ids) {
    const name = data.tags.find((t) => t.id === id)?.name;
    if (!name) continue;
    const chip = document.createElement("span");
    chip.className = "jt-chip";
    chip.innerHTML = `#${escapeHtml(name)} <button type="button">×</button>`;
    chip.querySelector("button").addEventListener("click", () => onRemove(id));
    container.appendChild(chip);
  }
}

function renderActiveTimer() {
  const p = project(timer.projectId) || { name: "Deleted project", color: "#8FA3BF" };

  timerSection.innerHTML = `
    <div class="jt-clock" id="clockEl">${formatClock(elapsedMs(timer))}</div>
    <div class="jt-project-row">
      <span class="jt-dot" style="background:${p.color}"></span>
      <span class="jt-project-name">${escapeHtml(p.name)}</span>
    </div>
    <div class="jt-field">
      <label>Tags</label>
      <div class="jt-tag-chips" id="chipRow"></div>
      <input type="text" class="jt-input" id="tagInput" placeholder="Add a tag and press Enter" style="margin-top:6px" />
    </div>
    <div class="jt-btn-row">
      <button class="jt-btn jt-btn-primary" id="stopBtn">Stop &amp; save</button>
      <button class="jt-btn jt-btn-cancel" id="cancelBtn" title="Discard timer">✕</button>
    </div>
  `;

  renderChips(document.getElementById("chipRow"), timer.tagIds || [], async (tagId) => {
    const updated = { ...timer, tagIds: (timer.tagIds || []).filter((id) => id !== tagId) };
    await setActiveTimer(updated);
    timer = updated;
    render();
  });

  document.getElementById("tagInput").addEventListener("keydown", async (e) => {
    if (e.key !== "Enter" || !e.target.value.trim()) return;
    const ids = await getOrCreateTagsByNames([e.target.value]);
    data = await getData();
    const updated = { ...timer, tagIds: [...new Set([...(timer.tagIds || []), ...ids])] };
    await setActiveTimer(updated);
    timer = updated;
    e.target.value = "";
    render();
  });

  document.getElementById("stopBtn").addEventListener("click", async () => {
    const totalMs = elapsedMs(timer);
    const end = Date.now();
    const start = end - totalMs;
    if (totalMs >= (data.settings.minSessionSeconds ?? 30) * 1000) {
      await addSession({ projectId: timer.projectId, tagIds: timer.tagIds || [], start, end });
    }
    await setActiveTimer(null);
    timer = null;
    render();
  });

  document.getElementById("cancelBtn").addEventListener("click", async () => {
    await setActiveTimer(null);
    timer = null;
    render();
  });

  tickHandle = setInterval(() => {
    const el = document.getElementById("clockEl");
    if (el) el.textContent = formatClock(elapsedMs(timer));
  }, 1000);
}

function renderStartForm() {
  const activeProjects = data.projects.filter((p) => !p.archived).sort((a, b) => a.order - b.order);
  timerSection.innerHTML = `
    <div class="jt-field">
      <label>Project</label>
      <select class="jt-select" id="projectSelect">
        ${activeProjects
          .map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
          .join("")}
      </select>
    </div>
    <div class="jt-field">
      <label>Tags</label>
      <div class="jt-tag-chips" id="chipRow"></div>
      <input type="text" class="jt-input" id="tagInput" placeholder="Add a tag and press Enter" style="margin-top:6px" />
    </div>
    <div class="jt-btn-row">
      <button class="jt-btn jt-btn-primary" id="startBtn">${data.settings.layout?.mode === "simple" ? "▶" : "▶ Start timer"}</button>
    </div>
  `;

  if (!activeProjects.length) {
    timerSection.innerHTML =
      '<p class="jt-empty">Create a project on the dashboard to start tracking.</p>';
    return;
  }

  renderChips(document.getElementById("chipRow"), pendingTagIds, (id) => {
    pendingTagIds = pendingTagIds.filter((x) => x !== id);
    render();
  });

  document.getElementById("tagInput").addEventListener("keydown", async (e) => {
    if (e.key !== "Enter" || !e.target.value.trim()) return;
    const ids = await getOrCreateTagsByNames([e.target.value]);
    data = await getData();
    pendingTagIds = [...new Set([...pendingTagIds, ...ids])];
    e.target.value = "";
    render();
  });

  document.getElementById("startBtn").addEventListener("click", async () => {
    const projectId = document.getElementById("projectSelect").value;
    await startTimer(projectId, pendingTagIds);
    pendingTagIds = [];
  });
}

async function startTimer(projectId, tagIds = []) {
  const newTimer = {
    id: `${Date.now()}`,
    projectId,
    tagIds,
    startTime: Date.now(),
    accumulatedMs: 0,
    status: "running",
  };
  await setActiveTimer(newTimer);
  await chrome.storage.local.set({ jt_last_project_id: projectId });
  timer = newTimer;
  render();
}

function relativeTime(ms) {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "yesterday";
  if (day < 7) return `${day} days ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function tagNames(ids = []) {
  return ids.map((id) => data.tags.find((t) => t.id === id)?.name).filter(Boolean);
}

function renderRecent() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const sorted = [...data.sessions].filter((s) => s.end >= cutoff).sort((a, b) => b.end - a.end);
  const seen = new Set();
  const recents = [];
  for (const s of sorted) {
    const key = s.projectId + "|" + [...(s.tagIds || [])].sort().join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    recents.push(s);
    if (recents.length >= 5) break;
  }

  if (!recents.length) {
    recentList.innerHTML = '<p class="jt-empty">Nothing tracked in the last 24 hours yet.</p>';
    return;
  }

  recentList.innerHTML = "";
  for (const s of recents) {
    const p = project(s.projectId) || { name: "Deleted project", color: "#8FA3BF" };
    const tags = tagNames(s.tagIds);
    const row = document.createElement("div");
    row.className = "jt-recent-item";
    row.innerHTML = `
      <div class="jt-recent-main">
        <span class="jt-dot" style="background:${p.color}"></span>
        <div class="jt-recent-text">
          <div class="jt-recent-project">${escapeHtml(p.name)}</div>
          <div class="jt-recent-meta">${relativeTime(s.end)}${tags.length ? " · #" + tags.map(escapeHtml).join(" #") : ""}</div>
        </div>
      </div>
      <button class="jt-resume-btn jt-resume-btn-icon" ${timer ? "disabled" : ""} title="Resume">▶</button>
    `;
    row.querySelector("button").addEventListener("click", () => startTimer(s.projectId, s.tagIds || []));
    recentList.appendChild(row);
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

document.getElementById("openDashboard").addEventListener("click", openDashboard);

function openDashboard() {
  chrome.tabs.create({ url: chrome.runtime.getURL("app/app.html") });
  window.close();
}

boot();

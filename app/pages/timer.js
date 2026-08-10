import { getData, getActiveTimer, setActiveTimer, addSession, getOrCreateTagsByNames } from "../../shared/storage.js";
import { formatClock, formatDuration } from "../../shared/time.js";
import { escapeHtml, openModal, closeModal, confirmDialog, toast } from "../../shared/ui.js";

let tickHandle = null;
let pendingTagIds = []; // tags queued for the *next* start (before a timer exists)

export async function render(root) {
  const data = await getData();
  const timer = await getActiveTimer();

  root.innerHTML = `
    <div class="jt-page-header">
      <div>
        <h1 class="jt-page-title">Timer</h1>
        <p class="jt-page-sub">Track a study session in real time.</p>
      </div>
      <button class="jt-btn jt-btn-secondary" id="manualEntryBtn">+ Log a past session</button>
    </div>
    <div class="jt-card jt-big-timer-card" id="timerCard"></div>
  `;

  document.getElementById("manualEntryBtn").addEventListener("click", () => openManualEntryModal(data, root));

  stopTicking();
  if (timer) renderActive(data, timer, root);
  else renderStart(data, root);
}

function stopTicking() {
  if (tickHandle) {
    clearInterval(tickHandle);
    tickHandle = null;
  }
}

function elapsedMs(t) {
  return (t.accumulatedMs || 0) + (Date.now() - t.startTime);
}

function renderChips(container, ids, data, onRemove) {
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

function renderStart(data, root) {
  const card = document.getElementById("timerCard");
  const activeProjects = data.projects.filter((p) => !p.archived).sort((a, b) => a.order - b.order);

  if (!activeProjects.length) {
    card.innerHTML = `<div class="jt-empty-state">Create a project first, then come back to start timing.</div>`;
    return;
  }

  card.innerHTML = `
    <div class="jt-big-clock">00:00:00</div>
    <div class="jt-timer-form" style="margin-top:22px;">
      <div class="jt-field">
        <label>Project</label>
        <select class="jt-select" id="projectSelect">
          ${activeProjects.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("")}
        </select>
      </div>
      <div class="jt-field">
        <label>Tags</label>
        <div class="jt-chip-row" id="chipRow" style="margin-bottom:6px;"></div>
        <input type="text" class="jt-input" id="tagInput" placeholder="Add a tag and press Enter" />
      </div>
    </div>
    <div class="jt-timer-controls">
      <button class="jt-btn jt-btn-primary" id="startBtn">▶ Start timer</button>
    </div>
  `;

  renderChips(document.getElementById("chipRow"), pendingTagIds, data, (id) => {
    pendingTagIds = pendingTagIds.filter((x) => x !== id);
    renderStart(data, root);
  });

  document.getElementById("tagInput").addEventListener("keydown", async (e) => {
    if (e.key !== "Enter" || !e.target.value.trim()) return;
    const ids = await getOrCreateTagsByNames([e.target.value]);
    const fresh = await getData();
    pendingTagIds = [...new Set([...pendingTagIds, ...ids])];
    e.target.value = "";
    renderStart(fresh, root);
  });

  document.getElementById("startBtn").addEventListener("click", async () => {
    const projectId = document.getElementById("projectSelect").value;
    const timer = {
      id: `${Date.now()}`,
      projectId,
      tagIds: pendingTagIds,
      startTime: Date.now(),
      accumulatedMs: 0,
      status: "running",
    };
    await setActiveTimer(timer);
    await chrome.storage.local.set({ jt_last_project_id: projectId });
    pendingTagIds = [];
    render(root);
  });
}

function renderActive(data, timer, root) {
  const card = document.getElementById("timerCard");
  const project = data.projects.find((p) => p.id === timer.projectId) || {
    name: "Deleted project",
    color: "#8FA3BF",
  };

  card.innerHTML = `
    <div class="jt-big-clock" id="bigClock">${formatClock(elapsedMs(timer))}</div>
    <div class="jt-project-row" style="justify-content:center;margin-top:10px;">
      <span class="jt-dot" style="background:${project.color}"></span>
      <span class="jt-project-name">${escapeHtml(project.name)}</span>
    </div>
    <div class="jt-timer-form" style="margin-top:18px;">
      <div class="jt-field">
        <label>Tags</label>
        <div class="jt-chip-row" id="chipRow" style="margin-bottom:6px;"></div>
        <input type="text" class="jt-input" id="tagInput" placeholder="Add a tag and press Enter" />
      </div>
    </div>
    <div class="jt-timer-controls">
      <button class="jt-btn jt-btn-primary" id="stopBtn">■ Stop &amp; save</button>
      <button class="jt-btn jt-btn-danger" id="cancelBtn" title="Discard timer">✕ Cancel</button>
    </div>
  `;

  renderChips(document.getElementById("chipRow"), timer.tagIds || [], data, async (id) => {
    const updated = { ...timer, tagIds: (timer.tagIds || []).filter((x) => x !== id) };
    await setActiveTimer(updated);
    render(root);
  });

  document.getElementById("tagInput").addEventListener("keydown", async (e) => {
    if (e.key !== "Enter" || !e.target.value.trim()) return;
    const ids = await getOrCreateTagsByNames([e.target.value]);
    const updated = { ...timer, tagIds: [...new Set([...(timer.tagIds || []), ...ids])] };
    await setActiveTimer(updated);
    render(root);
  });

  document.getElementById("stopBtn").addEventListener("click", async () => {
    const totalMs = elapsedMs(timer);
    const end = Date.now();
    const start = end - totalMs;
    if (totalMs >= (data.settings.minSessionSeconds ?? 30) * 1000) {
      await addSession({ projectId: timer.projectId, tagIds: timer.tagIds || [], start, end });
      toast(`Saved ${formatDuration(Math.round(totalMs / 60000))} to ${project.name}`);
    }
    await setActiveTimer(null);
    render(root);
  });

  document.getElementById("cancelBtn").addEventListener("click", async () => {
    const ok = await confirmDialog("This timer will be discarded and nothing will be saved.", {
      confirmLabel: "Discard timer",
    });
    if (!ok) return;
    await setActiveTimer(null);
    render(root);
  });

  tickHandle = setInterval(() => {
    const el = document.getElementById("bigClock");
    if (el) el.textContent = formatClock(elapsedMs(timer));
  }, 1000);
}

function openManualEntryModal(data, root) {
  const activeProjects = data.projects.filter((p) => !p.archived).sort((a, b) => a.order - b.order);
  const now = new Date();
  const toLocalInput = (d) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const modal = openModal(`
    <h2>Log a past session</h2>
    <div class="jt-field">
      <label>Project</label>
      <select class="jt-select" id="mProject">
        ${activeProjects.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("")}
      </select>
    </div>
    <div class="jt-grid jt-grid-2">
      <div class="jt-field">
        <label>Start</label>
        <input type="datetime-local" class="jt-input" id="mStart" value="${toLocalInput(new Date(now - 30 * 60000))}" />
      </div>
      <div class="jt-field">
        <label>End</label>
        <input type="datetime-local" class="jt-input" id="mEnd" value="${toLocalInput(now)}" />
      </div>
    </div>
    <div class="jt-field">
      <label>Tags</label>
      <input type="text" class="jt-input" id="mTags" placeholder="Comma separated, e.g. LightNovel, Genki" />
    </div>
    <div class="jt-field">
      <label>Notes</label>
      <textarea class="jt-textarea" id="mNotes" placeholder="Optional notes about this session"></textarea>
    </div>
    <div class="jt-modal-actions">
      <button class="jt-btn jt-btn-secondary" id="mCancel">Cancel</button>
      <button class="jt-btn jt-btn-primary" id="mSave">Save session</button>
    </div>
  `);

  if (!activeProjects.length) {
    modal.querySelector("#mProject").outerHTML = `<p class="jt-muted">Create a project first.</p>`;
  }

  modal.querySelector("#mCancel").addEventListener("click", closeModal);
  modal.querySelector("#mSave").addEventListener("click", async () => {
    const projectId = modal.querySelector("#mProject")?.value;
    const start = new Date(modal.querySelector("#mStart").value).getTime();
    const end = new Date(modal.querySelector("#mEnd").value).getTime();
    if (!projectId || !start || !end || end <= start) {
      toast("Check the project and that the end time is after the start time.");
      return;
    }
    const tagNames = modal
      .querySelector("#mTags")
      .value.split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const tagIds = tagNames.length ? await getOrCreateTagsByNames(tagNames) : [];
    await addSession({ projectId, tagIds, start, end, notes: modal.querySelector("#mNotes").value.trim() });
    closeModal();
    toast("Session saved");
    render(document.getElementById("pageRoot"));
  });
}

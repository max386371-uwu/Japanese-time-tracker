import {
  getData,
  addProject,
  updateProject,
  deleteProject,
  reorderProjects,
  deleteSession,
  addTag,
  deleteTag,
  DEFAULT_PALETTE,
} from "../../shared/storage.js";
import { rangeForPeriod, sessionsInRange, totalMinutes, formatDuration, formatDateLabel, formatTimeLabel } from "../../shared/time.js";
import { escapeHtml, openModal, closeModal, confirmDialog, toast } from "../../shared/ui.js";
import { openSessionModal } from "../../shared/sessionModal.js";
import { newId } from "../../shared/id.js";

const GOAL_PERIOD_LABELS = { total: "All-time goal", day: "Daily goal", week: "Weekly goal", month: "Monthly goal", year: "Yearly goal" };

export async function render(root) {
  const data = await getData();
  root.innerHTML = `
    <div class="jt-page-header">
      <div>
        <h1 class="jt-page-title">Projects</h1>
        <p class="jt-page-sub">The containers you track time against — fully yours to name and color.</p>
      </div>
      <button class="jt-btn jt-btn-primary" id="newProjectBtn">+ New project</button>
    </div>
    <div class="jt-grid jt-grid-3" id="activeGrid"></div>
    <div id="archivedWrap"></div>

    <div class="jt-section-title">Tags</div>
    <div class="jt-card">
      <div class="jt-inline-form" style="margin-bottom:12px;">
        <input type="text" class="jt-input" id="newTagInput" placeholder="New tag name" style="max-width:220px;" />
        <button class="jt-btn jt-btn-primary jt-btn-sm" id="addTagBtn">+ Add</button>
      </div>
      <div class="jt-chip-row" id="tagList"></div>
    </div>
  `;

  document.getElementById("newProjectBtn").addEventListener("click", () => openProjectModal(root));
  renderGrid(data, root);
  renderTagList(data, root);
  wireTagForm(root);
}

function renderTagList(data, root) {
  const el = document.getElementById("tagList");
  if (!data.tags.length) {
    el.innerHTML = `<p class="jt-muted" style="font-size:13px;">No tags yet — add one above.</p>`;
  } else {
    el.innerHTML = data.tags
      .map(
        (t) =>
          `<span class="jt-chip">#${escapeHtml(t.name)} <button type="button" data-deltag="${t.id}" title="Delete tag">×</button></span>`
      )
      .join("");
    el.querySelectorAll("[data-deltag]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ok = await confirmDialog("This tag will be removed.");
        if (!ok) return;
        await deleteTag(btn.dataset.deltag);
        toast("Tag deleted");
        const fresh = await getData();
        renderTagList(fresh, root);
      });
    });
  }
}

function wireTagForm(root) {
  const addBtn = document.getElementById("addTagBtn");
  const input = document.getElementById("newTagInput");
  const submit = async () => {
    const name = input.value.trim();
    if (!name) return;
    await addTag(name);
    input.value = "";
    const fresh = await getData();
    renderTagList(fresh, root);
  };
  addBtn.addEventListener("click", submit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submit();
  });
}

function goalProgress(data, project, goal) {
  const projectSessions = data.sessions.filter((s) => s.projectId === project.id);
  let minutes;
  if (goal.period === "total") {
    minutes = totalMinutes(projectSessions);
  } else {
    const { start, end } = rangeForPeriod(goal.period);
    minutes = totalMinutes(sessionsInRange(projectSessions, start, end));
  }
  const pct = Math.min(100, Math.round((minutes / Math.max(1, goal.amountMinutes)) * 100));
  return { minutes, pct };
}

function renderGrid(data, root) {
  const active = data.projects.filter((p) => !p.archived).sort((a, b) => a.order - b.order);
  const archived = data.projects.filter((p) => p.archived);

  const grid = document.getElementById("activeGrid");
  if (!active.length) {
    grid.innerHTML = "";
    grid.parentElement.querySelector(".jt-empty-state")?.remove();
    grid.insertAdjacentHTML(
      "beforebegin",
      `<div class="jt-empty-state">No projects yet — create your first one to start tracking.</div>`
    );
  } else {
    document.querySelector(".jt-empty-state")?.remove();
    grid.innerHTML = active.map((p, i) => projectCardHtml(data, p, i, active.length)).join("");
    wireCardEvents(grid, data, root);
  }

  const archivedWrap = document.getElementById("archivedWrap");
  if (!archived.length) {
    archivedWrap.innerHTML = "";
    return;
  }
  archivedWrap.innerHTML = `
    <div class="jt-section-title">Archived</div>
    <div class="jt-grid jt-grid-3">
      ${archived.map((p) => projectCardHtml(data, p, 0, 1, true)).join("")}
    </div>
  `;
  wireCardEvents(archivedWrap, data, root);
}

function projectCardHtml(data, p, index, total, archived = false) {
  const totalMin = totalMinutes(data.sessions.filter((s) => s.projectId === p.id));
  const goalsHtml = (p.goals || [])
    .map((g) => {
      const { minutes, pct } = goalProgress(data, p, g);
      return `
        <div>
          <div class="jt-goal-text">
            <span>${GOAL_PERIOD_LABELS[g.period] || "Goal"}</span>
            <span>${formatDuration(minutes)} / ${formatDuration(g.amountMinutes)}</span>
          </div>
          <div class="jt-goal-bar-wrap"><div class="jt-goal-bar" style="width:${pct}%;background:${p.color}"></div></div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="jt-card jt-project-card ${archived ? "archived" : ""}" data-id="${p.id}">
      <div class="jt-project-card-head">
        <span class="jt-dot" style="background:${p.color}"></span>
        <span class="jt-project-card-title">${escapeHtml(p.name)}</span>
      </div>
      <div class="jt-muted" style="font-size:13px;">Total: ${formatDuration(totalMin, { longForm: true })}</div>
      ${goalsHtml}
      <div class="jt-project-card-actions">
        ${archived ? "" : `<button class="jt-btn jt-btn-sm jt-btn-secondary" data-act="up" ${index === 0 ? "disabled" : ""}>↑</button>
        <button class="jt-btn jt-btn-sm jt-btn-secondary" data-act="down" ${index === total - 1 ? "disabled" : ""}>↓</button>`}
        <button class="jt-btn jt-btn-sm jt-btn-secondary" data-act="edit">Edit</button>
        <button class="jt-btn jt-btn-sm jt-btn-secondary" data-act="sessions">Sessions</button>
        <button class="jt-btn jt-btn-sm jt-btn-secondary" data-act="goal">Goal</button>
        <button class="jt-btn jt-btn-sm jt-btn-secondary" data-act="archive">${archived ? "Restore" : "Archive"}</button>
        <button class="jt-btn jt-btn-sm jt-btn-danger" data-act="delete">Delete</button>
      </div>
    </div>
  `;
}

function wireCardEvents(container, data, root) {
  container.querySelectorAll(".jt-project-card").forEach((card) => {
    const id = card.dataset.id;
    const project = data.projects.find((p) => p.id === id);
    card.querySelectorAll("button[data-act]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const act = btn.dataset.act;
        if (act === "up" || act === "down") {
          const active = data.projects.filter((p) => !p.archived).sort((a, b) => a.order - b.order);
          const idx = active.findIndex((p) => p.id === id);
          const swapWith = act === "up" ? idx - 1 : idx + 1;
          if (swapWith < 0 || swapWith >= active.length) return;
          [active[idx], active[swapWith]] = [active[swapWith], active[idx]];
          await reorderProjects(active.map((p) => p.id));
          render(root);
        } else if (act === "edit") {
          openProjectModal(root, project);
        } else if (act === "sessions") {
          openProjectSessionsModal(root, project);
        } else if (act === "goal") {
          openGoalModal(root, project);
        } else if (act === "archive") {
          await updateProject(id, { archived: !project.archived });
          toast(project.archived ? "Project restored" : "Project archived");
          render(root);
        } else if (act === "delete") {
          const hasTime = data.sessions.some((s) => s.projectId === id);
          const ok = await confirmDialog(
            hasTime
              ? "This project has logged time. Sessions will be kept in your history but will show as “Deleted project”."
              : "This will permanently remove the project."
          );
          if (ok) {
            await deleteProject(id);
            toast("Project deleted");
            render(root);
          }
        }
      });
    });
  });
}

function openProjectModal(root, project = null) {
  const isEdit = !!project;
  const swatches = DEFAULT_PALETTE;
  let selectedColor = project?.color || swatches[0];

  const modal = openModal(`
    <h2>${isEdit ? "Edit project" : "New project"}</h2>
    <div class="jt-field">
      <label>Name</label>
      <input type="text" class="jt-input" id="pName" value="${escapeHtml(project?.name || "")}" placeholder="e.g. Reading" />
    </div>
    <div class="jt-field">
      <label>Color</label>
      <div class="jt-color-swatches" id="swatchRow"></div>
      <input type="color" id="customColor" value="${selectedColor}" style="margin-top:8px;width:44px;height:30px;border:none;background:none;cursor:pointer;" />
    </div>
    <div class="jt-modal-actions">
      <button class="jt-btn jt-btn-secondary" id="pCancel">Cancel</button>
      <button class="jt-btn jt-btn-primary" id="pSave">${isEdit ? "Save changes" : "Create project"}</button>
    </div>
  `);

  const swatchRow = modal.querySelector("#swatchRow");
  function paintSwatches() {
    swatchRow.innerHTML = swatches
      .map(
        (c) =>
          `<span class="jt-color-swatch ${c.toLowerCase() === selectedColor.toLowerCase() ? "active" : ""}" data-c="${c}" style="background:${c}"></span>`
      )
      .join("");
    swatchRow.querySelectorAll(".jt-color-swatch").forEach((sw) => {
      sw.addEventListener("click", () => {
        selectedColor = sw.dataset.c;
        modal.querySelector("#customColor").value = selectedColor;
        paintSwatches();
      });
    });
  }
  paintSwatches();
  modal.querySelector("#customColor").addEventListener("input", (e) => {
    selectedColor = e.target.value;
    paintSwatches();
  });

  modal.querySelector("#pCancel").addEventListener("click", closeModal);
  modal.querySelector("#pSave").addEventListener("click", async () => {
    const name = modal.querySelector("#pName").value.trim();
    if (!name) {
      toast("Give the project a name first.");
      return;
    }
    if (isEdit) await updateProject(project.id, { name, color: selectedColor });
    else await addProject({ name, color: selectedColor });
    closeModal();
    render(root);
  });
}

async function openProjectSessionsModal(root, project) {
  const data = await getData();
  const modal = openModal(`
    <h2>Sessions — ${escapeHtml(project.name)}</h2>
    <div id="projSessionList" class="jt-scroll-list"></div>
    <div class="jt-modal-actions">
      <button class="jt-btn jt-btn-secondary" id="psClose">Close</button>
    </div>
  `);

  async function paint() {
    const fresh = await getData();
    const sessions = fresh.sessions
      .filter((s) => s.projectId === project.id)
      .sort((a, b) => b.start - a.start);
    const list = modal.querySelector("#projSessionList");

    if (!sessions.length) {
      list.innerHTML = `<p class="jt-muted" style="font-size:13px;padding:10px 0;">No sessions logged for this project yet.</p>`;
      return;
    }

    const cap = 300;
    const shown = sessions.slice(0, cap);
    list.innerHTML = shown
      .map((s) => {
        const tags = (s.tagIds || []).map((id) => fresh.tags.find((t) => t.id === id)?.name).filter(Boolean);
        return `
        <div class="jt-timeline-item">
          <div class="jt-timeline-time">${formatDateLabel(s.start)}<br/>${formatTimeLabel(s.start)}–${formatTimeLabel(s.end)}</div>
          <div class="jt-timeline-bar" style="background:${project.color}"></div>
          <div class="jt-timeline-body">
            <div class="jt-timeline-project">${formatDuration(s.duration)}</div>
            ${tags.length ? `<div class="jt-timeline-tags">#${tags.map(escapeHtml).join(" #")}</div>` : ""}
            ${s.notes ? `<div class="jt-timeline-notes">${escapeHtml(s.notes)}</div>` : ""}
          </div>
          <div class="jt-timeline-actions">
            <button class="jt-btn jt-btn-sm jt-btn-secondary" data-edit="${s.id}">Edit</button>
            <button class="jt-btn jt-btn-sm jt-btn-danger" data-del="${s.id}">Delete</button>
          </div>
        </div>`;
      })
      .join("");
    if (sessions.length > cap) {
      list.innerHTML += `<p class="jt-muted" style="font-size:12.5px;padding-top:8px;">Showing the most recent ${cap} of ${sessions.length} sessions.</p>`;
    }

    list.querySelectorAll("[data-edit]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const s = shown.find((x) => x.id === btn.dataset.edit);
        openSessionModal(fresh, s, () => {
          paint();
          render(root);
        });
      })
    );
    list.querySelectorAll("[data-del]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const ok = await confirmDialog("This session will be permanently removed.");
        if (!ok) return;
        await deleteSession(btn.dataset.del);
        toast("Session deleted");
        paint();
        render(root);
      })
    );
  }

  await paint();
  modal.querySelector("#psClose").addEventListener("click", () => {
    closeModal();
    render(root);
  });
}

function openGoalModal(root, project) {
  const goals = project.goals || [];
  const modal = openModal(`
    <h2>Goals — ${escapeHtml(project.name)}</h2>
    <div id="goalList" class="jt-scroll-list" style="margin-bottom:14px;"></div>
    <div class="jt-section-title" style="margin:0 0 10px;font-size:13px;">Add a goal</div>
    <div class="jt-grid jt-grid-2">
      <div class="jt-field">
        <label>Period</label>
        <select class="jt-select" id="gPeriod">
          <option value="total">All-time</option>
          <option value="day">Daily</option>
          <option value="week">Weekly</option>
          <option value="month">Monthly</option>
          <option value="year">Yearly</option>
        </select>
      </div>
      <div class="jt-field">
        <label>Hours</label>
        <input type="number" class="jt-input" id="gHours" min="1" value="30" />
      </div>
    </div>
    <div class="jt-modal-actions">
      <button class="jt-btn jt-btn-secondary" id="gClose">Close</button>
      <button class="jt-btn jt-btn-primary" id="gAdd">Add goal</button>
    </div>
  `);

  function paintGoals() {
    const list = modal.querySelector("#goalList");
    if (!goals.length) {
      list.innerHTML = `<p class="jt-muted" style="font-size:13px;">No goals yet.</p>`;
      return;
    }
    list.innerHTML = goals
      .map(
        (g) => `
        <div class="jt-flex-between" style="padding:6px 0;">
          <span style="font-size:13px;">${GOAL_PERIOD_LABELS[g.period]}: ${formatDuration(g.amountMinutes, { longForm: true })}</span>
          <button class="jt-btn jt-btn-sm jt-btn-danger" data-gid="${g.id}">Remove</button>
        </div>`
      )
      .join("");
    list.querySelectorAll("button[data-gid]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const next = goals.filter((g) => g.id !== btn.dataset.gid);
        goals.length = 0;
        goals.push(...next);
        await updateProject(project.id, { goals: next });
        paintGoals();
      });
    });
  }
  paintGoals();

  modal.querySelector("#gClose").addEventListener("click", () => {
    closeModal();
    render(root);
  });
  modal.querySelector("#gAdd").addEventListener("click", async () => {
    const period = modal.querySelector("#gPeriod").value;
    const hours = parseFloat(modal.querySelector("#gHours").value) || 0;
    if (hours <= 0) return;
    const goal = { id: newId(), period, amountMinutes: Math.round(hours * 60) };
    goals.push(goal);
    await updateProject(project.id, { goals });
    paintGoals();
  });
}

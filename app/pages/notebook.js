import {
  getData,
  addNotebookEntry,
  updateNotebookEntry,
  deleteNotebookEntry,
} from "../../shared/storage.js";
import { formatDateLabel } from "../../shared/time.js";
import { escapeHtml, openModal, closeModal, confirmDialog, toast } from "../../shared/ui.js";

const TYPE_LABELS = { milestone: "Milestone", note: "Note", goal: "Goal", reflection: "Reflection", log: "Study log" };

export async function render(root) {
  const data = await getData();
  root.innerHTML = `
    <div class="jt-page-header">
      <div>
        <h1 class="jt-page-title">Notebook</h1>
        <p class="jt-page-sub">Your personal Japanese learning journal — milestones, notes, goals, reflections.</p>
      </div>
      <button class="jt-btn jt-btn-primary" id="newEntryBtn">+ Add entry</button>
    </div>
    <div class="jt-card" id="entryList"></div>
  `;

  document.getElementById("newEntryBtn").addEventListener("click", () => openEntryModal(root, data));
  renderEntries(data, root);
}

function renderEntries(data, root) {
  const el = document.getElementById("entryList");
  const entries = [...data.notebook.entries].sort((a, b) => b.date - a.date);

  if (!entries.length) {
    el.innerHTML = `<div class="jt-empty-state">
      <div class="jt-mark" style="margin:0 auto 12px;width:46px;height:46px;font-size:24px;">時</div>
      Nothing here yet. Add your first milestone, note, or goal.
    </div>`;
    return;
  }

  el.innerHTML = entries.map((e) => entryHtml(e)).join("");

  el.querySelectorAll("[data-check]").forEach((box) =>
    box.addEventListener("click", async () => {
      const entry = entries.find((e) => e.id === box.dataset.check);
      await updateNotebookEntry(entry.id, { completed: !entry.completed });
      render(root);
    })
  );
  el.querySelectorAll("[data-edit]").forEach((btn) =>
    btn.addEventListener("click", () => openEntryModal(root, data, entries.find((e) => e.id === btn.dataset.edit)))
  );
  el.querySelectorAll("[data-del]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const ok = await confirmDialog("This notebook entry will be permanently removed.");
      if (!ok) return;
      await deleteNotebookEntry(btn.dataset.del);
      toast("Entry deleted");
      render(root);
    })
  );
}

function entryHtml(e) {
  const checkable = e.type === "milestone" || e.type === "goal";
  return `
    <div class="jt-notebook-entry">
      ${checkable ? `<div class="jt-notebook-check ${e.completed ? "done" : ""}" data-check="${e.id}">${e.completed ? "✓" : ""}</div>` : `<div style="width:20px;"></div>`}
      <div class="jt-notebook-entry-body">
        <div class="jt-flex-between">
          <div>
            <span class="jt-notebook-type-badge">${TYPE_LABELS[e.type] || "Note"}</span>
          </div>
          <div class="jt-notebook-actions">
            <button class="jt-btn jt-btn-sm jt-btn-secondary" data-edit="${e.id}">Edit</button>
            <button class="jt-btn jt-btn-sm jt-btn-danger" data-del="${e.id}">Delete</button>
          </div>
        </div>
        <div class="jt-notebook-title ${e.completed ? "done" : ""}" style="margin-top:6px;">${escapeHtml(e.title || "Untitled")}</div>
        <div class="jt-notebook-meta">${formatDateLabel(e.date)}</div>
        ${e.notes ? `<div class="jt-notebook-notes">${escapeHtml(e.notes)}</div>` : ""}
      </div>
    </div>
  `;
}

function openEntryModal(root, data, entry = null) {
  const isEdit = !!entry;
  const toLocalDate = (ms) => {
    const d = new Date(ms || Date.now());
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const modal = openModal(`
    <h2>${isEdit ? "Edit entry" : "New entry"}</h2>
    <div class="jt-grid jt-grid-2">
      <div class="jt-field">
        <label>Type</label>
        <select class="jt-select" id="eType">
          ${Object.entries(TYPE_LABELS)
            .map(([k, l]) => `<option value="${k}" ${entry?.type === k ? "selected" : ""}>${l}</option>`)
            .join("")}
        </select>
      </div>
      <div class="jt-field">
        <label>Date</label>
        <input type="date" class="jt-input" id="eDate" value="${toLocalDate(entry?.date)}" />
      </div>
    </div>
    <div class="jt-field">
      <label>Title</label>
      <input type="text" class="jt-input" id="eTitle" value="${escapeHtml(entry?.title || "")}" placeholder="e.g. Finished Genki I" />
    </div>
    <div class="jt-field">
      <label>Notes</label>
      <textarea class="jt-textarea" id="eNotes" placeholder="Any details you want to remember">${escapeHtml(entry?.notes || "")}</textarea>
    </div>
    <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--jt-text-muted);margin-bottom:6px;">
      <input type="checkbox" id="eCompleted" ${entry?.completed ? "checked" : ""} /> Mark as completed
    </label>
    <div class="jt-modal-actions">
      ${isEdit ? `<button class="jt-btn jt-btn-danger" id="eDelete" style="margin-right:auto;">Delete</button>` : ""}
      <button class="jt-btn jt-btn-secondary" id="eCancel">Cancel</button>
      <button class="jt-btn jt-btn-primary" id="eSave">${isEdit ? "Save changes" : "Add entry"}</button>
    </div>
  `);

  modal.querySelector("#eCancel").addEventListener("click", closeModal);
  if (isEdit) {
    modal.querySelector("#eDelete").addEventListener("click", async () => {
      const ok = await confirmDialog("This notebook entry will be permanently removed.");
      if (!ok) return;
      await deleteNotebookEntry(entry.id);
      closeModal();
      render(root);
    });
  }
  modal.querySelector("#eSave").addEventListener("click", async () => {
    const title = modal.querySelector("#eTitle").value.trim();
    if (!title) {
      toast("Give this entry a title.");
      return;
    }
    const payload = {
      type: modal.querySelector("#eType").value,
      title,
      date: new Date(modal.querySelector("#eDate").value).getTime() || Date.now(),
      notes: modal.querySelector("#eNotes").value.trim(),
      completed: modal.querySelector("#eCompleted").checked,
    };
    if (isEdit) await updateNotebookEntry(entry.id, payload);
    else await addNotebookEntry(payload);
    closeModal();
    render(root);
  });
}

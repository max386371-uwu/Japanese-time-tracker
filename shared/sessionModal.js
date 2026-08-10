import { updateSession, getOrCreateTagsByNames } from "./storage.js";
import { escapeHtml, openModal, closeModal, toast } from "./ui.js";

// Shared "edit a past session" modal used by both the Reports timeline
// and the Projects page. onSaved() is called after a successful save so
// the caller can re-render whatever list it's showing.
export function openSessionModal(data, session, onSaved) {
  const toLocalInput = (ms) => {
    const d = new Date(ms);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const activeProjects = data.projects.filter((p) => !p.archived || p.id === session.projectId);
  const tagText = (session.tagIds || []).map((id) => data.tags.find((t) => t.id === id)?.name).filter(Boolean).join(", ");

  const modal = openModal(`
    <h2>Edit session</h2>
    <div class="jt-field">
      <label>Project</label>
      <select class="jt-select" id="sProject">
        ${activeProjects.map((p) => `<option value="${p.id}" ${p.id === session.projectId ? "selected" : ""}>${escapeHtml(p.name)}</option>`).join("")}
      </select>
    </div>
    <div class="jt-grid jt-grid-2">
      <div class="jt-field"><label>Start</label><input type="datetime-local" class="jt-input" id="sStart" value="${toLocalInput(session.start)}" /></div>
      <div class="jt-field"><label>End</label><input type="datetime-local" class="jt-input" id="sEnd" value="${toLocalInput(session.end)}" /></div>
    </div>
    <div class="jt-field"><label>Tags</label><input type="text" class="jt-input" id="sTags" value="${escapeHtml(tagText)}" /></div>
    <div class="jt-field"><label>Notes</label><textarea class="jt-textarea" id="sNotes">${escapeHtml(session.notes || "")}</textarea></div>
    <div class="jt-modal-actions">
      <button class="jt-btn jt-btn-secondary" id="sCancel">Cancel</button>
      <button class="jt-btn jt-btn-primary" id="sSave">Save changes</button>
    </div>
  `);

  modal.querySelector("#sCancel").addEventListener("click", closeModal);
  modal.querySelector("#sSave").addEventListener("click", async () => {
    const start = new Date(modal.querySelector("#sStart").value).getTime();
    const end = new Date(modal.querySelector("#sEnd").value).getTime();
    if (!start || !end || end <= start) {
      toast("End time must be after the start time.");
      return;
    }
    const tagNames = modal.querySelector("#sTags").value.split(",").map((t) => t.trim()).filter(Boolean);
    const tagIds = tagNames.length ? await getOrCreateTagsByNames(tagNames) : [];
    await updateSession(session.id, {
      projectId: modal.querySelector("#sProject").value,
      start,
      end,
      tagIds,
      notes: modal.querySelector("#sNotes").value.trim(),
    });
    closeModal();
    toast("Session updated");
    if (onSaved) onSaved();
  });
}

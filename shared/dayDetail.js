import { openModal, escapeHtml } from "./ui.js";
import { formatDuration, formatTimeLabel, formatDateLabel, startOfDay, endOfDay } from "./time.js";

export function openDayDetail(date, data) {
  const start = startOfDay(date).getTime();
  const end = endOfDay(date).getTime();
  const sessions = data.sessions
    .filter((s) => s.start >= start && s.start <= end)
    .sort((a, b) => a.start - b.start);

  const total = sessions.reduce((sum, s) => sum + s.duration, 0);
  const projectIds = [...new Set(sessions.map((s) => s.projectId))];
  const projectNames = projectIds
    .map((id) => data.projects.find((p) => p.id === id)?.name)
    .filter(Boolean);
  const tagIds = [...new Set(sessions.flatMap((s) => s.tagIds || []))];
  const tagNames = tagIds.map((id) => data.tags.find((t) => t.id === id)?.name).filter(Boolean);

  const rows = sessions
    .map((s) => {
      const p = data.projects.find((x) => x.id === s.projectId) || { name: "Deleted project", color: "#8FA3BF" };
      const tags = (s.tagIds || [])
        .map((id) => data.tags.find((t) => t.id === id)?.name)
        .filter(Boolean);
      return `
        <div class="jt-timeline-item">
          <div class="jt-timeline-time">${formatTimeLabel(s.start)} – ${formatTimeLabel(s.end)}</div>
          <div class="jt-timeline-bar" style="background:${p.color}"></div>
          <div class="jt-timeline-body">
            <div class="jt-timeline-project">${escapeHtml(p.name)} · ${formatDuration(s.duration)}</div>
            ${tags.length ? `<div class="jt-timeline-tags">#${tags.map(escapeHtml).join(" #")}</div>` : ""}
            ${s.notes ? `<div class="jt-timeline-notes">${escapeHtml(s.notes)}</div>` : ""}
          </div>
        </div>
      `;
    })
    .join("");

  openModal(`
    <h2>${formatDateLabel(date)}</h2>
    <p class="jt-muted" style="margin-top:-10px;">
      ${formatDuration(total, { longForm: true })} total
      ${projectNames.length ? " · " + projectNames.map(escapeHtml).join(", ") : ""}
    </p>
    ${tagNames.length ? `<div class="jt-chip-row" style="margin-bottom:14px;">${tagNames.map((t) => `<span class="jt-chip">#${escapeHtml(t)}</span>`).join("")}</div>` : ""}
    <div class="jt-timeline">
      ${rows || '<p class="jt-empty-state" style="padding:20px 0;">No sessions logged this day.</p>'}
    </div>
    <div class="jt-modal-actions">
      <button class="jt-btn jt-btn-secondary" id="ddClose">Close</button>
    </div>
  `);
  document.getElementById("ddClose").addEventListener("click", () => {
    document.getElementById("modalBackdrop").classList.remove("open");
    document.getElementById("modalBackdrop").innerHTML = "";
  });
}

import { getData, deleteSession } from "../../shared/storage.js";
import {
  rangeForPeriod,
  sessionsInRange,
  totalMinutes,
  formatDuration,
  formatDateLabel,
  formatTimeLabel,
  formatMonthLabel,
  groupByDay,
  startOfDay,
  addDays,
  shiftRange,
} from "../../shared/time.js";
import { renderRangeControl, escapeHtml, confirmDialog, toast, renderSortToggle } from "../../shared/ui.js";
import { pieChart, barChart, lineChart, heatmap } from "../../shared/charts.js";
import { openDayDetail } from "../../shared/dayDetail.js";
import { openSessionModal } from "../../shared/sessionModal.js";

let rangeState = { period: "month", refDate: new Date() };
let projectSortMode = "time"; // "time" | "az"
let timelineSortMode = "newest"; // "newest" | "oldest" | "project"

export async function render(root) {
  const data = await getData();

  root.innerHTML = `
    <div class="jt-page-header">
      <div>
        <h1 class="jt-page-title">Reports</h1>
        <p class="jt-page-sub">Every angle on your study time.</p>
      </div>
      <div id="rangeControl"></div>
    </div>

    <div class="jt-grid jt-grid-2">
      <div class="jt-card">
        <div class="jt-section-title" style="margin-top:0;" id="breakdownTitle"></div>
        <div id="breakdownChart"></div>
      </div>
      <div class="jt-card">
        <div class="jt-flex-between" style="margin-bottom:14px;">
          <div class="jt-section-title" style="margin-top:0;margin-bottom:0;">Time by project</div>
          <div id="projectSortToggle" style="display:flex;gap:4px;"></div>
        </div>
        <div id="projectTotalsList"></div>
      </div>
    </div>

    <div class="jt-chart-row" style="margin-top:14px;">
      <div class="jt-card">
        <div class="jt-section-title" style="margin-top:0;">Time by project</div>
        <div id="pieProject"></div>
        <div class="jt-legend" id="pieProjectLegend"></div>
      </div>
      <div class="jt-card">
        <div class="jt-section-title" style="margin-top:0;">Time by tag</div>
        <div id="pieTag"></div>
        <div class="jt-legend" id="pieTagLegend"></div>
      </div>
    </div>

    <div class="jt-flex-between" style="margin-top:26px;margin-bottom:6px;">
      <div class="jt-section-title" style="margin-bottom:2px;">Consistency</div>
    </div>
    <p class="jt-muted jt-caption-text" id="progressCaption" style="font-size:12.5px;margin:0 0 12px;"></p>
    <div class="jt-card"><div id="progressLine"></div></div>

    <div class="jt-section-title">Study calendar</div>
    <div class="jt-card jt-heatmap-wrap"><div id="heatmapEl"></div></div>

    <div class="jt-page-header" style="margin-top:26px;">
      <div class="jt-section-title" style="margin:0;">Timeline</div>
      <div id="timelineSortToggle" style="display:flex;gap:4px;"></div>
    </div>
    <div class="jt-card" id="timelineCard"></div>
  `;

  renderAll(data, root);
}

function renderAll(data, root) {
  renderRangeControl(document.getElementById("rangeControl"), rangeState, (next) => {
    rangeState = next;
    renderAll(data, root);
  });
  renderSortToggle(
    document.getElementById("projectSortToggle"),
    [
      { value: "time", label: "By time" },
      { value: "az", label: "A–Z" },
    ],
    projectSortMode,
    (next) => {
      projectSortMode = next;
      renderAll(data, root);
    }
  );
  renderSortToggle(
    document.getElementById("timelineSortToggle"),
    [
      { value: "newest", label: "Newest" },
      { value: "oldest", label: "Oldest" },
      { value: "project", label: "By project" },
    ],
    timelineSortMode,
    (next) => {
      timelineSortMode = next;
      renderAll(data, root);
    }
  );
  renderBreakdown(data);
  renderProjectTotalsList(data);
  renderPies(data);
  renderProgressLine(data);
  renderHeatmap(data);
  renderTimeline(data, root);
}

function currentRange(data) {
  return rangeForPeriod(rangeState.period, rangeState.refDate, data.meta.startDate);
}

function projectColor(data, id) {
  return data.projects.find((p) => p.id === id)?.color || "#8FA3BF";
}
function projectName(data, id) {
  return data.projects.find((p) => p.id === id)?.name || "Deleted project";
}

function renderBreakdown(data) {
  const { period, refDate } = rangeState;
  const titleEl = document.getElementById("breakdownTitle");
  const chartEl = document.getElementById("breakdownChart");
  const { start, end } = currentRange(data);
  const inRange = sessionsInRange(data.sessions, start, end);

  if (period === "day") {
    titleEl.textContent = formatDateLabel(refDate);
    const total = totalMinutes(inRange);
    chartEl.innerHTML = `<div class="jt-stat-value" style="text-align:center;padding:30px 0;">${formatDuration(total, { longForm: true })}</div>`;
    return;
  }

  if (period === "week") {
    titleEl.textContent = "Daily totals this week";
    const dayMap = groupByDay(inRange);
    const bars = [];
    let cursor = new Date(start);
    while (cursor <= end) {
      bars.push({
        label: cursor.toLocaleDateString(undefined, { weekday: "short" }),
        value: dayMap.get(startOfDay(cursor).getTime()) || 0,
      });
      cursor = addDays(cursor, 1);
    }
    barChart(chartEl, bars, { valueFmt: (b) => `${b.label}: ${formatDuration(b.value)}` });
    return;
  }

  if (period === "month") {
    titleEl.textContent = formatMonthLabel(refDate);
    const dayMap = groupByDay(inRange);
    const bars = [];
    let cursor = new Date(start);
    while (cursor <= end) {
      bars.push({ label: String(cursor.getDate()), value: dayMap.get(startOfDay(cursor).getTime()) || 0 });
      cursor = addDays(cursor, 1);
    }
    barChart(chartEl, bars, { valueFmt: (b) => `Day ${b.label}: ${formatDuration(b.value)}` });
    return;
  }

  if (period === "year") {
    titleEl.textContent = String(refDate.getFullYear());
    const bars = [];
    for (let m = 0; m < 12; m++) {
      const mStart = new Date(refDate.getFullYear(), m, 1);
      const mEnd = new Date(refDate.getFullYear(), m + 1, 1);
      const minutes = totalMinutes(sessionsInRange(data.sessions, mStart, new Date(mEnd - 1)));
      bars.push({ label: mStart.toLocaleDateString(undefined, { month: "short" }), value: minutes });
    }
    barChart(chartEl, bars, { valueFmt: (b) => `${b.label}: ${formatDuration(b.value)}` });
    return;
  }

  // all time -> year by year
  titleEl.textContent = "All time, by year";
  const firstYear = new Date(data.meta.startDate || Date.now()).getFullYear();
  const lastYear = new Date().getFullYear();
  const bars = [];
  for (let y = firstYear; y <= lastYear; y++) {
    const minutes = totalMinutes(sessionsInRange(data.sessions, new Date(y, 0, 1), new Date(y, 11, 31, 23, 59, 59)));
    bars.push({ label: String(y), value: minutes });
  }
  barChart(chartEl, bars, { valueFmt: (b) => `${b.label}: ${formatDuration(b.value)}` });
}

function renderProjectTotalsList(data) {
  const { start, end } = currentRange(data);
  const inRange = sessionsInRange(data.sessions, start, end);
  const totals = data.projects
    .map((p) => ({ project: p, minutes: inRange.filter((s) => s.projectId === p.id).reduce((s, x) => s + x.duration, 0) }))
    .filter((t) => t.minutes > 0)
    .sort((a, b) =>
      projectSortMode === "az" ? a.project.name.localeCompare(b.project.name) : b.minutes - a.minutes
    );

  const el = document.getElementById("projectTotalsList");
  if (!totals.length) {
    el.innerHTML = `<div class="jt-empty-state" style="padding:20px 0;">Nothing logged for this range.</div>`;
    return;
  }
  const max = Math.max(1, ...totals.map((t) => t.minutes));
  el.innerHTML = totals
    .map(
      (t) => `
        <div class="jt-proj-total-row">
          <span class="jt-dot" style="background:${t.project.color}"></span>
          <span class="jt-proj-total-name">${escapeHtml(t.project.name)}</span>
          <span class="jt-proj-total-bar-wrap"><span class="jt-proj-total-bar" style="width:${(t.minutes / max) * 100}%;background:${t.project.color}"></span></span>
          <span class="jt-proj-total-value">${formatDuration(t.minutes)}</span>
        </div>`
    )
    .join("");
}

function renderPies(data) {
  const { start, end } = currentRange(data);
  const inRange = sessionsInRange(data.sessions, start, end);

  const byProject = new Map();
  for (const s of inRange) byProject.set(s.projectId, (byProject.get(s.projectId) || 0) + s.duration);
  const projectSegments = [...byProject.entries()].map(([id, value]) => ({
    label: projectName(data, id),
    value,
    color: projectColor(data, id),
  }));
  pieChart(document.getElementById("pieProject"), projectSegments, {
    formatTotal: (t) => formatDuration(t),
    tooltipFmt: (s, pct) => `<strong>${escapeHtml(s.label)}</strong><br>${formatDuration(s.value)} · ${pct}%`,
  });
  document.getElementById("pieProjectLegend").innerHTML = projectSegments
    .map((s) => `<span class="jt-legend-item"><span class="jt-dot" style="background:${s.color}"></span>${escapeHtml(s.label)} · ${formatDuration(s.value)}</span>`)
    .join("");

  const byTag = new Map();
  for (const s of inRange) {
    if (!s.tagIds || !s.tagIds.length) continue;
    for (const tagId of s.tagIds) byTag.set(tagId, (byTag.get(tagId) || 0) + s.duration);
  }
  const tagPalette = ["#6EC1E4", "#8FD6BD", "#C9A6F2", "#F2A65A", "#F28FAD", "#7EA8F2", "#E4D96E", "#6EE4C9"];
  const tagSegments = [...byTag.entries()].map(([id, value], i) => ({
    label: data.tags.find((t) => t.id === id)?.name || "Unknown",
    value,
    color: tagPalette[i % tagPalette.length],
  }));
  pieChart(document.getElementById("pieTag"), tagSegments, {
    formatTotal: (t) => formatDuration(t),
    tooltipFmt: (s, pct) => `<strong>#${escapeHtml(s.label)}</strong><br>${formatDuration(s.value)} · ${pct}%`,
  });
  document.getElementById("pieTagLegend").innerHTML =
    tagSegments
      .map((s) => `<span class="jt-legend-item"><span class="jt-dot" style="background:${s.color}"></span>#${escapeHtml(s.label)} · ${formatDuration(s.value)}</span>`)
      .join("") || `<span class="jt-legend-item">No tagged sessions in this range.</span>`;
}

const TREND_BUCKET_COUNT = { day: 30, week: 16, month: 12, year: 8 };
const TREND_CAPTIONS = {
  day: "Daily totals, last 30 days",
  week: "Weekly totals, last 16 weeks",
  month: "Monthly totals, last 12 months",
  year: "Yearly totals",
};

function buildTrendSeries(data, period) {
  const count = TREND_BUCKET_COUNT[period] || 12;
  const refs = [];
  let ref = new Date();
  for (let i = 0; i < count; i++) {
    refs.unshift(new Date(ref));
    ref = shiftRange(period, ref, -1);
  }
  return refs.map((refDate) => {
    const { start, end } = rangeForPeriod(period, refDate);
    const minutes = totalMinutes(sessionsInRange(data.sessions, start, end));
    let label;
    if (period === "day") label = refDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    else if (period === "week") label = formatDateLabel(rangeForPeriod("week", refDate).start);
    else if (period === "month") label = refDate.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
    else label = String(refDate.getFullYear());
    return { x: label, y: minutes };
  });
}

function renderProgressLine(data) {
  const el = document.getElementById("progressLine");
  const captionEl = document.getElementById("progressCaption");
  if (!data.sessions.length) {
    if (captionEl) captionEl.textContent = "";
    el.innerHTML = `<div class="jt-chart-empty">Log a session to start tracking your trend.</div>`;
    return;
  }
  const period = rangeState.period === "all" ? "year" : rangeState.period;
  if (captionEl) captionEl.textContent = TREND_CAPTIONS[period] || "";
  const points = buildTrendSeries(data, period);
  lineChart(el, points, {
    valueFmt: (p) => `<strong>${p.x}</strong><br>${formatDuration(p.y, { longForm: true })}`,
  });
}

function renderHeatmap(data) {
  const el = document.getElementById("heatmapEl");
  const dayMap = groupByDay(data.sessions);
  const cells = [...dayMap.entries()].map(([ts, minutes]) => ({ date: new Date(ts), minutes }));
  heatmap(el, cells, {
    weeks: 53,
    accentColor: data.settings.theme.accent,
    baseColor: data.settings.theme.surfaceAlt,
    tooltipFmt: (date, minutes) => `${formatDateLabel(date)}: ${formatDuration(minutes)}`,
    onCellClick: (date) => openDayDetail(date, data),
  });
}

const TIMELINE_RENDER_CAP = 300;

function renderTimeline(data, root) {
  const { start, end } = currentRange(data);
  const inRange = sessionsInRange(data.sessions, start, end);
  const el = document.getElementById("timelineCard");

  if (!inRange.length) {
    el.innerHTML = `<div class="jt-empty-state">No sessions in this range yet.</div>`;
    return;
  }

  const truncated = inRange.length > TIMELINE_RENDER_CAP;
  let html;
  if (timelineSortMode === "project") {
    const byProject = new Map();
    for (const s of inRange) {
      if (!byProject.has(s.projectId)) byProject.set(s.projectId, []);
      byProject.get(s.projectId).push(s);
    }
    const groups = [...byProject.entries()]
      .map(([projectId, sessions]) => ({
        projectId,
        sessions: sessions.sort((a, b) => b.start - a.start),
        total: sessions.reduce((sum, s) => sum + s.duration, 0),
      }))
      .sort((a, b) => b.total - a.total);

    let remaining = TIMELINE_RENDER_CAP;
    html = groups
      .map((g) => {
        const shown = g.sessions.slice(0, Math.max(0, remaining));
        remaining -= shown.length;
        if (!shown.length) return "";
        return `
        <div style="margin-bottom:6px;">
          <div class="jt-flex-between" style="padding:8px 0 4px;">
            <span style="font-weight:700;display:flex;align-items:center;gap:8px;">
              <span class="jt-dot" style="background:${projectColor(data, g.projectId)}"></span>
              ${escapeHtml(projectName(data, g.projectId))}
            </span>
            <span class="jt-muted" style="font-size:12.5px;">${formatDuration(g.total)}</span>
          </div>
          ${shown.map((s) => timelineRowHtml(data, s)).join("")}
        </div>`;
      })
      .join("");
  } else {
    const sorted = [...inRange].sort((a, b) =>
      timelineSortMode === "oldest" ? a.start - b.start : b.start - a.start
    );
    html = sorted.slice(0, TIMELINE_RENDER_CAP).map((s) => timelineRowHtml(data, s)).join("");
  }

  el.innerHTML = `<div class="jt-timeline">${html}</div>${
    truncated
      ? `<p class="jt-muted" style="font-size:12.5px;padding-top:10px;">Showing the most recent ${TIMELINE_RENDER_CAP} of ${inRange.length} sessions in this range — narrow the date range to see the rest.</p>`
      : ""
  }`;

  el.querySelectorAll("[data-edit]").forEach((btn) =>
    btn.addEventListener("click", () =>
      openSessionModal(data, data.sessions.find((s) => s.id === btn.dataset.edit), () => render(root))
    )
  );
  el.querySelectorAll("[data-del]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const ok = await confirmDialog("This session will be permanently removed.");
      if (!ok) return;
      await deleteSession(btn.dataset.del);
      toast("Session deleted");
      render(root);
    })
  );
}

function timelineRowHtml(data, s) {
  const color = projectColor(data, s.projectId);
  const tags = (s.tagIds || []).map((id) => data.tags.find((t) => t.id === id)?.name).filter(Boolean);
  return `
    <div class="jt-timeline-item">
      <div class="jt-timeline-time">${formatDateLabel(s.start)}<br/>${formatTimeLabel(s.start)}–${formatTimeLabel(s.end)}</div>
      <div class="jt-timeline-bar" style="background:${color}"></div>
      <div class="jt-timeline-body">
        <div class="jt-timeline-project">${escapeHtml(projectName(data, s.projectId))} · ${formatDuration(s.duration)}</div>
        ${tags.length ? `<div class="jt-timeline-tags">#${tags.map(escapeHtml).join(" #")}</div>` : ""}
        ${s.notes ? `<div class="jt-timeline-notes">${escapeHtml(s.notes)}</div>` : ""}
      </div>
      <div class="jt-timeline-actions">
        <button class="jt-btn jt-btn-sm jt-btn-secondary" data-edit="${s.id}">Edit</button>
        <button class="jt-btn jt-btn-sm jt-btn-danger" data-del="${s.id}">Delete</button>
      </div>
    </div>
  `;
}

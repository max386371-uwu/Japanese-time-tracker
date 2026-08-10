import { getData } from "../../shared/storage.js";
import {
  rangeForPeriod,
  sessionsInRange,
  totalMinutes,
  formatDuration,
  computeStreak,
  formatDateLabel,
  groupByDay,
} from "../../shared/time.js";
import { renderRangeControl, renderSortToggle, escapeHtml } from "../../shared/ui.js";
import { heatmap } from "../../shared/charts.js";
import { openDayDetail } from "../../shared/dayDetail.js";

let rangeState = { period: "month", refDate: new Date() };
let sortMode = "time"; // "time" | "az"

export async function render(root) {
  const data = await getData();
  const widgets = data.settings.dashboardWidgets || ["stats", "projects", "heatmap"];
  root.innerHTML = `
    <div class="jt-page-header">
      <div>
        <h1 class="jt-page-title">Dashboard</h1>
        <p class="jt-page-sub">Your Japanese learning journey at a glance.</p>
      </div>
    </div>

    ${widgets.includes("stats") ? `<div class="jt-grid jt-grid-4" id="statCards"></div>` : ""}

    ${
      widgets.includes("projects")
        ? `<div class="jt-flex-between" style="margin-top:10px;margin-bottom:14px;">
            <div class="jt-section-title" style="margin-bottom:2px;">Time by project</div>
            <div style="display:flex;align-items:center;gap:8px;">
              <div id="sortToggle" style="display:flex;gap:4px;"></div>
              <div id="rangeControl"></div>
            </div>
          </div>
          <div class="jt-card" id="projectTotals"></div>`
        : ""
    }

    ${
      widgets.includes("heatmap")
        ? `<div class="jt-section-title">Study calendar</div>
          <div class="jt-card jt-heatmap-wrap" id="heatmapCard"></div>`
        : ""
    }

    ${!widgets.length ? `<div class="jt-empty-state">All dashboard widgets are hidden. Turn some back on in Settings.</div>` : ""}
  `;

  if (widgets.includes("stats")) renderStatCards(data);
  if (widgets.includes("projects")) renderRangeSection(data);
  if (widgets.includes("heatmap")) renderHeatmap(data);
}

function renderStatCards(data) {
  const { sessions } = data;
  const streak = computeStreak(sessions);
  const all = totalMinutes(sessions);
  const today = totalMinutes(sessionsInRange(sessions, ...Object.values(rangeForPeriod("day"))));
  const week = totalMinutes(sessionsInRange(sessions, ...Object.values(rangeForPeriod("week"))));
  const month = totalMinutes(sessionsInRange(sessions, ...Object.values(rangeForPeriod("month"))));
  const year = totalMinutes(sessionsInRange(sessions, ...Object.values(rangeForPeriod("year"))));

  const cards = [
    ["All-time total", formatDuration(all)],
    ["Current streak", streak > 0 ? `${streak}` : "0", "days"],
    ["Started", data.meta.startDate ? formatDateLabel(data.meta.startDate) : "—"],
    ["Today", formatDuration(today)],
    ["This week", formatDuration(week)],
    ["This month", formatDuration(month)],
    ["This year", formatDuration(year)],
  ];

  document.getElementById("statCards").innerHTML = cards
    .map(
      ([label, value, unit]) => `
        <div class="jt-card jt-stat-card">
          <span class="jt-stat-label">${label}</span>
          <span class="jt-stat-value">${value}${unit ? `<span class="unit">${unit}</span>` : ""}</span>
        </div>
      `
    )
    .join("");
}

function renderRangeSection(data) {
  const controlEl = document.getElementById("rangeControl");
  renderRangeControl(controlEl, rangeState, (next) => {
    rangeState = next;
    renderRangeSection(data);
  });
  renderSortToggle(
    document.getElementById("sortToggle"),
    [
      { value: "time", label: "By time" },
      { value: "az", label: "A–Z" },
    ],
    sortMode,
    (next) => {
      sortMode = next;
      renderRangeSection(data);
    }
  );
  renderProjectTotals(data);
}

function renderProjectTotals(data) {
  const { start, end } = rangeForPeriod(rangeState.period, rangeState.refDate, data.meta.startDate);
  const inRange = sessionsInRange(data.sessions, start, end);

  const totals = data.projects
    .map((p) => ({
      project: p,
      minutes: inRange.filter((s) => s.projectId === p.id).reduce((sum, s) => sum + s.duration, 0),
    }))
    .filter((t) => !t.project.archived || t.minutes > 0)
    .sort((a, b) =>
      sortMode === "az" ? a.project.name.localeCompare(b.project.name) : b.minutes - a.minutes
    );

  const max = Math.max(1, ...totals.map((t) => t.minutes));
  const el = document.getElementById("projectTotals");

  if (!totals.length || totals.every((t) => t.minutes === 0)) {
    el.innerHTML = `<div class="jt-empty-state">No study sessions logged for this range yet.</div>`;
    return;
  }

  el.innerHTML = totals
    .map(
      (t) => `
        <div class="jt-proj-total-row">
          <span class="jt-dot" style="background:${t.project.color}"></span>
          <span class="jt-proj-total-name">${escapeHtml(t.project.name)}</span>
          <span class="jt-proj-total-bar-wrap">
            <span class="jt-proj-total-bar" style="width:${(t.minutes / max) * 100}%;background:${t.project.color}"></span>
          </span>
          <span class="jt-proj-total-value">${formatDuration(t.minutes)}</span>
        </div>
      `
    )
    .join("");
}

function renderHeatmap(data) {
  const el = document.getElementById("heatmapCard");
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

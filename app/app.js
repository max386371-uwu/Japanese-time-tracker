import { getData, SIDEBAR_ROUTES } from "../shared/storage.js";
import { applyTheme } from "../shared/theme.js";
import { applyLayout } from "../shared/layout.js";
import { applyIconStyleToDOM } from "../shared/icon.js";
import { computeStreak, setWeekStart, setDayStart } from "../shared/time.js";

import * as dashboardPage from "./pages/dashboard.js";
import * as timerPage from "./pages/timer.js";
import * as projectsPage from "./pages/projects.js";
import * as reportsPage from "./pages/reports.js";
import * as notebookPage from "./pages/notebook.js";
import * as searchPage from "./pages/search.js";
import * as settingsPage from "./pages/settings.js";

const ROUTES = {
  dashboard: dashboardPage,
  timer: timerPage,
  projects: projectsPage,
  reports: reportsPage,
  notebook: notebookPage,
  search: searchPage,
  settings: settingsPage,
};

const pageRoot = document.getElementById("pageRoot");
const streakSummaryEl = document.getElementById("streakSummary");

export async function refreshShellChrome() {
  const data = await getData();
  setWeekStart(data.settings.weekStartsMonday);
  setDayStart(data.settings.dayStartMinutes);
  applyIconStyleToDOM(data.settings);
  const streak = computeStreak(data.sessions);
  streakSummaryEl.textContent = streak > 0 ? `${streak} day streak 🔥` : "Start your streak today";
  applyNavVisibility(data);
}

function applyNavVisibility(data) {
  const visibility = data.settings.sidebarVisibility || {};
  const order = data.settings.sidebarOrder && data.settings.sidebarOrder.length
    ? data.settings.sidebarOrder
    : SIDEBAR_ROUTES;
  const orderedRoutes = [...order, ...SIDEBAR_ROUTES.filter((r) => !order.includes(r))];
  const visibleRoutes = orderedRoutes.filter((r) => visibility[r] !== false);

  orderedRoutes.forEach((route, i) => {
    const link = document.querySelector(`#mainNav a[data-route="${route}"]`);
    if (!link) return;
    link.style.display = visibility[route] === false ? "none" : "";
    link.style.order = i;
  });

  const currentRoute = parseHash().route;
  if (visibility[currentRoute] === false) {
    location.hash = visibleRoutes.length ? `#/${visibleRoutes[0]}` : "#/settings";
  }
}

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "") || "dashboard";
  const [route, queryStr] = raw.split("?");
  const query = Object.fromEntries(new URLSearchParams(queryStr || ""));
  return { route: route || "dashboard", query };
}

async function router() {
  const { route, query } = parseHash();
  const page = ROUTES[route] || dashboardPage;

  document.querySelectorAll("#mainNav a, .jt-settings-link").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === route);
  });

  pageRoot.innerHTML = "";
  await page.render(pageRoot, query);
  await refreshShellChrome();
}

window.addEventListener("hashchange", router);

// "/" jumps straight to the Search page — search itself only lives there.
window.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
    e.preventDefault();
    if (parseHash().route !== "search") location.hash = "#/search";
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.jt_data) {
    refreshShellChrome();
  }
});

async function boot() {
  const data = await getData();
  applyTheme(data.settings.theme);
  applyLayout(data.settings.layout);
  setWeekStart(data.settings.weekStartsMonday);
  setDayStart(data.settings.dayStartMinutes);
  applyIconStyleToDOM(data.settings);
  if (!location.hash) location.hash = "#/dashboard";
  await router();
}

boot();

import {
  getData,
  updateSettings,
  exportBackup,
  importBackupReplace,
  importBackupMerge,
  resetAllData,
  importSessionsFromRows,
  SIDEBAR_ROUTES,
} from "../../shared/storage.js";
import { THEME_PRESETS, applyTheme } from "../../shared/theme.js";
import {
  applyLayout,
  SIDEBAR_POSITIONS,
  DENSITY_OPTIONS,
  FONT_SIZE_OPTIONS,
  CORNER_OPTIONS,
  MODE_OPTIONS,
} from "../../shared/layout.js";
import { applyIconStyleToDOM, fileToIconDataUrl } from "../../shared/icon.js";
import { escapeHtml, confirmDialog, toast, openModal, closeModal, renderSortToggle } from "../../shared/ui.js";
import { parseCSV, rowsToObjects, detectColumnMap, mapTogglRows, sessionsToCSV } from "../../shared/csv.js";
import { formatDuration, formatDateLabel, setWeekStart, setDayStart } from "../../shared/time.js";

const WIDGET_LABELS = { stats: "Stat cards", projects: "Time-by-project list", heatmap: "Study calendar" };
const SIDEBAR_LABELS = {
  dashboard: "Dashboard",
  timer: "Timer",
  projects: "Projects",
  reports: "Reports",
  notebook: "Notebook",
  search: "Search",
};
const COLOR_FIELDS = [
  ["bg", "Background"],
  ["surface", "Card surface"],
  ["surfaceAlt", "Surface (alt / bars)"],
  ["text", "Text"],
  ["textMuted", "Muted text"],
  ["accent", "Accent"],
  ["accent2", "Accent 2"],
];

export async function render(root) {
  const data = await getData();
  root.innerHTML = `
    <div class="jt-page-header">
      <div>
        <h1 class="jt-page-title">Settings</h1>
        <p class="jt-page-sub">Make it yours. Everything here is stored only on this device.</p>
      </div>
    </div>

    <div class="jt-grid jt-grid-2">
      <div>
        <div class="jt-card" style="margin-bottom:14px;">
          <div class="jt-section-title" style="margin-top:0;">Theme</div>
          <div class="jt-theme-swatch-row" id="presetRow"></div>
          <div class="jt-section-title" style="font-size:13px;">Fine-tune colors</div>
          <div id="colorFields"></div>
        </div>
        <div class="jt-card" style="margin-bottom:14px;">
          <div class="jt-section-title" style="margin-top:0;">Logo &amp; icon</div>
          <p class="jt-muted jt-caption-text" style="font-size:13px;margin-top:-6px;">Also updates the toolbar icon.</p>
          <div id="iconControls"></div>
        </div>
        <div class="jt-card">
          <div class="jt-section-title" style="margin-top:0;">Interface</div>
          <div id="widgetToggles"></div>
        </div>
      </div>

      <div>
        <div class="jt-card" style="margin-bottom:14px;">
          <div class="jt-section-title" style="margin-top:0;">Layout</div>
          <div id="layoutControls"></div>
        </div>
        <div class="jt-card" style="margin-bottom:14px;">
          <div class="jt-section-title" style="margin-top:0;">Preferences</div>
          <div id="prefControls"></div>
        </div>
        <div class="jt-card">
          <div class="jt-section-title" style="margin-top:0;">Backup &amp; export</div>
          <p class="jt-muted" style="font-size:13px;margin-top:-6px;">Everything below stays on this device unless you download it yourself.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
            <button class="jt-btn jt-btn-primary" id="exportBtn">Export backup (.json)</button>
            <button class="jt-btn jt-btn-secondary" id="importBtn">Import backup</button>
            <input type="file" id="importFile" accept="application/json" style="display:none;" />
          </div>
          <p class="jt-muted jt-caption-text" style="font-size:13px;">
            CSV works with Toggl, Clockify, and similar apps (Toggl → Reports → Detailed → Export → CSV; free plans:
            Settings → Data Export → Time Entries).
          </p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="jt-btn jt-btn-secondary" id="exportCsvBtn">Export as CSV</button>
            <button class="jt-btn jt-btn-secondary" id="togglImportBtn">Import CSV</button>
            <input type="file" id="togglFile" accept=".csv,text/csv" style="display:none;" />
          </div>
          <div class="jt-section-title" style="font-size:13px;color:#F28FAD;">Danger zone</div>
          <button class="jt-btn jt-btn-danger" id="resetBtn">Erase all data</button>
        </div>
      </div>
    </div>
  `;

  renderPresets(data, root);
  renderColorFields(data, root);
  renderIconControls(data, root);
  renderLayoutControls(data, root);
  renderPrefControls(data, root);
  renderWidgetToggles(data, root);
  wireBackup(data, root);
}

function renderPresets(data, root) {
  const el = document.getElementById("presetRow");
  el.innerHTML = Object.entries(THEME_PRESETS)
    .map(
      ([key, preset]) => `
        <div class="jt-theme-swatch ${data.settings.theme.preset === key ? "active" : ""}" data-preset="${key}">
          <div class="jt-theme-swatch-preview" style="background:linear-gradient(135deg, ${preset.bg}, ${preset.surfaceAlt} 60%, ${preset.accent})"></div>
          <div class="jt-theme-swatch-label">${preset.label}</div>
        </div>`
    )
    .join("");
  el.querySelectorAll("[data-preset]").forEach((sw) => {
    sw.addEventListener("click", async () => {
      const preset = THEME_PRESETS[sw.dataset.preset];
      const theme = { ...preset, preset: sw.dataset.preset };
      await updateSettings({ theme });
      applyTheme(theme);
      render(root);
      toast(`Theme set to ${preset.label}`);
    });
  });
}

function renderColorFields(data, root) {
  const el = document.getElementById("colorFields");
  el.innerHTML = COLOR_FIELDS.map(
    ([key, label]) => `
      <div class="jt-color-row">
        <label>${label}</label>
        <input type="color" id="c_${key}" value="${data.settings.theme[key]}" />
      </div>`
  ).join("");
  COLOR_FIELDS.forEach(([key]) => {
    document.getElementById(`c_${key}`).addEventListener("input", async (e) => {
      const theme = { ...data.settings.theme, [key]: e.target.value, preset: "custom" };
      data.settings.theme = theme;
      applyTheme(theme);
      await updateSettings({ theme });
    });
  });
}

const ICON_MODE_OPTIONS = [
  { value: "theme", label: "Theme" },
  { value: "color", label: "Color" },
  { value: "image", label: "Image" },
];

function renderIconControls(data, root) {
  const el = document.getElementById("iconControls");
  const icon = data.settings.icon || { mode: "theme" };

  el.innerHTML = `
    <div class="jt-field">
      <div style="display:flex;align-items:center;gap:12px;">
        <span class="jt-mark" id="iconPreview" style="width:38px;height:38px;font-size:20px;border-radius:10px;">時</span>
        <div id="iconModeRow" style="display:flex;gap:4px;"></div>
      </div>
    </div>
    <div id="iconModeExtra"></div>
  `;

  renderSortToggle(document.getElementById("iconModeRow"), ICON_MODE_OPTIONS, icon.mode || "theme", async (mode) => {
    const nextIcon = { ...icon, mode };
    data.settings.icon = nextIcon;
    await updateSettings({ icon: nextIcon });
    applyIconStyleToDOM(data.settings);
    renderIconControls(data, root);
  });

  const extra = document.getElementById("iconModeExtra");
  if (icon.mode === "color") {
    extra.innerHTML = `
      <div class="jt-field" style="margin-top:10px;margin-bottom:0;">
        <label>Icon color</label>
        <input type="color" id="iconColorInput" value="${icon.color || "#6EC1E4"}" style="width:44px;height:30px;border:none;background:none;cursor:pointer;" />
      </div>
    `;
    document.getElementById("iconColorInput").addEventListener("input", async (e) => {
      const nextIcon = { ...data.settings.icon, color: e.target.value };
      data.settings.icon = nextIcon;
      applyIconStyleToDOM(data.settings);
      document.getElementById("iconPreview").style.background = e.target.value;
      await updateSettings({ icon: nextIcon });
    });
  } else if (icon.mode === "image") {
    extra.innerHTML = `
      <div class="jt-field" style="margin-top:10px;margin-bottom:0;">
        <label>Upload image</label>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button type="button" class="jt-btn jt-btn-secondary" id="iconImageBtn">Choose file</button>
          <span class="jt-muted" id="iconImageFileName" style="font-size:12.5px;">${icon.imageDataUrl ? "Custom image set" : "No file chosen"}</span>
          <input type="file" id="iconImageInput" accept="image/*" style="display:none;" />
        </div>
        ${icon.imageDataUrl ? `<button class="jt-btn jt-btn-sm jt-btn-secondary" id="iconImageClear" style="margin-top:8px;">Remove image</button>` : ""}
      </div>
    `;
    const fileInput = document.getElementById("iconImageInput");
    document.getElementById("iconImageBtn").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      document.getElementById("iconImageFileName").textContent = file.name;
      try {
        const dataUrl = await fileToIconDataUrl(file, 128);
        const nextIcon = { ...data.settings.icon, imageDataUrl: dataUrl };
        data.settings.icon = nextIcon;
        await updateSettings({ icon: nextIcon });
        applyIconStyleToDOM(data.settings);
        toast("Icon updated");
        renderIconControls(data, root);
      } catch (err) {
        toast("Couldn't use that image.");
      }
    });
    const clearBtn = document.getElementById("iconImageClear");
    if (clearBtn) {
      clearBtn.addEventListener("click", async () => {
        const nextIcon = { ...data.settings.icon, imageDataUrl: null };
        data.settings.icon = nextIcon;
        await updateSettings({ icon: nextIcon });
        applyIconStyleToDOM(data.settings);
        renderIconControls(data, root);
      });
    }
  } else {
    extra.innerHTML = "";
  }
}

function renderPrefControls(data, root) {
  const el = document.getElementById("prefControls");
  const dayStartMinutes = data.settings.dayStartMinutes || 0;
  const dayStartOptions = [0, 60, 120, 180, 240, 300, 360].map((m) => {
    const label = m === 0 ? "Midnight (12:00 AM)" : `${m / 60}:00 AM`;
    return `<option value="${m}">${label}</option>`;
  });
  el.innerHTML = `
    <div class="jt-field">
      <label>Week starts on</label>
      <div id="weekStartRow" style="display:flex;gap:4px;"></div>
    </div>
    <div class="jt-field">
      <label>Day starts at</label>
      <select class="jt-select" id="dayStartSelect">
        ${dayStartOptions.join("")}
      </select>
      <p class="jt-muted jt-caption-text" style="font-size:12px;margin:6px 0 0;">
        Sessions before this time count toward the previous day — handy for late-night study sessions.
        A tracked day runs from this time until the same time the next day.
      </p>
    </div>
    <div class="jt-field" style="margin-bottom:0;">
      <label>Minimum session length to save</label>
      <select class="jt-select" id="minSessionSelect">
        <option value="0">No minimum</option>
        <option value="10">10 seconds</option>
        <option value="30">30 seconds</option>
        <option value="60">1 minute</option>
        <option value="300">5 minutes</option>
      </select>
    </div>
  `;

  renderSortToggle(
    document.getElementById("weekStartRow"),
    [
      { value: "monday", label: "Monday" },
      { value: "sunday", label: "Sunday" },
    ],
    data.settings.weekStartsMonday === false ? "sunday" : "monday",
    async (v) => {
      const weekStartsMonday = v === "monday";
      data.settings.weekStartsMonday = weekStartsMonday;
      setWeekStart(weekStartsMonday);
      await updateSettings({ weekStartsMonday });
      renderPrefControls(data, root);
    }
  );

  const dayStartSelect = document.getElementById("dayStartSelect");
  dayStartSelect.value = String(dayStartMinutes);
  dayStartSelect.addEventListener("change", async () => {
    const minutes = Number(dayStartSelect.value);
    data.settings.dayStartMinutes = minutes;
    setDayStart(minutes);
    await updateSettings({ dayStartMinutes: minutes });
    toast("Day boundary updated");
  });

  const select = document.getElementById("minSessionSelect");
  select.value = String(data.settings.minSessionSeconds ?? 30);
  select.addEventListener("change", async () => {
    const minSessionSeconds = Number(select.value);
    data.settings.minSessionSeconds = minSessionSeconds;
    await updateSettings({ minSessionSeconds });
  });
}

function renderLayoutControls(data, root) {
  const el = document.getElementById("layoutControls");
  const layout = data.settings.layout || {};
  el.innerHTML = `
    <div class="jt-field">
      <label>Simple mode</label>
      <div id="layoutMode" style="display:flex;gap:4px;"></div>
    </div>
    <div class="jt-field">
      <label>Sidebar position</label>
      <div id="layoutSidebar" style="display:flex;gap:4px;"></div>
    </div>
    <div class="jt-field">
      <label>Density</label>
      <div id="layoutDensity" style="display:flex;gap:4px;"></div>
    </div>
    <div class="jt-field">
      <label>Font size</label>
      <div id="layoutFontSize" style="display:flex;gap:4px;"></div>
    </div>
    <div class="jt-field">
      <label>Corner style</label>
      <div id="layoutCorners" style="display:flex;gap:4px;"></div>
    </div>
    <div class="jt-field" style="margin-bottom:0;">
      <label>Edit sidebar</label>
      <div id="sidebarOrderList" class="jt-scroll-list"></div>
    </div>
  `;

  const apply = async (patch) => {
    const nextLayout = { ...data.settings.layout, ...patch };
    data.settings.layout = nextLayout;
    applyLayout(nextLayout);
    await updateSettings({ layout: nextLayout });
    renderLayoutControls(data, root);
  };

  renderSortToggle(document.getElementById("layoutMode"), MODE_OPTIONS, layout.mode || "standard", (v) =>
    apply({ mode: v })
  );
  renderSortToggle(document.getElementById("layoutSidebar"), SIDEBAR_POSITIONS, layout.sidebarPosition, (v) =>
    apply({ sidebarPosition: v })
  );
  renderSortToggle(document.getElementById("layoutDensity"), DENSITY_OPTIONS, layout.density, (v) =>
    apply({ density: v })
  );
  renderSortToggle(document.getElementById("layoutFontSize"), FONT_SIZE_OPTIONS, layout.fontSize || "medium", (v) =>
    apply({ fontSize: v })
  );
  renderSortToggle(document.getElementById("layoutCorners"), CORNER_OPTIONS, layout.corners || "rounded", (v) =>
    apply({ corners: v })
  );
  renderSidebarOrderList(data, root);
}

function renderSidebarOrderList(data, root) {
  const el = document.getElementById("sidebarOrderList");
  const order =
    data.settings.sidebarOrder && data.settings.sidebarOrder.length
      ? data.settings.sidebarOrder
      : SIDEBAR_ROUTES;
  const fullOrder = [...order, ...SIDEBAR_ROUTES.filter((r) => !order.includes(r))];

  el.innerHTML = fullOrder
    .map(
      (route, i) => `
      <div class="jt-flex-between" style="padding:5px 0;">
        <span style="font-size:13px;">${SIDEBAR_LABELS[route]}</span>
        <div style="display:flex;gap:4px;">
          <button class="jt-btn jt-btn-sm jt-btn-secondary" data-up="${route}" ${i === 0 ? "disabled" : ""}>↑</button>
          <button class="jt-btn jt-btn-sm jt-btn-secondary" data-down="${route}" ${i === fullOrder.length - 1 ? "disabled" : ""}>↓</button>
        </div>
      </div>`
    )
    .join("");

  const move = async (route, dir) => {
    const idx = fullOrder.indexOf(route);
    const swapWith = idx + dir;
    if (swapWith < 0 || swapWith >= fullOrder.length) return;
    [fullOrder[idx], fullOrder[swapWith]] = [fullOrder[swapWith], fullOrder[idx]];
    data.settings.sidebarOrder = [...fullOrder];
    await updateSettings({ sidebarOrder: [...fullOrder] });
    renderSidebarOrderList(data, root);
  };

  el.querySelectorAll("[data-up]").forEach((btn) => btn.addEventListener("click", () => move(btn.dataset.up, -1)));
  el.querySelectorAll("[data-down]").forEach((btn) => btn.addEventListener("click", () => move(btn.dataset.down, 1)));
}

function renderWidgetToggles(data, root) {
  const el = document.getElementById("widgetToggles");
  const widgets = data.settings.dashboardWidgets || [];
  const visibility = data.settings.sidebarVisibility || {};
  el.innerHTML = `
    ${Object.entries(WIDGET_LABELS)
      .map(
        ([key, label]) => `
      <div class="jt-widget-toggle">
        <span>${label}</span>
        <label class="jt-switch">
          <input type="checkbox" data-w="${key}" ${widgets.includes(key) ? "checked" : ""} />
          <span class="jt-switch-track"></span>
        </label>
      </div>`
      )
      .join("")}
    <div class="jt-section-title" style="font-size:13px;">Sidebar pages</div>
    ${SIDEBAR_ROUTES.map(
      (route) => `
      <div class="jt-widget-toggle">
        <span>Show ${SIDEBAR_LABELS[route]}</span>
        <label class="jt-switch">
          <input type="checkbox" data-route="${route}" ${visibility[route] !== false ? "checked" : ""} />
          <span class="jt-switch-track"></span>
        </label>
      </div>`
    ).join("")}
  `;
  el.querySelectorAll("input[data-w]").forEach((box) => {
    box.addEventListener("change", async () => {
      const current = new Set(data.settings.dashboardWidgets || []);
      if (box.checked) current.add(box.dataset.w);
      else current.delete(box.dataset.w);
      data.settings.dashboardWidgets = [...current];
      await updateSettings({ dashboardWidgets: [...current] });
    });
  });
  el.querySelectorAll("input[data-route]").forEach((box) => {
    box.addEventListener("change", async () => {
      const nextVisibility = { ...data.settings.sidebarVisibility, [box.dataset.route]: box.checked };
      data.settings.sidebarVisibility = nextVisibility;
      await updateSettings({ sidebarVisibility: nextVisibility });
    });
  });
}

function wireBackup(data, root) {
  document.getElementById("exportBtn").addEventListener("click", async () => {
    const backup = await exportBackup();
    downloadFile(JSON.stringify(backup, null, 2), "JapaneseTracker_Backup.json", "application/json");
    toast("Backup downloaded");
  });

  document.getElementById("exportCsvBtn").addEventListener("click", async () => {
    const fresh = await getData();
    if (!fresh.sessions.length) {
      toast("Nothing to export yet — log a session first.");
      return;
    }
    const csv = sessionsToCSV(fresh);
    downloadFile(csv, "JapaneseTracker_Export.csv", "text/csv");
    toast("CSV exported");
  });

  const fileInput = document.getElementById("importFile");
  document.getElementById("importBtn").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    fileInput.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      showBackupImportChoice(root, parsed);
    } catch (err) {
      toast("That file couldn't be read as a Japanese Tracker backup.");
    }
  });

  document.getElementById("resetBtn").addEventListener("click", async () => {
    const ok = await confirmDialog("This permanently erases every project, session, and notebook entry on this device.", {
      confirmLabel: "Erase everything",
    });
    if (!ok) return;
    await resetAllData();
    toast("All data erased");
    render(root);
  });

  const togglFile = document.getElementById("togglFile");
  document.getElementById("togglImportBtn").addEventListener("click", () => togglFile.click());
  togglFile.addEventListener("change", async () => {
    const file = togglFile.files[0];
    togglFile.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const { headers, records } = rowsToObjects(parseCSV(text));
      if (!records.length) {
        toast("That file doesn't have any rows we could read.");
        return;
      }
      const columnMap = detectColumnMap(headers);
      if (!columnMap.project || !columnMap.startDate) {
        openModal(`
          <h2>Couldn't map that file</h2>
          <p class="jt-muted">We look for columns like <em>Project</em>, <em>Start date</em>, <em>Start time</em>, and <em>Duration</em> (or <em>End date</em>/<em>End time</em>).</p>
          <p class="jt-muted">Columns found in your file: ${headers.map((h) => escapeHtml(h)).join(", ") || "none"}</p>
          <div class="jt-modal-actions"><button class="jt-btn jt-btn-secondary" id="ciClose">Close</button></div>
        `);
        document.getElementById("ciClose").addEventListener("click", closeModal);
        return;
      }
      const { rows, skipped, projectNames, tagNames } = mapTogglRows(records, columnMap);
      if (!rows.length) {
        toast("No importable rows were found — check the date/time columns in your export.");
        return;
      }
      showTogglPreview(root, { rows, skipped, projectNames, tagNames, data });
    } catch (err) {
      toast("That file couldn't be read as a CSV export.");
    }
  });
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function showBackupImportChoice(root, parsed) {
  const modal = openModal(`
    <h2>Import backup</h2>
    <p class="jt-muted" style="margin-top:-8px;">Choose how this backup should be applied.</p>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:6px;">
      <button class="jt-btn jt-btn-secondary" id="biMerge" style="justify-content:flex-start;text-align:left;padding:12px 14px;">
        <div>
          <div style="font-weight:700;">Merge</div>
          <div class="jt-muted" style="font-size:12px;font-weight:400;margin-top:2px;">Combine the backup with what's already on this device. Nothing existing is deleted.</div>
        </div>
      </button>
      <button class="jt-btn jt-btn-danger" id="biReplace" style="justify-content:flex-start;text-align:left;padding:12px 14px;">
        <div>
          <div style="font-weight:700;">Replace</div>
          <div class="jt-muted" style="font-size:12px;font-weight:400;margin-top:2px;">Completely replace your current data with this backup. This can't be undone.</div>
        </div>
      </button>
    </div>
    <div class="jt-modal-actions">
      <button class="jt-btn jt-btn-secondary" id="biCancel">Cancel</button>
    </div>
  `);

  modal.querySelector("#biCancel").addEventListener("click", closeModal);
  modal.querySelector("#biMerge").addEventListener("click", async () => {
    try {
      const result = await importBackupMerge(parsed);
      closeModal();
      toast(`Merged ${result.addedSessions} sessions and ${result.addedEntries} notebook entries`);
      render(root);
    } catch (err) {
      toast(err.message || "That backup couldn't be imported.");
    }
  });
  modal.querySelector("#biReplace").addEventListener("click", async () => {
    const ok = await confirmDialog("Your current projects, sessions, and settings will be replaced with this backup.", {
      confirmLabel: "Replace everything",
    });
    if (!ok) return;
    try {
      await importBackupReplace(parsed);
      closeModal();
      toast("Backup restored");
      render(root);
    } catch (err) {
      toast(err.message || "That backup couldn't be imported.");
    }
  });
}

function showTogglPreview(root, { rows, skipped, projectNames, tagNames, data }) {
  const starts = rows.map((r) => r.start);
  const earliest = Math.min(...starts);
  const latest = Math.max(...starts);
  const totalMinutes = rows.reduce((s, r) => s + r.duration, 0);
  const existingNames = new Set(data.projects.map((p) => p.name.toLowerCase()));

  const modal = openModal(`
    <h2>Import CSV</h2>
    <p class="jt-muted" style="margin-top:-10px;">
      ${rows.length} session${rows.length === 1 ? "" : "s"} found (${formatDuration(totalMinutes, { longForm: true })}),
      ${formatDateLabel(earliest)} – ${formatDateLabel(latest)}.
      ${skipped ? `${skipped} row${skipped === 1 ? "" : "s"} couldn't be read and will be skipped.` : ""}
    </p>
    <div class="jt-field">
      <label>Projects (${projectNames.length})</label>
      <div class="jt-chip-row">
        ${projectNames
          .map(
            (n) =>
              `<span class="jt-chip">${escapeHtml(n)}${existingNames.has(n.toLowerCase()) ? "" : " · new"}</span>`
          )
          .join("")}
      </div>
    </div>
    ${
      tagNames.length
        ? `<div class="jt-field"><label>Tags (${tagNames.length})</label><div class="jt-chip-row">${tagNames
            .map((n) => `<span class="jt-chip">#${escapeHtml(n)}</span>`)
            .join("")}</div></div>`
        : ""
    }
    <p class="jt-muted" style="font-size:12.5px;">This adds to what's already tracked — nothing existing gets overwritten. Projects matching an existing name (case-insensitive) will be merged into it automatically.</p>
    <div class="jt-modal-actions">
      <button class="jt-btn jt-btn-secondary" id="tiCancel">Cancel</button>
      <button class="jt-btn jt-btn-primary" id="tiConfirm">Import ${rows.length} sessions</button>
    </div>
  `);

  modal.querySelector("#tiCancel").addEventListener("click", closeModal);
  modal.querySelector("#tiConfirm").addEventListener("click", async () => {
    modal.querySelector("#tiConfirm").disabled = true;
    modal.querySelector("#tiConfirm").textContent = "Importing…";
    const result = await importSessionsFromRows(rows);
    closeModal();
    toast(`Imported ${result.imported} sessions across ${result.projects} projects`);
    render(root);
  });
}

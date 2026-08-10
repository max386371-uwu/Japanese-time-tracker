const backdrop = () => document.getElementById("modalBackdrop");

export function openModal(node) {
  const bd = backdrop();
  bd.innerHTML = "";
  const modal = document.createElement("div");
  modal.className = "jt-modal";
  if (typeof node === "string") modal.innerHTML = node;
  else modal.appendChild(node);
  bd.appendChild(modal);
  bd.classList.add("open");
  bd.onclick = (e) => {
    if (e.target === bd) closeModal();
  };
  return modal;
}

export function closeModal() {
  const bd = backdrop();
  bd.classList.remove("open");
  bd.innerHTML = "";
}

export function confirmDialog(message, { confirmLabel = "Delete", danger = true } = {}) {
  return new Promise((resolve) => {
    const modal = openModal(`
      <h2>Are you sure?</h2>
      <p class="jt-muted" style="margin-top:-8px;margin-bottom:18px;">${message}</p>
      <div class="jt-modal-actions">
        <button class="jt-btn jt-btn-secondary" id="cdCancel">Cancel</button>
        <button class="jt-btn ${danger ? "jt-btn-danger" : "jt-btn-primary"}" id="cdConfirm">${confirmLabel}</button>
      </div>
    `);
    modal.querySelector("#cdCancel").addEventListener("click", () => {
      closeModal();
      resolve(false);
    });
    modal.querySelector("#cdConfirm").addEventListener("click", () => {
      closeModal();
      resolve(true);
    });
  });
}

let toastTimeout = null;
export function toast(message) {
  let el = document.getElementById("jtToast");
  if (!el) {
    el = document.createElement("div");
    el.id = "jtToast";
    el.style.cssText = `
      position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%);
      background: var(--jt-surface-alt); color: var(--jt-text); padding: 10px 18px;
      border-radius: 999px; font-size: 13px; font-weight: 600; z-index: 200;
      box-shadow: 0 10px 24px rgba(0,0,0,0.35); opacity: 0; transition: opacity 0.2s;
    `;
    document.body.appendChild(el);
  }
  el.textContent = message;
  requestAnimationFrame(() => (el.style.opacity = "1"));
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    el.style.opacity = "0";
  }, 2400);
}

import { rangeForPeriod, formatDateLabel, formatMonthLabel, shiftRange } from "./time.js";

const PERIOD_LABELS = { day: "Day", week: "Week", month: "Month", year: "Year", all: "All Time" };

function rangeLabel(period, refDate, earliestStart) {
  const { start, end } = rangeForPeriod(period, refDate, earliestStart);
  if (period === "day") return formatDateLabel(refDate);
  if (period === "week") return `${formatDateLabel(start)} – ${formatDateLabel(end)}`;
  if (period === "month") return formatMonthLabel(refDate);
  if (period === "year") return String(new Date(refDate).getFullYear());
  return "All Time";
}

// state: { period, refDate }. onChange(nextState) is called with a new
// { period, refDate } object whenever the user changes either.
export function renderRangeControl(container, state, onChange, { earliestStart = null } = {}) {
  container.innerHTML = `
    <div class="jt-range-row">
      <div class="jt-range-picker">
        <button class="jt-range-btn" id="jtRangeBtn">${PERIOD_LABELS[state.period]} <span>▾</span></button>
        <div class="jt-range-menu" id="jtRangeMenu" style="display:none">
          ${Object.entries(PERIOD_LABELS)
            .map(
              ([k, label]) =>
                `<button data-p="${k}" class="${k === state.period ? "active" : ""}">${label}</button>`
            )
            .join("")}
        </div>
      </div>
      ${
        state.period === "all"
          ? ""
          : `<div class="jt-range-nav">
              <button id="jtRangePrev">‹</button>
              <span class="jt-range-label">${rangeLabel(state.period, state.refDate, earliestStart)}</span>
              <button id="jtRangeNext">›</button>
            </div>`
      }
    </div>
  `;

  const btn = container.querySelector("#jtRangeBtn");
  const menu = container.querySelector("#jtRangeMenu");
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.style.display = menu.style.display === "none" ? "block" : "none";
  });
  document.addEventListener(
    "click",
    () => {
      menu.style.display = "none";
    },
    { once: true }
  );
  menu.querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => {
      onChange({ period: b.dataset.p, refDate: state.refDate });
    });
  });

  const prev = container.querySelector("#jtRangePrev");
  const next = container.querySelector("#jtRangeNext");
  if (prev) {
    prev.addEventListener("click", () =>
      onChange({ period: state.period, refDate: shiftRange(state.period, state.refDate, -1) })
    );
    next.addEventListener("click", () =>
      onChange({ period: state.period, refDate: shiftRange(state.period, state.refDate, 1) })
    );
  }
}

// options: [{ value, label }]. Renders a small pill segmented control.
export function renderSortToggle(container, options, current, onChange) {
  container.innerHTML = options
    .map(
      (o) =>
        `<button type="button" class="jt-pill-tab ${o.value === current ? "active" : ""}" data-v="${o.value}" style="padding:5px 11px;font-size:11.5px;">${escapeHtml(o.label)}</button>`
    )
    .join("");
  container.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => onChange(btn.dataset.v));
  });
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

// ---------- Themed tooltip (replaces native <title> tooltips everywhere) ----------

let tooltipEl = null;
function ensureTooltipEl() {
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.className = "jt-tooltip";
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}

export function showTooltip(html, clientX, clientY) {
  const el = ensureTooltipEl();
  el.innerHTML = html;
  el.style.display = "block";
  const pad = 12;
  const rect = el.getBoundingClientRect();
  let left = clientX + 16;
  let top = clientY + 16;
  if (left + rect.width > window.innerWidth - pad) left = clientX - rect.width - 16;
  if (top + rect.height > window.innerHeight - pad) top = clientY - rect.height - 16;
  el.style.left = `${Math.max(pad, left)}px`;
  el.style.top = `${Math.max(pad, top)}px`;
}

export function hideTooltip() {
  if (tooltipEl) tooltipEl.style.display = "none";
}

// Attaches a themed tooltip to an element. htmlFn() should return the
// tooltip's inner HTML (a string) for the current hover.
export function attachTooltip(el, htmlFn) {
  const move = (e) => showTooltip(htmlFn(), e.clientX, e.clientY);
  el.addEventListener("mouseenter", move);
  el.addEventListener("mousemove", move);
  el.addEventListener("mouseleave", hideTooltip);
  el.addEventListener("blur", hideTooltip);
}

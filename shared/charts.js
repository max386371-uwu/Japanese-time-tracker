// Small, dependency-free chart renderers. Everything below builds real
// SVG/DOM nodes (no canvas, no external libs) so it works fully offline
// and stays crisp at any zoom level. Hover info uses the shared themed
// tooltip (see shared/ui.js) instead of native browser/OS tooltips.

import { attachTooltip } from "./ui.js";

const SVG_NS = "http://www.w3.org/2000/svg";

export function svgEl(tag, attrs = {}, children = []) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const c of children) el.appendChild(c);
  return el;
}

function clearAndAppend(container, node) {
  container.innerHTML = "";
  container.appendChild(node);
}

function emptyState(container, message) {
  container.innerHTML = `<div class="jt-chart-empty">${message}</div>`;
}

// segments: [{ label, value, color }]. formatTotal(total) formats the
// number centered inside the ring; tooltipFmt(seg, pct) formats the
// hover tooltip's inner HTML (percentage is only ever shown on hover).
export function pieChart(
  container,
  segments,
  { size = 220, donut = 0.32, formatTotal, tooltipFmt, centerCaption = "total" } = {}
) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (!total) return emptyState(container, "No data for this range yet.");

  const r = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  const thickness = r * donut;
  const ringR = r - thickness / 2;
  const gapAngle = 0.07; // radians between adjacent segments
  const minSpan = gapAngle * 1.4; // keep tiny slices visible as a short cap

  let angle = -Math.PI / 2;
  const g = svgEl("g");
  const visible = segments.filter((s) => s.value > 0);

  visible.forEach((seg) => {
    const frac = seg.value / total;
    const span = Math.max(minSpan, frac * Math.PI * 2);
    const start = angle + gapAngle / 2;
    const end = angle + span - gapAngle / 2;
    if (end > start) {
      const x1 = cx + ringR * Math.cos(start);
      const y1 = cy + ringR * Math.sin(start);
      const x2 = cx + ringR * Math.cos(end);
      const y2 = cy + ringR * Math.sin(end);
      const large = end - start > Math.PI ? 1 : 0;
      const d = `M ${x1} ${y1} A ${ringR} ${ringR} 0 ${large} 1 ${x2} ${y2}`;
      const path = svgEl("path", {
        d,
        stroke: seg.color,
        "stroke-width": thickness,
        "stroke-linecap": "round",
        fill: "none",
        class: "jt-pie-slice",
      });
      const pct = Math.round(frac * 100);
      attachTooltip(path, () =>
        tooltipFmt
          ? tooltipFmt(seg, pct)
          : `<strong>${seg.label}</strong><br>${seg.value} min · ${pct}%`
      );
      g.appendChild(path);
    }
    angle += frac * Math.PI * 2;
  });

  if (formatTotal) {
    const valueText = svgEl("text", {
      x: cx,
      y: cy - 3,
      class: "jt-pie-center-value",
      "text-anchor": "middle",
    });
    valueText.textContent = formatTotal(total);
    g.appendChild(valueText);

    const captionText = svgEl("text", {
      x: cx,
      y: cy + 16,
      class: "jt-pie-center-caption",
      "text-anchor": "middle",
    });
    captionText.textContent = centerCaption;
    g.appendChild(captionText);
  }

  const svg = svgEl("svg", { viewBox: `0 0 ${size} ${size}`, class: "jt-pie" }, [g]);
  clearAndAppend(container, svg);
}

// bars: [{ label, value, color }]
export function barChart(
  container,
  bars,
  { width = 560, height = 220, barGap = 8, valueFmt, yFmt } = {}
) {
  if (!bars.length) return emptyState(container, "No data for this range yet.");
  const max = Math.max(1, ...bars.map((b) => b.value));
  const padLeft = 8;
  const padBottom = 28;
  const padTop = 12;
  const chartH = height - padBottom - padTop;
  const chartW = width - padLeft * 2;
  const bw = chartW / bars.length - barGap;

  const g = svgEl("g");

  // gridlines
  for (let i = 0; i <= 3; i++) {
    const y = padTop + (chartH / 3) * i;
    g.appendChild(
      svgEl("line", {
        x1: padLeft,
        x2: width - padLeft,
        y1: y,
        y2: y,
        class: "jt-grid-line",
      })
    );
  }

  bars.forEach((b, i) => {
    const x = padLeft + i * (bw + barGap);
    const h = max ? (b.value / max) * chartH : 0;
    const y = padTop + chartH - h;
    const rect = svgEl("rect", {
      x,
      y,
      width: Math.max(2, bw),
      height: Math.max(0, h),
      rx: 4,
      fill: b.color || "var(--jt-accent)",
      class: "jt-bar",
    });
    attachTooltip(rect, () => (valueFmt ? valueFmt(b) : `<strong>${b.label}</strong><br>${b.value}`));
    g.appendChild(rect);

    const label = svgEl("text", {
      x: x + bw / 2,
      y: height - 8,
      class: "jt-bar-label",
      "text-anchor": "middle",
    });
    label.textContent = yFmt ? yFmt(b.label) : b.label;
    g.appendChild(label);
  });

  const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, class: "jt-barchart" }, [g]);
  clearAndAppend(container, svg);
}

// points: [{ x: label, y: value }]
export function lineChart(
  container,
  points,
  { width = 620, height = 220, color = "var(--jt-accent)", valueFmt } = {}
) {
  if (!points.length) return emptyState(container, "No data for this range yet.");
  const max = Math.max(1, ...points.map((p) => p.y));
  const min = Math.min(0, ...points.map((p) => p.y));
  const range = max - min || 1;
  const padLeft = 12;
  const padRight = 12;
  const padTop = 16;
  const padBottom = 28;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;
  const stepX = points.length > 1 ? chartW / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = padLeft + i * stepX;
    const y = padTop + chartH - ((p.y - min) / range) * chartH;
    return [x, y];
  });

  const linePath = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  const areaPath =
    linePath +
    ` L ${coords[coords.length - 1][0]} ${padTop + chartH}` +
    ` L ${coords[0][0]} ${padTop + chartH} Z`;

  const g = svgEl("g");
  g.appendChild(svgEl("path", { d: areaPath, class: "jt-line-area", fill: color }));
  g.appendChild(svgEl("path", { d: linePath, class: "jt-line-path", stroke: color, fill: "none" }));

  coords.forEach(([x, y], i) => {
    const dot = svgEl("circle", { cx: x, cy: y, r: 3.5, fill: color, class: "jt-line-dot" });
    attachTooltip(dot, () =>
      valueFmt ? valueFmt(points[i]) : `<strong>${points[i].x}</strong><br>${points[i].y}`
    );
    g.appendChild(dot);
  });

  // sparse x labels so long ranges don't overlap
  const labelEvery = Math.max(1, Math.ceil(points.length / 8));
  points.forEach((p, i) => {
    if (i % labelEvery !== 0 && i !== points.length - 1) return;
    const [x] = coords[i];
    const label = svgEl("text", {
      x,
      y: height - 8,
      class: "jt-line-label",
      "text-anchor": "middle",
    });
    label.textContent = p.x;
    g.appendChild(label);
  });

  const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, class: "jt-linechart" }, [g]);
  clearAndAppend(container, svg);
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function mixHex(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

// cells: [{ date: Date, minutes: number }]
export function heatmap(
  container,
  cells,
  {
    onCellClick,
    tooltipFmt,
    cellSize = 12,
    gap = 3,
    weeks = 26,
    accentColor = "#6EC1E4",
    baseColor = "#1B3355",
  } = {}
) {
  const byDay = new Map(cells.map((c) => [c.date.toDateString(), c.minutes]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  // align to end of this week (Sunday) so columns are full weeks
  const endDow = (end.getDay() + 6) % 7;
  end.setDate(end.getDate() + (6 - endDow));
  const start = new Date(end);
  start.setDate(start.getDate() - weeks * 7 + 1);

  const max = Math.max(1, ...cells.map((c) => c.minutes));
  const cols = weeks;
  const rows = 7;
  const width = cols * (cellSize + gap) + gap + 24;
  const height = rows * (cellSize + gap) + gap + 16;

  const g = svgEl("g");
  let cursor = new Date(start);
  let col = 0;
  const monthLabels = [];
  let lastMonth = -1;

  while (cursor <= end) {
    const row = (cursor.getDay() + 6) % 7;
    if (row === 0 && cursor.getMonth() !== lastMonth) {
      monthLabels.push({
        col,
        text: cursor.toLocaleDateString(undefined, { month: "short" }),
      });
      lastMonth = cursor.getMonth();
    }
    const x = gap + 24 + col * (cellSize + gap);
    const y = gap + 16 + row * (cellSize + gap);
    const minutes = cursor > today ? null : byDay.get(cursor.toDateString()) || 0;
    let fill = baseColor;
    if (minutes !== null && minutes > 0) {
      const intensity = Math.min(1, minutes / max);
      fill = mixHex(baseColor, accentColor, 0.15 + intensity * 0.85);
    }
    const rect = svgEl("rect", {
      x,
      y,
      width: cellSize,
      height: cellSize,
      rx: 3,
      fill,
      class: minutes !== null ? "jt-heat-cell" : "jt-heat-cell jt-heat-cell-future",
      "data-date": cursor.toDateString(),
    });
    if (minutes !== null) {
      attachTooltip(rect, () =>
        tooltipFmt
          ? tooltipFmt(new Date(rect.dataset.date), minutes)
          : `${rect.dataset.date}: ${minutes}m`
      );
      if (onCellClick) {
        rect.style.cursor = "pointer";
        rect.addEventListener("click", () => onCellClick(new Date(cursor), minutes));
      }
    }
    g.appendChild(rect);

    if (row === 6) col += 1;
    cursor.setDate(cursor.getDate() + 1);
  }

  monthLabels.forEach((m) => {
    const label = svgEl("text", {
      x: gap + 24 + m.col * (cellSize + gap),
      y: 12,
      class: "jt-heat-month",
    });
    label.textContent = m.text;
    g.appendChild(label);
  });

  const dayLabels = ["Mon", "Wed", "Fri"];
  const dayRows = [0, 2, 4];
  dayRows.forEach((r, i) => {
    const label = svgEl("text", {
      x: 0,
      y: gap + 16 + r * (cellSize + gap) + cellSize - 2,
      class: "jt-heat-day",
    });
    label.textContent = dayLabels[i];
    g.appendChild(label);
  });

  const svg = svgEl(
    "svg",
    { viewBox: `0 0 ${width} ${height}`, class: "jt-heatmap", width: "100%" },
    [g]
  );
  clearAndAppend(container, svg);
}

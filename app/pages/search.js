import { getData } from "../../shared/storage.js";
import { formatDuration, formatDateLabel } from "../../shared/time.js";
import { escapeHtml } from "../../shared/ui.js";
import { openDayDetail } from "../../shared/dayDetail.js";
import { fuzzyMatch } from "../../shared/fuzzy.js";

export async function render(root, query = {}) {
  const data = await getData();
  root.innerHTML = `
    <div class="jt-page-header">
      <div>
        <h1 class="jt-page-title">Search</h1>
        <p class="jt-page-sub">Find anything across your whole learning journey.</p>
      </div>
    </div>
    <div class="jt-field" style="max-width:420px;">
      <input type="text" class="jt-input" id="searchInput" placeholder="Search projects, tags, notebook entries…" value="${escapeHtml(query.q || "")}" />
    </div>
    <div id="resultsWrap"></div>
  `;

  const input = document.getElementById("searchInput");
  let debounceHandle = null;
  input.addEventListener("input", () => {
    clearTimeout(debounceHandle);
    debounceHandle = setTimeout(() => runSearch(data, input.value, root), 120);
  });
  input.focus();
  input.selectionStart = input.selectionEnd = input.value.length;
  runSearch(data, input.value, root);
}

function runSearch(data, rawQuery, root) {
  const q = rawQuery.trim().toLowerCase();
  const wrap = document.getElementById("resultsWrap");
  if (!q) {
    wrap.innerHTML = `<div class="jt-empty-state">Start typing to search your projects, tags, notebook, and sessions.</div>`;
    return;
  }

  const projects = data.projects.filter((p) => fuzzyMatch(p.name, q));
  const tags = data.tags.filter((t) => fuzzyMatch(t.name, q));
  const notebookEntries = data.notebook.entries.filter(
    (e) => fuzzyMatch(e.title, q) || fuzzyMatch(e.notes || "", q)
  );
  const goalProjects = data.projects.filter((p) => (p.goals || []).length && fuzzyMatch(p.name, q));
  const matchingTagIds = new Set(tags.map((t) => t.id));
  const matchingProjectIds = new Set(projects.map((p) => p.id));
  const sessions = data.sessions.filter(
    (s) =>
      (s.notes || "").toLowerCase().includes(q) ||
      (s.tagIds || []).some((id) => matchingTagIds.has(id)) ||
      matchingProjectIds.has(s.projectId)
  );

  const groups = [];

  if (projects.length) {
    groups.push({
      title: "Projects",
      items: projects.map((p) => ({
        title: p.name,
        sub: `Project`,
        color: p.color,
        onClick: () => (location.hash = "#/projects"),
      })),
    });
  }

  if (tags.length) {
    groups.push({
      title: "Tags",
      items: tags.map((t) => ({
        title: `#${t.name}`,
        sub: `${data.sessions.filter((s) => (s.tagIds || []).includes(t.id)).length} sessions`,
        onClick: () => (location.hash = "#/projects"),
      })),
    });
  }

  if (notebookEntries.length) {
    groups.push({
      title: "Notebook",
      items: notebookEntries.map((e) => ({
        title: e.title,
        sub: `${formatDateLabel(e.date)} · ${e.type}`,
        onClick: () => (location.hash = "#/notebook"),
      })),
    });
  }

  if (goalProjects.length) {
    groups.push({
      title: "Goals",
      items: goalProjects.flatMap((p) =>
        p.goals.map((g) => ({
          title: `${p.name} — ${formatDuration(g.amountMinutes, { longForm: true })} goal`,
          sub: g.period,
          color: p.color,
          onClick: () => (location.hash = "#/projects"),
        }))
      ),
    });
  }

  if (sessions.length) {
    groups.push({
      title: "Sessions",
      items: [
        {
          title: `${sessions.length} matching session${sessions.length === 1 ? "" : "s"}`,
          sub: "Click to review the most recent match",
          onClick: () => {
            const latest = sessions.sort((a, b) => b.start - a.start)[0];
            openDayDetail(new Date(latest.start), data);
          },
        },
      ],
    });
  }

  if (!groups.length) {
    wrap.innerHTML = `<div class="jt-empty-state">No matches for “${escapeHtml(rawQuery)}”.</div>`;
    return;
  }

  wrap.innerHTML = groups
    .map(
      (g) => `
        <div class="jt-search-group">
          <h3>${g.title}</h3>
          ${g.items
            .map(
              (item, i) => `
              <div class="jt-search-result" data-group="${g.title}" data-i="${i}">
                <div class="jt-search-result-title">${item.color ? `<span class="jt-dot" style="background:${item.color};margin-right:6px;"></span>` : ""}${escapeHtml(item.title)}</div>
                <div class="jt-search-result-sub">${escapeHtml(item.sub || "")}</div>
              </div>`
            )
            .join("")}
        </div>`
    )
    .join("");

  wrap.querySelectorAll(".jt-search-result").forEach((el) => {
    const group = groups.find((g) => g.title === el.dataset.group);
    const item = group.items[Number(el.dataset.i)];
    el.addEventListener("click", item.onClick);
  });
}

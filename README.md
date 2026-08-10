# Japanese Tracker 時

A free, unlimited, offline-first time tracker for your Japanese learning journey — inspired by Toggl's tracking workflow and Refold's long-term-journey philosophy.

No ads. No subscriptions. No accounts. No time limits. Everything lives in your browser's local storage, on your machine only.

Every icon and logo (toolbar icon, sidebar mark, popup mark) is the kanji **時** ("time/hour") on a plain gradient background — no ring, no extra ornamentation — and it automatically re-colors to match whichever theme is selected in Settings, including the actual browser toolbar icon.

## Install (unpacked / developer mode)

1. Open `chrome://extensions` in Chrome (or any Chromium browser — Edge, Brave, etc.).
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this folder (the one containing `manifest.json`).
4. Pin the extension for one-click access to the popup.

## What's inside

- **Popup** — resume a project+tag combo used in the last 24 hours in one click (older ones roll off automatically), start a timer, add tags. While running: **Stop & save** or **✕ cancel** to discard (no pause/resume — just start, stop, or throw it away). Turn on Simple mode (Settings) to shrink Resume down to a bare ▶.
- **Dashboard** — stats, streak, a sortable (By time / A–Z) time-by-project breakdown with an inline range picker, and a GitHub-style study calendar heatmap.
- **Timer** — the full-size live timer (same Stop & Save / Cancel model as the popup), plus "Log a past session" for backfilling time.
- **Projects** — create/rename/recolor/reorder/archive/delete, multi-period goals with progress bars, and a **Sessions** button per project to view/edit/delete that project's logged time.
- **Reports** — Day/Week/Month/Year/All-time breakdowns, pie charts (project & tag, with the total centered in the ring and percentages on hover), a real period-over-period trend line, the heatmap, and an editable/sortable session timeline (Newest / Oldest / By project). Sessions can be edited or deleted right here too.
- **Notebook** — milestones, notes, goals, reflections, and study logs with checkboxes. Can be hidden from the sidebar entirely in Settings.
- **Search** — one box across projects, tags, notebook entries, goals, and sessions.
- **Settings** — 6 themes (Navy, Sumi ink, Sakura, Washi paper, Matcha, Indigo) with full per-color fine-tuning; a custom logo/icon (theme-matched, a solid color of your choice, or your own uploaded image — updates the toolbar icon too); layout options (sidebar left/right, comfortable/compact density, and **Simple mode**, which strips titles/descriptions/labels everywhere while keeping every feature, date, and stat intact); which dashboard widgets and whether Notebook show up; week start day and a minimum-session-length threshold; tag rename/delete; JSON backup export **and** a Replace-or-Merge choice on import; CSV export (Toggl/Clockify-compatible) and Toggl CSV import.
- **Right-click menu** — "Start Japanese Tracker timer" (resumes your last project) and "Start timer with project…" on any page.
- **Keyboard shortcut** — `Alt+Shift+J` stops & saves a running timer, or starts the last-used project if none is running.

## Importing from Toggl

Settings → Backup & export → **Import from Toggl CSV**:

1. In Toggl: **Reports → Detailed → Export → CSV** (paid plans), or on the free plan, **Settings → Data Export → Time Entries** (exported one year at a time).
2. Pick the file — you get a preview (session count, total time, date range, which projects/tags are new vs. matched) before anything is written. This import is always additive/merge-style: nothing existing is overwritten.

The same importer reads Clockify-style exports and anything with similar "Project / Start date / Start time / Duration (or End date+time) / Tags" columns.

**Exporting to Toggl/Clockify:** Settings → **Export as CSV** produces the same column layout, so it can be re-imported into Toggl, Clockify, or here again.

## Backup: Replace vs. Merge

Settings → **Import backup** (the app's own `.json` format) now asks which you want:
- **Merge** — combines the backup into what's already on this device (matches projects/tags by name, skips duplicate sessions/notebook entries). Nothing existing is deleted.
- **Replace** — completely replaces your current data with the backup's contents. Asks for confirmation first since it can't be undone.

## Data & backup

Everything is stored with `chrome.storage.local` — nothing leaves your device, and there's no server or API key involved.

## Folder structure

```
manifest.json          Manifest V3 config
background.js          Service worker: context menu, keyboard command, themed toolbar icon
icons/                 Static baseline 時 icon at 16/32/48/128px (navy theme; re-themed live at runtime)
shared/                 Storage schema + CRUD, time/date helpers, chart renderers, tooltip/UI helpers,
                        CSV import/export, session-edit modal, layout + icon rendering
popup/                  Toolbar popup (quick start/stop/cancel, recent list)
app/                    Full-page app (dashboard, timer, projects, reports, notebook, search, settings)
  app.html / app.css / app.js   Shell, sidebar, router
  pages/                One module per page
```

No build step — it's plain ES modules, so you can edit any file and just reload the extension.

## A note on a future GitHub Pages / website version

Everything above talks to `chrome.storage.local` directly, which only exists inside an extension. If this ever becomes a plain website (e.g. hosted free on GitHub Pages), the one real piece of work is swapping that for a small storage adapter (same `get`/`set` interface, backed by `localStorage`/IndexedDB instead) — the page code itself is already just static ES modules with no build step. A website tab and the installed extension would be separate storage sandboxes with no automatic sync between them; the JSON backup export/import is the bridge for moving data between the two. Not built yet — just designed with the door left open.

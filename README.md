# Japanese Tracker 時

A free, unlimited, offline-first time tracker for your Japanese learning journey — inspired by Toggl's tracking workflow and Refold's long-term learning philosophy.

**No ads. No subscriptions. No accounts. No time limits.**

Everything is stored locally in your browser using `chrome.storage.local`. Your data stays on your device unless you choose to export it.

The app's icon and logo use the kanji **時** ("time/hour") with a simple gradient design and automatically adapt to the selected theme.

## Features

- **Popup** — Quickly start a timer, resume a recent project + tag combination, add tags, or cancel/stop a timer.
- **Dashboard** — View study time, streaks, project totals, date ranges, and a GitHub-style study calendar.
- **Timer** — Full-size live timer with Stop & Save, Cancel, and the ability to log past sessions.
- **Projects** — Create, rename, recolor, reorder, archive, and delete projects. Add goals and view/edit sessions for each project.
- **Reports** — Day, Week, Month, Year, and All Time views with project/tag pie charts, trend graphs, heatmaps, and session timelines.
- **Notebook** — Personal space for milestones, notes, goals, reflections, and study logs.
- **Search** — Search projects, tags, Notebook entries, goals, and sessions.
- **Settings** — Themes, custom colors, custom icons, sidebar/layout options, Simple Mode, dashboard customization, week-start settings, session-length thresholds, and backup tools.
- **Tags** — Add multiple tags to sessions and use them for filtering and reports.
- **Right-click menu** — Start a timer or start one with a specific project from any page.
- **Keyboard shortcut** — `Alt+Shift+J` starts the last-used project or stops and saves the current timer.

## Themes & Customization

Includes six built-in themes:

- Navy
- Sumi Ink
- Sakura
- Washi Paper
- Matcha
- Indigo

You can also customize colors, sidebar position, density, font size, Simple Mode, dashboard widgets, and the extension icon.

## Import & Export

### JSON Backup

Japanese Tracker supports full JSON backups containing your:

- Sessions
- Projects
- Tags
- Goals
- Notebook entries
- Settings
- Customization

When importing a backup, choose:

- **Merge** — Combines the backup with existing data while avoiding duplicates.
- **Replace** — Replaces the current data after confirmation.

### CSV

Export your tracked time as CSV for use with other time-tracking tools and spreadsheets.

You can also import compatible Toggl and Clockify CSV exports. The importer provides a preview before adding anything.

## Importing from Toggl

Go to:

**Settings → Backup & Export → Import from Toggl CSV**

The importer previews the data before importing, including:

- Number of sessions
- Total time
- Date range
- New and existing projects
- New and existing tags

Toggl CSV imports are additive, so existing data is not overwritten.

## Data & Privacy

Everything is stored locally using:

`chrome.storage.local`

Japanese Tracker does not require:

- An account
- A server
- An API key
- Cloud storage
- An internet connection for normal tracking

Your data stays on your device unless you choose to export it.

**Important:** Because data is stored locally, use the JSON backup feature if you want protection against browser/profile loss or device failure.

## Installation

### Chrome / Chromium / Brave / Edge

1. Download or clone this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the folder containing `manifest.json`.
6. Pin Japanese Tracker for quick access.

## Folder Structure

```text
manifest.json
background.js
icons/
shared/
popup/
app/
  app.html
  app.css
  app.js
  pages/

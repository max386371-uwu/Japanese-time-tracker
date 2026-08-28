# Japanese Tracker 時

A free, unlimited, offline-first time tracker for your Japanese learning journey.

**No ads. No subscriptions. No accounts. No time limits.**

Everything is stored locally in your browser using `chrome.storage.local`. Your data stays on your device unless you choose to export it.

The app's icon and logo use the kanji **時** ("time/hour") with a simple gradient design that automatically adapts to the selected theme.

## Screenshots

< <img width="446" height="630" alt="fcv0hFoPeM" src="https://github.com/user-attachments/assets/bfc9042f-384f-4f81-8ea5-cd775d70612d" />

/>

<img width="1366" height="610" alt="Japanese Tracker screenshot" src="https://github.com/user-attachments/assets/08c80e8f-d9f3-486e-9df2-0cf4fb689676" />

<img <img width="1366" height="610" alt="brave_txkvq5orPQ" src="https://github.com/user-attachments/assets/8c3a12d3-6d8f-4d6f-b4c9-91bc1f24f024" />
 />

<img width="1366" height="610" alt="Japanese Tracker screenshot" src="https://github.com/user-attachments/assets/2aaa2254-9813-43d0-8630-5003aec7815d" />

<img width="1366" height="610" alt="Japanese Tracker screenshot" src="https://github.com/user-attachments/assets/d0d8fc63-65f5-4624-82d8-043cba7ba359" />

## Features

- **Popup** — Quickly start a timer, resume a recent project + tag combination, add tags, or stop/cancel a timer.
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

You can also customize colors, sidebar position, density, font size, Simple Mode, dashboard widgets, and the extension icon, etc.

## Import & Export

### JSON Backup

Japanese Tracker supports full JSON backups containing:

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

### Importing from Toggl

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

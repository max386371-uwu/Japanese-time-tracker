# Japanese Tracker 時

A free, unlimited, offline-first time tracker for your Japanese learning journey.

**No ads. No subscriptions. No accounts. No servers.** Your data stays on your device in your browser's local storage.

**Looking for the all-languages version?** Visit [Language Tracker](https://github.com/max386371-uwu/Language-Tracker).

## Features

- **Quick Timer:** Start, stop, cancel, or resume recent project-and-tag combinations.
- **Dashboard:** Study statistics, project/tag pie charts, yearly study calendar, consistency chart, and editable session history—all on one customizable page.
- **Projects & Tags:** Organize study sessions, set goals, track progress, and manage projects and tags.
- **Japanese Search:** Search using hiragana, katakana, and romaji, including common spelling variations.
- **Notebook:** Track milestones, notes, goals, reflections, and study logs.
- **Global Search:** Search projects, tags, notebook entries, goals, and sessions.
- **Customization:** Six themes, custom colors and logos, layout controls, Simple Mode, and dashboard widget reordering.
- **Quick Access:** Customizable keyboard shortcut (`Alt+Shift+J`) and right-click menu.
- **Import & Export:** JSON backups and CSV support for Toggl, Clockify, and spreadsheets.

## Dashboard

Dashboard and Reports are combined into one page with Day, Week, Month, Year, and All Time filters. Customize widget visibility and ordering in **Settings → Edit dashboard**. Browse yearly study activity, compare project and tag totals, and edit or delete sessions.

## Japanese Search

Search matches hiragana and katakana interchangeably and supports romaji and common spelling variations. For kanji, include the reading in the name—for example, `日本語 にほんご` can be found with `nihongo`.

## Themes

Choose from six built-in themes: **Navy, Sumi Ink, Sakura, Washi Paper, Matcha, and Indigo.** Customize colors, icons, sidebar layout, density, and other settings.

## Import & Export

**JSON backups:** Export your sessions, projects, tags, goals, notebook entries, settings, and customization.

- **Merge:** Combine backup data with existing data while avoiding duplicates.
- **Replace:** Replace current data after confirmation.

**CSV:** Export tracked time and import compatible Toggl or Clockify files. Imports show a preview and add sessions without overwriting existing ones.

## Data Limits & Reliability

Designed for large study histories, with limits of:

- 5,000 projects
- 2,000 tags
- 5,000 notebook items per type
- 100 tags per session
- 100 goals per project
- 200 characters per project name, tag name, and notebook title
- 20,000 characters per note

Data limits are centralized, and coordinated writes help prevent conflicting changes. Import and restore operations are designed to preserve data rather than silently truncate it.

## Privacy

Everything is stored locally using `chrome.storage.local`. No account, server, API key, or cloud storage is required, and normal tracking works offline. **Back up your data regularly** to protect against browser-profile loss or device failure.

## Installation

Works with Chrome and Chromium-based browsers, including Brave and Edge.

1. Download or clone this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the folder containing `manifest.json`.
5. Pin the extension for quick access.

## Project Structure

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
```

The extension uses plain JavaScript ES modules with **no build step**.

## What's Changed

- Combined Dashboard and Reports into one customizable page.
- Improved charts, yearly navigation, and Japanese search.
- Added searchable popup tags and custom logos/icons.
- Increased data limits and improved data safety.
- Expanded search and improved session and Notebook management.

**Japanese Tracker 時 is free, private, and built for long-term Japanese learning.**

# Japanese Tracker 時

A free, unlimited, offline-first, time tracker for Japanese. 

**No ads. No subscriptions. No accounts. No servers.** Your data stays on your device in your browser's local storage.

## Download 

**[Download the Latest Release here](https://github.com/max386371-uwu/Japanese-time-tracker/releases/tag/v2.0)**


Studying multiple languages? Check out **[Language Tracker](https://github.com/max386371-uwu/Language-Tracker)**, the all-languages version. (a bit outdated though)

## Screenshots
<img width="1892" height="912" alt="NQbQSrF3rl" src="https://github.com/user-attachments/assets/5e4f7e16-218d-4451-b543-1b8aec9ebeb6" />
<img width="1892" height="913" alt="IdJdtNiRRP" src="https://github.com/user-attachments/assets/14090133-7411-40e4-be01-b79ed65984c3" />

<p align="center">
  <img width="49%" src="https://github.com/user-attachments/assets/5264f7bc-fd63-4236-a605-dec324e962e0" alt="Screenshot 1" />
  <img width="49%" src="https://github.com/user-attachments/assets/9233e7a0-66a3-47b9-946a-20f3dc66af93" alt="Screenshot 2" />
</p>
<img width="1885" height="908" alt="FgcwS5DxLS" src="https://github.com/user-attachments/assets/dbcf0871-b752-4808-88a9-5707cd768291" />
<img width="1895" height="909" alt="brave_F1MxUoftvh" src="https://github.com/user-attachments/assets/ca072c8a-71c2-4e09-9d35-9a79dfe59d3b" />
<img width="1920" height="914" alt="brave_Dm9N6G7I7b" src="https://github.com/user-attachments/assets/4af30db4-cbef-4674-90a4-4f810bbeb2c8" />
<img width="1881" height="908" alt="blLi58nvNi" src="https://github.com/user-attachments/assets/4189b69f-23df-4b0f-9226-639540ddda79" />


## Features

- **Quick Timer/Extension popup:** Start, stop, cancel, or resume recent project-and-tag combinations.
  
- **Dashboard:** Study statistics, project/tag pie charts, yearly study calendar, consistency chart, and editable session history—all on one customizable page.
  
- **Projects & Tags:** Organize study sessions, set goals, track progress, and manage projects and tags.
  
- **Notebook:** Track milestones, notes, goals, reflections, and study logs.
  
- **Global Search:** Search projects, tags, notebook entries, goals, and sessions.
  
- **Customization:** Six themes, custom colors and logos, layout controls, Simple Mode, and dashboard widget reordering, and many, many more settings.
  
- **Quick Access:** Customizable keyboard shortcut (`Alt+Shift+J`) and right-click menu.
  
- **Import & Export:** JSON backups and CSV support for Toggl, Clockify, and spreadsheets.
  

## Dashboard

Dashboard and Reports are combined into one page with Day, Week, Month, Year, and All Time filters. Customize widget visibility and ordering in **Settings → Edit dashboard**. Browse yearly study activity, compare project and tag totals, and edit or delete sessions.

## Japanese Search

Search matches hiragana and katakana interchangeably and supports romaji and common spelling variations. For kanji, include the reading in the name—for example, `日本語 にほんご` can be found with `nihongo`.


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


**Japanese Tracker 時 was built with the help of Cluade Ai, and is free, private, and built for long-term Japanese learning.**

# Forest Genetics Lab - Project-Calendar

A GitHub Pages-friendly calendar for forest genetics lab project managment. Drop **JSON**, **YAML**, and **ICS** files into the appropriate `folder/` and a GitHub Action will merge them into:
- `public/events.json` (used by the website)
- `public/calendar.ics` (subscribable by Google/Apple/Outlook)

The site at `index.html` renders an interactive calendar via FullCalendar.

---
### How to use
1. Created a repo named **Project-Calendar** on GitHub.
2. Add/edit YAML or JSON files in the `tasks/` folder.
3. The workflow will rebuild the public calendar automatically.

To test locally:
```bash
npm install
npm run build
```
Then open `index.html`.

## Quick Start
4. Visit our GitHub Pages URL to see the calendar.
https://forestgeneticslab.github.io/Project-Calendar/

> Admins can **edit**, **add**, or **remove** tasks by modifying files in the `tasks/` folder. Every push rebuilds the merged calendar.

---

## Add tasks (drop-in formats)

### 1) YAML (`.yml` / `.yaml`)
```yaml
- title: DNA Extraction
  start: 2025-11-01T09:00:00
  end:   2025-11-01T09:15:00
  description: Task
  location: NR213
```

### 2) JSON (`.json`)
Array or single object:
```json
[
  {
    "title": "DNA Extraction",
    "start": "2025-11-15T13:00:00",
    "end":   "2025-11-15T14:00:00",
    "description": "Latest build"
  }
]
```

### 3) ICS (`.ics`)
Any valid VEVENTs are parsed and merged.

**Required fields:** `title` and `start` (except ICS which supplies `SUMMARY`/`DTSTART`).  
**All-day events:** use `YYYY-MM-DD` for `start` (and omit `end`).

---

## Security & Roles

- This is a static site; **admins edit tasks via GitHub** (web editor/PRs) or **GitHub desktop**.  
- Use **branch protection** and optional **CODEOWNERS** to control who can change the schedule.  
- No secrets are required; the workflow only reads repo files.

---

## File layout

```
Project-Calendar/
├─ index.html
├─ public/
│  ├─ events.json        # built
│  └─ calendar.ics       # built
├─ tasks/                # drop your files here
│  ├─ example.yml
│  ├─ example.json
│  └─ example.ics
├─ scripts/
│  └─ build.mjs
├─ .github/
│  └─ workflows/
│     └─ build-calendar.yml
├─ package.json
└─ README.md
```

---

## License

MIT

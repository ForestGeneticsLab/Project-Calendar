# Project-Calendar

A GitHub Pages-friendly calendar for forest genetics lab project managment. Drop **JSON**, **YAML**, or **ICS** files into `tasks/` and a GitHub Action will merge them into:
- `public/events.json` (used by the website)
- `public/calendar.ics` (subscribable by Google/Apple/Outlook)

The site at `index.html` renders an interactive calendar via FullCalendar.

---

## Quick Start

1. **Creates a repo named `Project-Calendar`** on GitHub and enable **Pages** (Settings → Pages → Source: Deploy from a branch).  
2. Download and unzip this folder, then push its contents to your repo's default branch (e.g. `main`).  
3. On your next push, the **Build calendar** workflow will produce `public/events.json` and `public/calendar.ics`.  
4. Visit your GitHub Pages URL to see the calendar.

> Admins can **edit**, **add**, or **remove** tasks by modifying files in the `tasks/` folder. Every push rebuilds the merged calendar.

---

## Add tasks (drop-in formats)

### 1) YAML (`.yml` / `.yaml`)
```yaml
- title: Team Standup
  start: 2025-11-01T09:00:00
  end:   2025-11-01T09:15:00
  description: Daily standup
  location: Zoom
```

### 2) JSON (`.json`)
Array or single object:
```json
[
  {
    "title": "Client Demo",
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

## Local build (optional)

```bash
npm install
npm run build
# Outputs: public/events.json and public/calendar.ics
```

---

## Recurring events?

ICS recurrences are not expanded. For repeating events, either:
- Add individual rules in YAML/JSON, or
- Pre-generate an ICS with expanded dates.

---

## Security & Roles

- This is a static site; **admins edit tasks via GitHub** (web editor/PRs).  
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

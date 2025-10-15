// scripts/build.mjs
// Merge tasks/* (.json, .yml/.yaml, .ics) into public/events.json and public/calendar.ics
// Usage: node scripts/build.mjs

import fs from "fs";
import path from "path";
import YAML from "yaml";
import { createEvents } from "ics";
import * as ical from "node-ical";

// Allow overrides via env if you want (optional)
const ROOT = path.resolve(process.cwd());
const TASKS_DIR = process.env.TASKS_DIR
  ? path.resolve(process.env.TASKS_DIR)
  : path.join(ROOT, "tasks");
const PUBLIC_DIR = process.env.PUBLIC_DIR
  ? path.resolve(process.env.PUBLIC_DIR)
  : path.join(ROOT, "public");

fs.mkdirSync(PUBLIC_DIR, { recursive: true });

/** Quick validators */
const isIsoOrDate = (v) =>
  typeof v === "string" &&
  (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v) || /^\d{4}-\d{2}-\d{2}$/.test(v));

/** Normalize an event object into FullCalendar-friendly shape */
function normalizeEvent(e, origin = "unknown") {
  if (!e || typeof e !== "object") return null;

  const title = e.title ?? e.summary ?? e.name;
  const start = e.start ?? e.dtstart;

  if (!title || !start) {
    console.warn(
      `Skipping event missing title/start (from ${origin}):`,
      JSON.stringify(e)
    );
    return null;
  }

  // Coerce to strings
  const out = {
    title: String(title).trim(),
    start: String(start).trim(),
  };

  // Optional fields
  if (e.end ?? e.dtend) out.end = String(e.end ?? e.dtend).trim();
  if (e.description) out.description = String(e.description);
  if (e.location) out.location = String(e.location);
  if (e.url) out.url = String(e.url);
  if (typeof e.allDay !== "undefined") out.allDay = !!e.allDay;

  // Validate date-ish strings (do not block build if malformed; just warn)
  if (!isIsoOrDate(out.start)) {
    console.warn(
      `Warning: start is not ISO or YYYY-MM-DD (${origin}): "${out.start}"`
    );
  }
  if (out.end && !isIsoOrDate(out.end)) {
    console.warn(
      `Warning: end is not ISO or YYYY-MM-DD (${origin}): "${out.end}"`
    );
  }
  return out;
}

function fromIcsEvent(evt) {
  const toIso = (d) => {
    if (!d) return undefined;
    // node-ical may return JS Date or a Luxon DateTime-like
    const jsDate = d instanceof Date ? d : d.toJSDate?.() ?? new Date(d);
    if (Number.isNaN(jsDate.getTime())) return undefined;
    // Keep timezone as Z if it is UTC; otherwise serialize to local ISO
    return jsDate.toISOString().replace(".000Z", "Z");
  };

  return normalizeEvent(
    {
      title: evt.summary || "Untitled",
      start: toIso(evt.start),
      end: toIso(evt.end),
      description: evt.description || "",
      location: evt.location || "",
      url: evt.url || "",
    },
    "ics"
  );
}

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (err) {
    console.error(`Failed to read ${filePath}: ${err.message}`);
    return null;
  }
}

async function loadAll() {
  if (!fs.existsSync(TASKS_DIR)) {
    console.warn(`No tasks directory found at ${TASKS_DIR}. Creating it.`);
    fs.mkdirSync(TASKS_DIR, { recursive: true });
  }

  const files = fs
    .readdirSync(TASKS_DIR, { withFileTypes: true })
    .filter((f) => f.isFile())
    .map((f) => f.name)
    .filter((name) => !name.startsWith(".")); // ignore dotfiles

  const events = [];

  for (const file of files) {
    const full = path.join(TASKS_DIR, file);
    const ext = path.extname(file).toLowerCase();

    try {
      if (ext === ".json") {
        const txt = safeRead(full);
        if (!txt) continue;
        const parsed = JSON.parse(txt);
        if (Array.isArray(parsed)) {
          parsed
            .map((e) => normalizeEvent(e, file))
            .filter(Boolean)
            .forEach((e) => events.push(e));
        } else {
          const e = normalizeEvent(parsed, file);
          if (e) events.push(e);
        }
      } else if (ext === ".yml" || ext === ".yaml") {
        const txt = safeRead(full);
        if (!txt) continue;
        const parsed = YAML.parse(txt);
        if (Array.isArray(parsed)) {
          parsed
            .map((e) => normalizeEvent(e, file))
            .filter(Boolean)
            .forEach((e) => events.push(e));
        } else {
          const e = normalizeEvent(parsed, file);
          if (e) events.push(e);
        }
      } else if (ext === ".ics") {
        const data = await ical.async.parseFile(full);
        for (const k of Object.keys(data)) {
          const item = data[k];
          if (item?.type === "VEVENT") {
            const e = fromIcsEvent(item);
            if (e) events.push(e);
          }
        }
      } else {
        console.log(`Skipping unsupported file: ${file}`);
      }
    } catch (err) {
      console.error(`Failed to parse ${file}: ${err.message}`);
    }
  }

  // Deduplicate by (title + start + end)
  const seen = new Set();
  const deduped = [];
  for (const e of events) {
    const key = [e.title, e.start, e.end || ""].join("|");
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(e);
    }
  }

  // Sort by start date ascending (invalid/missing dates sink to end)
  deduped.sort((a, b) => {
    const ta = Date.parse(a.start) || Infinity;
    const tb = Date.parse(b.start) || Infinity;
    return ta - tb;
  });

  console.log(
    `Loaded ${events.length} events from ${files.length} file(s); ${deduped.length} after dedupe.`
  );
  return deduped;
}

function toIcs(events) {
  // Convert normalized events to ICS
  const toParts = (dstr, allDay = false) => {
    const d = new Date(dstr);
    if (Number.isNaN(d.getTime())) {
      throw new Error(`Bad date: ${dstr}`);
    }
    if (allDay) {
      return [d.getFullYear(), d.getMonth() + 1, d.getDate()];
    }
    return [
      d.getFullYear(),
      d.getMonth() + 1,
      d.getDate(),
      d.getHours(),
      d.getMinutes(),
    ];
  };

  const items = events.map((e) => {
    const allDay = e.allDay === true || (e.start.length === 10 && !e.end);
    const base = {
      title: e.title,
      description: e.description || "",
      location: e.location || "",
      url: e.url || "",
    };
    if (allDay) {
      base.start = toParts(e.start, true);
    } else {
      base.start = toParts(e.start, false);
      if (e.end) base.end = toParts(e.end, false);
    }
    return base;
  });

  const { error, value } = createEvents(items);
  if (error) throw error;
  return value;
}

(async function main() {
  try {
    const events = await loadAll();

    // Always write events.json so the site stays up-to-date
    const jsonPath = path.join(PUBLIC_DIR, "events.json");
    fs.writeFileSync(jsonPath, JSON.stringify(events, null, 2));
    console.log(`Wrote ${events.length} event(s) → ${path.relative(ROOT, jsonPath)}`);

    // Try to write calendar.ics, but don't fail the job if it breaks
    try {
      const icsContent = toIcs(events);
      const icsPath = path.join(PUBLIC_DIR, "calendar.ics");
      fs.writeFileSync(icsPath, icsContent);
      console.log(`Wrote ICS feed → ${path.relative(ROOT, icsPath)}`);
    } catch (err) {
      console.error("ICS build failed (continuing without ICS):", err.message);
    }

    console.log("Build completed.");
  } catch (err) {
    console.error("Build failed:", err);
    process.exit(1);
  }
})();

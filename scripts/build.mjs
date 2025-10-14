// Merge tasks/* (.json, .yml/.yaml, .ics) into public/events.json and public/calendar.ics
// Usage: node scripts/build.mjs
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { createEvents } from 'ics';
import * as ical from 'node-ical';

const root = path.resolve(process.cwd());
const tasksDir = path.join(root, 'tasks');
const publicDir = path.join(root, 'public');
fs.mkdirSync(publicDir, { recursive: true });

/** Normalize an event object into FullCalendar-friendly shape */
function normalizeEvent(e) {
  // Allowed fields: title, start, end, description, location, url, allDay
  if (!e || !e.title || !e.start) return null;
  const out = {
    title: String(e.title),
    start: String(e.start),
  };
  if (e.end) out.end = String(e.end);
  if (e.description) out.description = String(e.description);
  if (e.location) out.location = String(e.location);
  if (e.url) out.url = String(e.url);
  if (typeof e.allDay !== 'undefined') out.allDay = !!e.allDay;
  return out;
}

function fromIcsEvent(evt) {
  // node-ical vevent shape; convert to our shape
  const toIso = (d) => {
    if (!d) return undefined;
    // d may be JS Date or moment-ish
    const dt = d instanceof Date ? d : d.toJSDate?.() ?? new Date(d);
    // All-day detection is tricky; keep as full ISO
    return dt.toISOString().replace('.000Z', 'Z');
  };
  const out = {
    title: evt.summary || 'Untitled',
    start: toIso(evt.start),
    end: toIso(evt.end),
    description: evt.description || '',
    location: evt.location || '',
    url: evt.url || ''
  };
  return normalizeEvent(out);
}

async function loadAll() {
  const files = fs.readdirSync(tasksDir, { withFileTypes: true })
    .filter(f => f.isFile())
    .map(f => f.name);

  const events = [];

  for (const file of files) {
    const full = path.join(tasksDir, file);
    const ext = path.extname(file).toLowerCase();
    try {
      if (ext === '.json') {
        const parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
        if (Array.isArray(parsed)) {
          parsed.map(normalizeEvent).filter(Boolean).forEach(e => events.push(e));
        } else {
          const e = normalizeEvent(parsed);
          if (e) events.push(e);
        }
      } else if (ext === '.yml' || ext === '.yaml') {
        const parsed = YAML.parse(fs.readFileSync(full, 'utf8'));
        if (Array.isArray(parsed)) {
          parsed.map(normalizeEvent).filter(Boolean).forEach(e => events.push(e));
        } else {
          const e = normalizeEvent(parsed);
          if (e) events.push(e);
        }
      } else if (ext === '.ics') {
        const data = await ical.async.parseFile(full);
        for (const k of Object.keys(data)) {
          const item = data[k];
          if (item.type === 'VEVENT') {
            const e = fromIcsEvent(item);
            if (e) events.push(e);
          }
        }
      } else {
        // ignore other extensions
      }
    } catch (err) {
      console.error(`Failed to parse ${file}:`, err.message);
    }
  }

  // Sort by start date ascending
  events.sort((a, b) => new Date(a.start) - new Date(b.start));

  return events;
}

function toIcs(events) {
  // Convert normalized events to ICS
  const toParts = (dstr, allDay=false) => {
    const d = new Date(dstr);
    if (allDay) {
      return [d.getFullYear(), d.getMonth()+1, d.getDate()];
    }
    return [d.getFullYear(), d.getMonth()+1, d.getDate(), d.getHours(), d.getMinutes()];
  };

  const items = events.map(e => {
    const allDay = (e.allDay === true) || (e.start.length === 10 && !e.end);
    const base = {
      title: e.title,
      description: e.description || '',
      location: e.location || '',
      url: e.url || ''
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

const events = await loadAll();
fs.writeFileSync(path.join(publicDir, 'events.json'), JSON.stringify(events, null, 2));

const icsContent = toIcs(events);
fs.writeFileSync(path.join(publicDir, 'calendar.ics'), icsContent);

console.log(`Wrote ${events.length} event(s) to public/events.json and public/calendar.ics`);

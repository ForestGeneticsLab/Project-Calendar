import fs from "fs";
import path from "path";
import YAML from "yaml";
import { createEvents } from "ics";

const ROOT = path.resolve(process.cwd());
const TASKS_DIR = path.join(ROOT, "tasks");
const PUBLIC_DIR = path.join(ROOT, "public");
fs.mkdirSync(PUBLIC_DIR, { recursive: true });

function normalize(e) {
  if (!e.title || !e.start) return null;
  return {
    title: e.title,
    start: e.start,
    end: e.end,
    description: e.description || "",
    location: e.location || "",
    color: e.color || null
  };
}

function loadEvents() {
  const files = fs.readdirSync(TASKS_DIR).filter(f => /\.(yml|yaml|json)$/.test(f));
  const events = [];
  for (const f of files) {
    const text = fs.readFileSync(path.join(TASKS_DIR, f), "utf8");
    const parsed = f.endsWith(".json") ? JSON.parse(text) : YAML.parse(text);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    for (const ev of arr) {
      const norm = normalize(ev);
      if (norm) events.push(norm);
    }
  }
  return events.sort((a,b)=>new Date(a.start)-new Date(b.start));
}

function toICS(events) {
  const { value } = createEvents(events.map(e => ({
    title: e.title,
    description: e.description,
    location: e.location,
    start: e.start.split(/[-T:]/).map(Number).slice(0,5),
    end: e.end ? e.end.split(/[-T:]/).map(Number).slice(0,5) : undefined
  })));
  return value;
}

const events = loadEvents();
fs.writeFileSync(path.join(PUBLIC_DIR, "events.json"), JSON.stringify(events, null, 2));
fs.writeFileSync(path.join(PUBLIC_DIR, "calendar.ics"), toICS(events));
console.log("Built", events.length, "events");

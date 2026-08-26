import { readFile, writeFile } from "node:fs/promises";

const apiKey = process.env.TODOIST_API_KEY;

if (!apiKey) {
  throw new Error("TODOIST_API_KEY is not configured.");
}

const response = await fetch("https://api.todoist.com/api/v1/tasks/completed/stats", {
  headers: {
    Authorization: `Bearer ${apiKey}`,
  },
});

if (!response.ok) {
  throw new Error(`Todoist API returned ${response.status} ${response.statusText}.`);
}

const stats = await response.json();

function requireNumber(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Todoist response is missing a valid ${field}.`);
  }

  return value;
}

const karma = requireNumber(stats.karma, "karma value");
const completed = requireNumber(stats.completed_count, "completed task count");
const completedToday = requireNumber(
  stats.days_items?.[0]?.total_completed,
  "completed task count for today",
);
const longestStreak = requireNumber(
  stats.goals?.max_daily_streak?.count,
  "longest daily streak",
);

const number = new Intl.NumberFormat("en-US");
const activity = [
  `🏆 **${number.format(karma)}** karma points`,
  `🌱 **${number.format(completedToday)}** tasks completed today`,
  `✅ **${number.format(completed)}** tasks completed overall`,
  `⏳ **${number.format(longestStreak)} days** longest streak`,
].join("  \n");

const startMarker = "<!-- TODO-IST:START -->";
const endMarker = "<!-- TODO-IST:END -->";
const readmePath = "README.md";
const readme = await readFile(readmePath, "utf8");
const start = readme.indexOf(startMarker);
const end = readme.indexOf(endMarker);

if (start === -1 || end === -1 || end <= start) {
  throw new Error("README.md does not contain a valid Todoist activity block.");
}

const updated = [
  readme.slice(0, start + startMarker.length),
  "\n",
  activity,
  "\n",
  readme.slice(end),
].join("");

await writeFile(readmePath, updated);

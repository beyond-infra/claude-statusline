#!/usr/bin/env npx --yes tsx

import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join, basename } from "path";

// ── Parse stdin ──────────────────────────────────────────
let input: Record<string, any> = {};
try {
  const raw = readFileSync("/dev/stdin", "utf-8").trim();
  if (raw) input = JSON.parse(raw);
} catch {}

// ── Working directory ────────────────────────────────────
const cwd     = input?.cwd || process.cwd();
const dirName = basename(cwd);

// ── Session duration ─────────────────────────────────────
function formatDuration(secs: number): string {
  if (secs >= 3600) return `${Math.floor(secs / 3600)}h${Math.floor((secs % 3600) / 60)}m`;
  if (secs >= 60)   return `${Math.floor(secs / 60)}m`;
  return `${secs}s`;
}

let elapsed = 0;
let durationStr = "";
const startTime: string = input?.session?.start_time ?? "";
if (startTime && startTime !== "null") {
  const startEpoch = Math.floor(new Date(startTime).getTime() / 1000);
  if (!isNaN(startEpoch)) {
    elapsed = Math.floor(Date.now() / 1000) - startEpoch;
    if (elapsed > 0) durationStr = ` · ${formatDuration(elapsed)}`;
  }
}

// ── Focus detection ──────────────────────────────────────
let focusedOnClaude = false;
try {
  const focused = execSync("aerospace list-windows --focused", { encoding: "utf-8" }).trim();
  // format: "<id> | <app> | <title>"
  const [, app, title] = focused.split(" | ");
  focusedOnClaude = app?.trim() === "Alacritty" && title?.includes("Claude");
} catch {}

// ── Notify ───────────────────────────────────────────────
const body = `${dirName}${durationStr}`;
const persistent = elapsed >= 60 || !focusedOnClaude;

if (persistent) {
  // Stays until dismissed
  try {
    execSync(`osascript -e 'display alert "Claude 任务完成" message "${body}"'`);
  } catch {}
} else {
  // Auto-dismissing banner
  try {
    execSync(`osascript -e 'display notification "${body}" with title "Claude 任务完成"'`);
  } catch {}
}

// ── Write session state for SwiftBar ─────────────────────
try {
  const stateFile = join(homedir(), ".claude", "session-state.json");
  writeFileSync(stateFile, JSON.stringify({
    status: "idle",
    project: dirName,
    completedAt: new Date().toISOString(),
    duration: durationStr.replace(" · ", ""),
    sessionStart: startTime || undefined,
  }, null, 2) + "\n");
} catch {}

// Terminal bell
process.stdout.write("\a");

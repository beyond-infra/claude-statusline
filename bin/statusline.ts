#!/usr/bin/env npx --yes tsx

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { basename } from "path";

// ── Colors ───────────────────────────────────────────────
const c = {
  blue:    "\x1b[38;2;0;153;255m",
  orange:  "\x1b[38;2;255;176;85m",
  green:   "\x1b[38;2;0;175;80m",
  cyan:    "\x1b[38;2;86;182;194m",
  red:     "\x1b[38;2;255;85;85m",
  yellow:  "\x1b[38;2;230;200;0m",
  white:   "\x1b[38;2;220;220;220m",
  magenta: "\x1b[38;2;180;140;255m",
  dim:     "\x1b[2m",
  rst:     "\x1b[0m",
};

const sep = ` ${c.dim}│${c.rst} `;

// ── Helpers ──────────────────────────────────────────────
function exec(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function ctxColor(pct: number): string {
  if (pct >= 90) return c.red;
  if (pct >= 70) return c.yellow;
  if (pct >= 50) return c.orange;
  return c.green;
}

function formatDuration(secs: number): string {
  if (secs >= 3600) return `${Math.floor(secs / 3600)}h${Math.floor((secs % 3600) / 60)}m`;
  if (secs >= 60)   return `${Math.floor(secs / 60)}m`;
  return `${secs}s`;
}

// ── Parse stdin ──────────────────────────────────────────
let input: Record<string, any> = {};
try {
  const raw = readFileSync("/dev/stdin", "utf-8").trim();
  if (raw) input = JSON.parse(raw);
} catch {}

if (!Object.keys(input).length) {
  process.stdout.write("Claude");
  process.exit(0);
}

// ── Context window ───────────────────────────────────────
const model   = input?.model?.display_name ?? "Claude";
const ctxSize = input?.context_window?.context_window_size || 200000;
const usage   = input?.context_window?.current_usage ?? {};
const tokens  = (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);
const pct     = Math.floor((tokens * 100) / ctxSize);

// ── Working directory & git ──────────────────────────────
const cwd     = input?.cwd || process.cwd();
const dirName = basename(cwd);

let gitInfo = "";
try {
  execSync(`git -C "${cwd}" rev-parse --is-inside-work-tree`, { stdio: "ignore" });
  const branch   = exec(`git -C "${cwd}" symbolic-ref --short HEAD`);
  const dirty    = exec(`git -C "${cwd}" --no-optional-locks status --porcelain`) ? "*" : "";
  gitInfo = branch ? ` ${c.green}(${branch}${c.red}${dirty}${c.green})${c.rst}` : "";
} catch {}

// ── Session duration ─────────────────────────────────────
let duration = "";
const startTime: string = input?.session?.start_time ?? "";
if (startTime && startTime !== "null") {
  const startEpoch = Math.floor(new Date(startTime).getTime() / 1000);
  if (!isNaN(startEpoch)) {
    const elapsed = Math.floor(Date.now() / 1000) - startEpoch;
    if (elapsed > 0) duration = formatDuration(elapsed);
  }
}

// ── Permissions mode ─────────────────────────────────────
const parentCmd = exec(`ps -o args= -p ${process.ppid}`);
const skipPerms = parentCmd.includes("--dangerously-skip-permissions") ? "⚡  " : "";

// ── Effort level ─────────────────────────────────────────
let effort = "default";
const settingsPath = `${homedir()}/.claude/settings.json`;
if (existsSync(settingsPath)) {
  try { effort = JSON.parse(readFileSync(settingsPath, "utf-8")).effortLevel ?? "default"; }
  catch {}
}

const effortSegment = (() => {
  switch (effort) {
    case "high":   return `${c.magenta}● ${effort}${c.rst}`;
    case "medium": return `${c.dim}◑ ${effort}${c.rst}`;
    case "low":    return `${c.dim}◔ ${effort}${c.rst}`;
    default:       return `${c.dim}◑ ${effort}${c.rst}`;
  }
})();

// ── Render ───────────────────────────────────────────────
const parts = [
  `${c.blue}${model}${c.rst}`,
  `✍️ ${ctxColor(pct)}${pct}%${c.rst}`,
  `${skipPerms}${c.cyan}${dirName}${c.rst}${gitInfo}`,
  ...(duration ? [`${c.dim}⏱ ${c.rst}${c.white}${duration}${c.rst}`] : []),
  effortSegment,
];

process.stdout.write(parts.join(sep));

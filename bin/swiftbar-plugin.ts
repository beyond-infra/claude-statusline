#!/usr/bin/env npx --yes tsx
// <swiftbar.title>Claude Status</swiftbar.title>
// <swiftbar.version>1.0.0</swiftbar.version>
// <swiftbar.author>beyond-infra</swiftbar.author>
// <swiftbar.desc>Shows Claude Code session status and last task completion</swiftbar.desc>
// <swiftbar.hideAbout>true</swiftbar.hideAbout>
// <swiftbar.hideRunInTerminal>true</swiftbar.hideRunInTerminal>
// <swiftbar.hideLastUpdated>true</swiftbar.hideLastUpdated>
// <swiftbar.hideDisablePlugin>false</swiftbar.hideDisablePlugin>
// <swiftbar.hideSwiftBar>true</swiftbar.hideSwiftBar>

import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const STATE_FILE = join(homedir(), ".claude", "session-state.json");

interface SessionState {
  status: "running" | "idle";
  project: string;
  completedAt?: string;   // ISO timestamp
  duration?: string;      // e.g. "2m30s"
  sessionStart?: string;  // ISO timestamp
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60)   return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h${Math.floor((secs % 3600) / 60)}m ago`;
}

let state: SessionState | null = null;
if (existsSync(STATE_FILE)) {
  try {
    state = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  } catch {}
}

if (!state) {
  // No state file — Claude hasn't run yet or plugin just installed
  console.log("✦ Claude");
  console.log("---");
  console.log("No session data yet");
  process.exit(0);
}

// ── Menu bar line ────────────────────────────────────────
if (state.status === "running") {
  const project = state.project ?? "…";
  console.log(`◉ ${project} | color=#00AAFF`);
} else {
  const project = state.project ?? "Claude";
  const ago = state.completedAt ? ` · ${timeAgo(state.completedAt)}` : "";
  console.log(`✦ ${project}${ago} | color=#888888`);
}

// ── Dropdown ─────────────────────────────────────────────
console.log("---");

if (state.status === "running") {
  console.log("🟡 Running... | color=#FFB800");
  if (state.sessionStart) {
    const elapsed = Math.floor((Date.now() - new Date(state.sessionStart).getTime()) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const elapsedStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    console.log(`Session elapsed: ${elapsedStr} | color=#AAAAAA`);
  }
} else {
  console.log("⚪ Idle | color=#888888");
  if (state.completedAt) {
    console.log(`Last task: ${timeAgo(state.completedAt)} | color=#AAAAAA`);
  }
  if (state.duration) {
    console.log(`Duration: ${state.duration} | color=#AAAAAA`);
  }
}

if (state.project) {
  console.log("---");
  console.log(`Project: ${state.project} | color=#AAAAAA`);
}

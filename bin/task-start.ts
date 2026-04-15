#!/usr/bin/env npx --yes tsx

import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join, basename } from "path";

// ── Parse stdin ──────────────────────────────────────────
let input: Record<string, any> = {};
try {
  const raw = readFileSync("/dev/stdin", "utf-8").trim();
  if (raw) input = JSON.parse(raw);
} catch {}

const cwd     = input?.cwd || process.cwd();
const project = basename(cwd);

// ── Write running state for SwiftBar ─────────────────────
try {
  const stateFile = join(homedir(), ".claude", "session-state.json");
  writeFileSync(stateFile, JSON.stringify({
    status: "running",
    project,
    sessionStart: new Date().toISOString(),
  }, null, 2) + "\n");
} catch {}

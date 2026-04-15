#!/usr/bin/env npx --yes tsx

import { execSync } from "child_process";
import { existsSync, mkdirSync, copyFileSync, unlinkSync, readFileSync, writeFileSync, symlinkSync, chmodSync } from "fs";
import { homedir } from "os";
import { join, resolve, dirname } from "path";

// ── Paths ────────────────────────────────────────────────
const CLAUDE_DIR     = join(homedir(), ".claude");
const SETTINGS_FILE  = join(CLAUDE_DIR, "settings.json");
const STATUSLINE_DST = join(CLAUDE_DIR, "statusline.ts");
const STATUSLINE_SRC = resolve(dirname(new URL(import.meta.url).pathname), "statusline.ts");
const STATUSLINE_BAK = STATUSLINE_DST + ".bak";
const NOTIFY_DST      = join(CLAUDE_DIR, "task-complete.ts");
const NOTIFY_SRC      = resolve(dirname(new URL(import.meta.url).pathname), "task-complete.ts");
const NOTIFY_BAK      = NOTIFY_DST + ".bak";
const SWIFTBAR_TS_DST = join(CLAUDE_DIR, "swiftbar-plugin.ts");
const SWIFTBAR_TS_SRC = resolve(dirname(new URL(import.meta.url).pathname), "swiftbar-plugin.ts");
const SWIFTBAR_SH_DST = join(CLAUDE_DIR, "swiftbar-plugin.sh");
const SWIFTBAR_SH_SRC = resolve(dirname(new URL(import.meta.url).pathname), "swiftbar-plugin.sh");
const SWIFTBAR_NAME   = "claude-status.5s.sh";

const STATUS_CMD = 'npx --yes tsx "$HOME/.claude/statusline.ts"';
const NOTIFY_CMD = 'npx --yes tsx "$HOME/.claude/task-complete.ts"';

// ── Colors ───────────────────────────────────────────────
const c = {
  blue:  "\x1b[38;2;0;153;255m",
  green: "\x1b[38;2;0;175;80m",
  red:   "\x1b[38;2;255;85;85m",
  yel:   "\x1b[38;2;230;200;0m",
  dim:   "\x1b[2m",
  rst:   "\x1b[0m",
};

const ok   = (msg: string) => console.log(`  ${c.green}✓${c.rst} ${msg}`);
const warn = (msg: string) => console.log(`  ${c.yel}!${c.rst} ${msg}`);
const fail = (msg: string) => console.error(`  ${c.red}✗${c.rst} ${msg}`);
const log  = (msg: string) => console.log(`  ${msg}`);

// ── Settings helpers ─────────────────────────────────────
function readSettings(): Record<string, unknown> {
  if (!existsSync(SETTINGS_FILE)) return {};
  try {
    return JSON.parse(readFileSync(SETTINGS_FILE, "utf-8"));
  } catch {
    fail(`Could not parse ${SETTINGS_FILE} — fix it manually`);
    process.exit(1);
  }
}

function writeSettings(settings: Record<string, unknown>): void {
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2) + "\n");
}

// ── Install ──────────────────────────────────────────────
function install(): void {
  console.log(`\n  ${c.blue}Claude Line Installer${c.rst}\n  ${c.dim}─────────────────────${c.rst}\n`);

  // Check deps
  try { execSync("which git", { stdio: "ignore" }); }
  catch {
    fail("Missing required dependency: git");
    log(`  ${c.dim}brew install git${c.rst}`);
    process.exit(1);
  }
  ok("Dependencies found (git)");

  // Ensure ~/.claude exists
  if (!existsSync(CLAUDE_DIR)) {
    mkdirSync(CLAUDE_DIR, { recursive: true });
    ok(`Created ${CLAUDE_DIR}`);
  }

  // Backup existing statusline
  if (existsSync(STATUSLINE_DST)) {
    copyFileSync(STATUSLINE_DST, STATUSLINE_BAK);
    warn(`Backed up existing statusline to ${c.dim}statusline.ts.bak${c.rst}`);
  }

  copyFileSync(STATUSLINE_SRC, STATUSLINE_DST);
  ok(`Installed statusline to ${c.dim}${STATUSLINE_DST}${c.rst}`);

  // Backup existing notify
  if (existsSync(NOTIFY_DST)) {
    copyFileSync(NOTIFY_DST, NOTIFY_BAK);
    warn(`Backed up existing notify to ${c.dim}task-complete.ts.bak${c.rst}`);
  }

  copyFileSync(NOTIFY_SRC, NOTIFY_DST);
  ok(`Installed notify to ${c.dim}${NOTIFY_DST}${c.rst}`);

  // Update settings.json
  const settings = readSettings();
  let changed = false;

  const alreadyStatus =
    (settings.statusLine as Record<string, unknown>)?.command === STATUS_CMD;
  if (!alreadyStatus) {
    settings.statusLine = { type: "command", command: STATUS_CMD };
    changed = true;
  }

  const hooks = (settings.hooks as Record<string, unknown[]>) ?? {};
  const stopHooks: Record<string, unknown>[] = (hooks.Stop as any) ?? [];
  const alreadyStop = stopHooks.some(
    (entry: any) => Array.isArray(entry.hooks) &&
      entry.hooks.some((h: any) => h.command === NOTIFY_CMD)
  );
  if (!alreadyStop) {
    hooks.Stop = [...stopHooks, { matcher: "", hooks: [{ type: "command", command: NOTIFY_CMD }] }];
    settings.hooks = hooks;
    changed = true;
  }

  if (changed) {
    writeSettings(settings);
    ok(`Updated ${c.dim}settings.json${c.rst} with statusLine and Stop hook`);
  } else {
    ok("Settings already configured");
  }

  // SwiftBar plugin (.ts logic + .sh launcher)
  copyFileSync(SWIFTBAR_TS_SRC, SWIFTBAR_TS_DST);
  copyFileSync(SWIFTBAR_SH_SRC, SWIFTBAR_SH_DST);
  chmodSync(SWIFTBAR_SH_DST, 0o755);
  ok(`Installed SwiftBar plugin to ${c.dim}${SWIFTBAR_SH_DST}${c.rst}`);

  const swiftbarPluginDir = detectSwiftBarPluginDir();
  if (swiftbarPluginDir) {
    const pluginLink = join(swiftbarPluginDir, SWIFTBAR_NAME);
    // Remove stale .ts symlink from previous install if present
    const oldLink = join(swiftbarPluginDir, "claude-status.5s.ts");
    if (existsSync(oldLink)) { unlinkSync(oldLink); }
    if (!existsSync(pluginLink)) {
      try {
        symlinkSync(SWIFTBAR_SH_DST, pluginLink);
        ok(`Linked SwiftBar plugin → ${c.dim}${pluginLink}${c.rst}`);
      } catch {
        warn(`Could not symlink to SwiftBar plugins dir — copy manually:\n    cp ${SWIFTBAR_SH_DST} ${pluginLink}`);
      }
    } else {
      ok("SwiftBar plugin already linked");
    }
    log(`  ${c.dim}Refresh SwiftBar or wait 5s for the menu bar item to appear.${c.rst}`);
  } else {
    warn("SwiftBar not detected — to enable the menu bar widget:");
    log(`  1. ${c.dim}brew install --cask swiftbar${c.rst}`);
    log(`  2. Open SwiftBar, set plugin dir, then run:`);
    log(`     ${c.dim}ln -s ${SWIFTBAR_SH_DST} <plugin-dir>/${SWIFTBAR_NAME}${c.rst}`);
  }

  log(`\n${c.green}Done!${c.rst} Restart Claude Code to see your new status line and notifications.\n`);
}

// ── Uninstall ────────────────────────────────────────────
function uninstall(): void {
  console.log(`\n  ${c.blue}Claude Line Uninstaller${c.rst}\n  ${c.dim}───────────────────────${c.rst}\n`);

  if (existsSync(STATUSLINE_BAK)) {
    copyFileSync(STATUSLINE_BAK, STATUSLINE_DST);
    unlinkSync(STATUSLINE_BAK);
    ok(`Restored previous statusline from ${c.dim}statusline.ts.bak${c.rst}`);
  } else if (existsSync(STATUSLINE_DST)) {
    unlinkSync(STATUSLINE_DST);
    ok(`Removed ${c.dim}statusline.ts${c.rst}`);
  } else {
    warn("No statusline found — nothing to remove");
  }

  if (existsSync(NOTIFY_BAK)) {
    copyFileSync(NOTIFY_BAK, NOTIFY_DST);
    unlinkSync(NOTIFY_BAK);
    ok(`Restored previous notify from ${c.dim}task-complete.ts.bak${c.rst}`);
  } else if (existsSync(NOTIFY_DST)) {
    unlinkSync(NOTIFY_DST);
    ok(`Removed ${c.dim}task-complete.ts${c.rst}`);
  } else {
    warn("No notify script found — nothing to remove");
  }

  if (existsSync(SWIFTBAR_TS_DST)) unlinkSync(SWIFTBAR_TS_DST);
  if (existsSync(SWIFTBAR_SH_DST)) {
    unlinkSync(SWIFTBAR_SH_DST);
    ok(`Removed ${c.dim}swiftbar-plugin.sh${c.rst}`);
  }

  const swiftbarPluginDir = detectSwiftBarPluginDir();
  if (swiftbarPluginDir) {
    const pluginLink = join(swiftbarPluginDir, SWIFTBAR_NAME);
    if (existsSync(pluginLink)) {
      unlinkSync(pluginLink);
      ok(`Removed SwiftBar plugin link from ${c.dim}${pluginLink}${c.rst}`);
    }
  }

  if (existsSync(SETTINGS_FILE)) {
    const settings = readSettings();
    let changed = false;

    if (settings.statusLine) {
      delete settings.statusLine;
      changed = true;
    }

    const stopHooks = (settings.hooks as any)?.Stop;
    if (Array.isArray(stopHooks)) {
      const filtered = stopHooks.filter(
        (entry: any) => !(Array.isArray(entry.hooks) &&
          entry.hooks.some((h: any) => h.command === NOTIFY_CMD))
      );
      if (filtered.length !== stopHooks.length) {
        (settings.hooks as any).Stop = filtered;
        changed = true;
      }
    }

    if (changed) {
      writeSettings(settings);
      ok(`Removed statusLine and Stop hook from ${c.dim}settings.json${c.rst}`);
    } else {
      ok("Settings already clean");
    }
  }

  log(`\n${c.green}Done!${c.rst} Restart Claude Code to apply changes.\n`);
}

// ── SwiftBar plugin dir detection ────────────────────────
function detectSwiftBarPluginDir(): string | null {
  // Primary: read from macOS defaults (com.ameba.SwiftBar → PluginDirectory)
  try {
    const out = execSync("defaults read com.ameba.SwiftBar PluginDirectory 2>/dev/null", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    if (out && existsSync(out)) return out;
  } catch {}

  // Fallback: check common default locations
  const candidates = [
    join(homedir(), "Library", "Application Support", "SwiftBar", "Plugins"),
    join(homedir(), "Documents", "SwiftBarPlugins"),
    join(homedir(), ".config", "swiftbar"),
  ];
  for (const dir of candidates) {
    if (existsSync(dir)) return dir;
  }

  return null;
}

// ── Entry ────────────────────────────────────────────────
process.argv.includes("--uninstall") ? uninstall() : install();

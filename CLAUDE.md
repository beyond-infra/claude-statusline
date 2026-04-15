# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A Claude Code status line plugin. It installs a `statusline.ts` script into `~/.claude/` and wires it into Claude Code's `settings.json` as a `statusLine` command. When Claude Code renders its status bar, it pipes session JSON to this script via stdin and displays the output.

## File architecture

- **`bin/install.ts`** — CLI installer/uninstaller. Copies `statusline.ts` and `task-complete.ts` to `~/.claude/`, patches `~/.claude/settings.json` to add/remove the `statusLine` command and `hooks.Stop` entry, and handles backup/restore of prior scripts. Run with `--uninstall` to reverse.
- **`bin/statusline.ts`** — The status line renderer. Reads session JSON from stdin (model, context window usage, cwd, session start time), runs a few `git` and `ps` commands, then writes a colored single-line string to stdout. Falls back to `"Claude"` when stdin is empty (e.g. during install).
- **`bin/task-complete.ts`** — Task completion notifier. Registered as a `hooks.Stop` command in `settings.json`. Claude Code pipes the same session JSON to it on stdin when a task finishes. Fires a macOS system notification (via `osascript`) with the project directory name and session duration, and writes a terminal bell (`\a`) to stdout.

All three files use `#!/usr/bin/env npx --yes tsx` shebangs so they run directly without a compile step.

## Running / testing

Install into your local Claude setup:
```sh
npx --yes tsx bin/install.ts
```

Uninstall:
```sh
npx --yes tsx bin/install.ts --uninstall
```

Test the statusline renderer directly by piping synthetic JSON:
```sh
echo '{"model":{"display_name":"claude-sonnet-4-6"},"context_window":{"context_window_size":200000,"current_usage":{"input_tokens":50000}},"cwd":"/your/project","session":{"start_time":"2025-01-01T00:00:00Z"}}' | npx --yes tsx bin/statusline.ts
```

Test the empty-stdin fallback:
```sh
echo "" | npx --yes tsx bin/statusline.ts
```

Test the task-completion notifier directly:
```sh
echo '{"cwd":"/your/project","session":{"start_time":"2026-04-15T00:00:00Z"}}' | npx --yes tsx bin/task-complete.ts
```
Should fire a macOS notification bubble and a terminal bell.

## stdin contract

Claude Code passes a JSON object to the statusline command via stdin. Relevant fields:

| Field | Type | Description |
|---|---|---|
| `model.display_name` | string | Model name shown on the left |
| `context_window.context_window_size` | number | Total token capacity |
| `context_window.current_usage.input_tokens` | number | Tokens used |
| `context_window.current_usage.cache_creation_input_tokens` | number | Cache write tokens |
| `context_window.current_usage.cache_read_input_tokens` | number | Cache read tokens |
| `cwd` | string | Current working directory |
| `session.start_time` | string | ISO timestamp for elapsed-time display |

## Effort level

The renderer reads `effortLevel` from `~/.claude/settings.json` to display a visual effort indicator (◔/◑/●). This is a Claude Code setting, not something this project controls.

## Permissions indicator

The `⚡` prefix appears when Claude Code is running with `--dangerously-skip-permissions`, detected by inspecting the parent process command line via `ps`.

## Publishing

The package is published to npm as `@beyond-infra/claude-statusline`. The `bin.claude-statusline` entry in `package.json` points to `install.ts`, so `npx @beyond-infra/claude-statusline` runs the installer directly via tsx without any build step.

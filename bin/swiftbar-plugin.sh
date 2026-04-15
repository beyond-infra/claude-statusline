#!/bin/bash
# <swiftbar.title>Claude Status</swiftbar.title>
# <swiftbar.version>1.0.0</swiftbar.version>
# <swiftbar.author>beyond-infra</swiftbar.author>
# <swiftbar.desc>Shows Claude Code session status and last task completion</swiftbar.desc>
# <swiftbar.hideAbout>true</swiftbar.hideAbout>
# <swiftbar.hideRunInTerminal>true</swiftbar.hideRunInTerminal>
# <swiftbar.hideLastUpdated>true</swiftbar.hideLastUpdated>
# <swiftbar.hideDisablePlugin>false</swiftbar.hideDisablePlugin>
# <swiftbar.hideSwiftBar>true</swiftbar.hideSwiftBar>

# SwiftBar runs with a minimal PATH — find node from common install locations
NODE=""
for candidate in \
  "$(command -v node 2>/dev/null)" \
  /opt/homebrew/bin/node \
  /usr/local/bin/node \
  /opt/homebrew/opt/node/bin/node \
  /opt/homebrew/opt/node@22/bin/node \
  /opt/homebrew/opt/node@20/bin/node \
  "$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" 2>/dev/null | sort -V | tail -1)/bin/node" \
  "$HOME/.volta/bin/node"; do
  if [ -x "$candidate" ]; then
    NODE="$candidate"
    break
  fi
done

if [ -z "$NODE" ]; then
  echo "✦ Claude"
  echo "---"
  echo "node not found — install Node.js"
  exit 1
fi

# Find tsx (prefer local cache, fall back to npx-style global)
TSX=""
for candidate in \
  "$HOME/.npm/_npx/$(ls "$HOME/.npm/_npx" 2>/dev/null | head -1)/node_modules/.bin/tsx" \
  /opt/homebrew/bin/tsx \
  /usr/local/bin/tsx \
  "$HOME/.npm-global/bin/tsx"; do
  if [ -x "$candidate" ]; then
    TSX="$candidate"
    break
  fi
done

if [ -n "$TSX" ]; then
  exec "$NODE" "$TSX" "$HOME/.claude/swiftbar-plugin.ts"
else
  # Fall back to npx with the resolved node in PATH
  NODE_BIN="$(dirname "$NODE")"
  exec env PATH="$NODE_BIN:$PATH" npx --yes tsx "$HOME/.claude/swiftbar-plugin.ts"
fi

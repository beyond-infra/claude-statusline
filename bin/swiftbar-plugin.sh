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

# SwiftBar runs with a minimal PATH — find npx from common install locations
NPX=""
for candidate in \
  "$(command -v npx 2>/dev/null)" \
  /opt/homebrew/bin/npx \
  /usr/local/bin/npx \
  "$HOME/.npm-global/bin/npx" \
  /opt/homebrew/opt/node/bin/npx \
  /opt/homebrew/opt/node@22/bin/npx \
  /opt/homebrew/opt/node@20/bin/npx; do
  if [ -x "$candidate" ]; then
    NPX="$candidate"
    break
  fi
done

if [ -z "$NPX" ]; then
  echo "✦ Claude"
  echo "---"
  echo "npx not found — install Node.js"
  exit 1
fi

exec "$NPX" --yes tsx "$HOME/.claude/swiftbar-plugin.ts"

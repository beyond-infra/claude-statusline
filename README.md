# claude-line

A status line for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) that shows you useful info while you work.

![demo](./.github/demo.png)

## Install

Run the command below to set it up

```bash
npx claude-line
```

It backups your old status line if any and copies the status line script to `~/.claude/statusline.sh` and configures your Claude Code settings.

## Requirements

- [jq](https://jqlang.github.io/jq/) — for parsing JSON
- curl — for fetching rate limit data
- git — for branch info

On macOS:

```bash
brew install jq
```

## Uninstall

```bash
npx claude-line --uninstall
```

If you had a previous statusline, it restores it from the backup. Otherwise it removes the script and cleans up your settings.

## License

MIT

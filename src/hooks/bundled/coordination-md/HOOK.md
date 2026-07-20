---
name: coordination-md
description: "Inject COORDINATION.md into top-level agent bootstrap context"
homepage: https://docs.openclaw.ai/automation/hooks
metadata:
  {
    "openclaw":
      {
        "emoji": "🧭",
        "events": ["agent:bootstrap"],
        "requires": { "config": ["workspace.dir"] },
        "install": [{ "id": "bundled", "kind": "bundled", "label": "Bundled with LibreClaw" }],
      },
  }
---

# COORDINATION.md Hook

Loads `COORDINATION.md` from a top-level agent workspace into Project Context during `agent:bootstrap`.

## Why

LibreClaw deployments use `COORDINATION.md` as shared context for the main configured agents. OpenClaw's bundled `bootstrap-extra-files` hook intentionally only permits standard bootstrap filenames, so this hook provides a narrow, explicit loader for this one file without making it a general worker/subagent bootstrap input.

## Configuration

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "coordination-md": {
          "enabled": true
        }
      }
    }
  }
}
```

## Behavior

- Resolves `COORDINATION.md` relative to the agent workspace.
- Injects it only for top-level agent sessions.
- Skips subagent, ACP worker, and cron worker sessions.
- Keeps reads inside the workspace root.
- Skips silently if the file is absent.
- Deduplicates if another hook already injected the same file.

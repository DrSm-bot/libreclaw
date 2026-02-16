# LibreClaw 🦞

**Claude-native AI agent harness.** A community fork of [OpenClaw](https://github.com/openclaw/openclaw), optimized for Anthropic models.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Why LibreClaw?

Following OpenClaw's acquisition by OpenAI (February 2026), LibreClaw maintains a Claude-optimized fork for users who prefer Anthropic's approach to AI safety and reasoning.

**Key differences from upstream OpenClaw:**
- 🧠 **Claude-native optimizations** — System prompts and safety features designed for Claude's judgment-based approach
- 🤝 **Multi-agent support** — `historyIncludeBots` for seamless bot-to-bot communication
- 🔧 **Extended configuration** — Additional tool profiles, context labels, and workspace injection
- 🛡️ **Community-maintained** — Independent development focused on Claude model family

## Features

All OpenClaw features plus:

| Feature | Description |
|---------|-------------|
| `historyIncludeBots` | Include bot messages in Discord history for multi-agent setups |
| `tools.profile: "none"` | Disable all tools for models without tool-calling |
| `userContextLabels` | Control visibility of "(untrusted)" labels |
| `COORDINATION.md` injection | Workspace context for multi-agent coordination |
| UI confirmation guards | Prevent accidental updates/restarts |
| Message ID injection | Trusted message IDs in inbound metadata |

## Quick Start

```bash
# Clone the repo
git clone https://github.com/DrSm-bot/libreclaw.git
cd libreclaw

# Install dependencies
pnpm install

# Build
pnpm build
pnpm ui:build

# Run
pnpm start
```

Or use the `develop` branch for the latest Claude-native patches:

```bash
git checkout develop
```

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Clean upstream sync point (v2026.2.15 base) |
| `develop` | Production-ready with all Claude-native patches |

## Upstream Sync

LibreClaw tracks OpenClaw upstream for security fixes and compatible features:

```bash
git fetch upstream
git checkout develop
git rebase upstream/main
# Resolve conflicts, rebuild, test
```

## Configuration

LibreClaw uses the same `openclaw.json` configuration as OpenClaw. See the [OpenClaw documentation](https://docs.openclaw.ai) for base configuration.

### LibreClaw-specific options

```json
{
  "channels": {
    "discord": {
      "accounts": {
        "default": {
          "historyIncludeBots": true
        }
      }
    }
  },
  "agents": {
    "main": {
      "tools": {
        "profile": "none"
      }
    }
  },
  "messages": {
    "userContextLabels": false,
    "injectMessageId": true
  }
}
```

## Philosophy

LibreClaw embraces Claude's approach to AI assistance:

- **Trust through judgment** — Minimal explicit restrictions, maximum model reasoning
- **Safety through alignment** — Let the model's values guide behavior, not hardcoded rules
- **Transparency** — Clear communication about capabilities and limitations
- **Community-driven** — Open development, responsive to user needs

## Contributing

Contributions welcome! Please:

1. Fork the repo
2. Create a feature branch from `develop`
3. Submit a PR with clear description

## License

MIT License — same as upstream OpenClaw.

## Credits

- **OpenClaw** — Original project by Peter Steinberger and contributors
- **LibreClaw** — Community fork maintained by [DrSm-bot](https://github.com/DrSm-bot)

---

*"The claw is the law"* 🦞

# LibreClaw Local Patches

This document tracks local fixes and patches that need to be preserved during upstream merges.

## Active Patches

### 1. historyIncludeBots Key Consistency Fix
- **PR:** #10
- **Date:** 2026-02-20
- **File:** `src/discord/monitor/message-handler.preflight.ts`
- **Status:** ✅ Merged to main

**Problem:** When a bot message was split across multiple Discord messages (due to 2000 char limit), chunk 1 (no @mention) was recorded under `message.channelId` while chunk 2 (with @mention) looked for history under `messageChannelId`. This caused agents to miss context from earlier chunks.

**Fix:** Changed `historyKey: message.channelId` → `historyKey: messageChannelId` for consistency.

**Tests:** `src/discord/monitor/message-handler.preflight.test.ts` (236 lines of coverage)

**Upstream Status:** Local only. OpenClaw repo is overwhelmed with PRs — we maintain fixes locally.

---

### 2. injectMessageId
- **Date:** 2026-02-11
- **File:** See `inject-message-id-2026-02-11.md`
- **Status:** ✅ Active

Injects message IDs into trusted metadata for reply targeting.

---

## Merge Procedure

When updating from upstream OpenClaw:

1. **Before merge:** Check this file for active patches
2. **During merge:** Watch for conflicts in patched files
3. **After merge:** Verify patches still apply correctly
4. **Test:** Run `pnpm test` to ensure nothing broke

### Key Files to Watch
- `src/discord/monitor/message-handler.preflight.ts` (historyIncludeBots)
- `src/discord/monitor/message-handler.process.ts` (related)
- Any files listed in patch descriptions above

## Upstream Policy

**Aktuell keine Upstream-PRs.**

Nicht weil wir nicht wollen — wir würden gerne beitragen! Aber OpenClaw's Repo ist mit PRs überflutet (22k+) und Peter kann nur gevettete Contributions akzeptieren. Zusätzliche PRs würden mehr Overhead als Hilfe erzeugen.

Wir pflegen unsere Fixes lokal in LibreClaw. Wenn Upstream irgendwann das gleiche fixt, droppen wir unseren Patch beim nächsten Merge.

---

*Last updated: 2026-02-20*

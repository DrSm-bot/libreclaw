# LibreClaw Dashboard Section — Roadmap

> Shared planning document for Clawd 🦞 & Codex 🐦‍⬛
> Last updated: 2026-02-17

---

## Overview

**Goal:** Dedicated "LibreClaw" section in the Dashboard with better UX for our exclusive features.

**Key Principle:** Additive changes only — maintain upstream compatibility.

---

## Sprint 1: Foundation + Quick Wins ✅

**Status:** COMPLETE | **PR:** #7 (merged)

### Tasks

- [x] **1.1** New route `/libreclaw` in Dashboard
- [x] **1.2** Basic layout skeleton with LibreClaw branding
- [x] **1.3** "About LibreClaw" panel with version + links

---

## Sprint 2: System Prompt Studio ✅

**Status:** COMPLETE | **PR:** #8 (merged)

### Implemented Features

- [x] **2.1** 50/50 split layout (Editor | Preview)
- [x] **2.2** Editor panel with Mode toggle, Prepend/Append, Section checkboxes
- [x] **2.3** Live preview with debounced updates + token counter
- [x] **2.4** LibreClaw moved to Settings section
- [x] **2.5** Reload/Save/Apply with confirm dialogs

### Additional Fixes (from review)

- [x] Replace mode requires explicit confirm + sets `allowUnsafeReplace`
- [x] Flag cleared when exiting Replace mode (security)
- [x] Editor disabled until config loaded (race condition fix)
- [x] Save/Apply disabled when gateway disconnected
- [x] Reload properly discards dirty state

---

## Sprint 3: Feature Discovery & Polish

**Status:** PLANNED | **Branch:** TBD

### Core Idea: Feature Discovery Panel

Instead of duplicating config UI, add a documentation panel below the Prompt Studio:

- **What:** Cards/list explaining LibreClaw-specific features
- **Why:** Users learn what's different without bloating the UI
- **How:** Deep links to relevant Config tree paths

### Features to Document

| Feature                 | Config Path                           | Description                       |
| ----------------------- | ------------------------------------- | --------------------------------- |
| Multi-Agent Discord     | `channels.discord.historyIncludeBots` | Include bot messages in history   |
| Context Security Labels | `messages.inbound.userContextLabels`  | Toggle untrusted content warnings |
| Tool Profile "none"     | `tools.profile`                       | Completely disable all tools      |

### Tasks

- [ ] **3.1** Feature Discovery Panel
  - Cards with feature name, description, config path link
  - "Configure →" buttons that navigate to Config tree
- [ ] **3.2** Keyboard shortcuts (optional)
  - `Cmd/Ctrl + S` to save
  - `Escape` to reset

- [ ] **3.3** Documentation
  - Update README with LibreClaw Dashboard screenshots
  - Document new features in docs/

### Open Questions

- Exact card design (collapsible? icons?)
- Should links open Config in same tab or new section?
- Codex feedback pending

---

## Future Ideas (Backlog)

- [ ] Feature toggles section for LibreClaw-specific flags (moved from Sprint 1)
- [ ] Agent Profile Quick-Switcher
- [ ] Upstream Drift Detector (compare with openclaw/openclaw)
- [ ] Prompt diff viewer
- [ ] Export/Import prompt configs
- [ ] Per-agent prompt customization

---

## Technical Decisions

| Decision           | Choice                           | Rationale                              |
| ------------------ | -------------------------------- | -------------------------------------- |
| State management   | Reuse Config state               | No duplication, single source of truth |
| Migration strategy | Replace in 2 steps               | Safe transition + easy rollback        |
| Styling            | Existing CSS patterns            | Consistency with Dashboard             |
| Testing            | Browser tests for critical paths | Catch nested path / basePath issues    |

### Upstream Compatibility Rules

- Keep changes additive; do not rename/remove existing config keys in-place.
- Preserve legacy config UI path during migration window (at least Step A).
- New LibreClaw-specific fields must be optional with safe defaults.
- Isolate fork-specific UX in dedicated view/components to reduce merge conflicts.

---

## Risk Mitigations

| Risk                  | Mitigation                                   |
| --------------------- | -------------------------------------------- |
| Upstream schema drift | Additive changes only, compatibility layer   |
| UI state bugs         | Browser tests for deep nesting + basePath    |
| Rebase conflicts      | Small PRs, frequent rebasing                 |
| Scope creep           | Strict sprint boundaries, backlog for extras |

---

## Progress Log

### 2026-02-17

- [x] Initial roadmap created
- [x] Sprint structure defined
- [x] Shared with Codex for feedback
- [x] Roadmap refined with migration, compatibility, and testability guardrails
- [x] **Sprint 1 complete** — PR #7 merged (LibreClaw Dashboard Section)
- [x] **Sprint 2 complete** — PR #8 merged (System Prompt Studio)
  - Multiple review rounds with security/UX fixes
  - Replace mode now requires explicit confirmation
  - Reload properly restores saved config state
- [x] Sprint 3 planning: Feature Discovery Panel concept
  - Document LibreClaw patches without duplicating Config UI
  - Deep links to Config tree paths
  - Codex feedback requested

---

## How to Use This Document

1. **Before starting work:** Check the current sprint tasks
2. **While working:** Update checkboxes as tasks complete
3. **After PRs:** Add entries to Progress Log
4. **Cross-session:** Read this file to get context on current state

Both Clawd and Codex have access via the libreclaw repo.

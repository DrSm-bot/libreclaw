# LibreClaw Dashboard Section — Roadmap

> Shared planning document for Clawd 🦞 & Codex 🐦‍⬛
> Last updated: 2026-02-17

---

## Overview

**Goal:** Dedicated "LibreClaw" section in the Dashboard with better UX for our exclusive features.

**Key Principle:** Additive changes only — maintain upstream compatibility.

---

## Sprint 1: Foundation + Quick Wins

**Target:** 3-4 days | **Branch:** `feat/libreclaw-dashboard`

### Tasks

- [ ] **1.1** New route `/libreclaw` in Dashboard
  - Add view component `ui/src/ui/views/libreclaw.ts`
  - Register route in app router
  - Sidebar entry with 🦞 icon

- [ ] **1.2** Basic layout skeleton
  - Header with LibreClaw branding
  - Subsection navigation (tabs or cards)
  - Responsive layout

- [ ] **1.3** "About LibreClaw" panel
  - Version display
  - Links: GitHub, Docs, Discord
  - Fork info / upstream version comparison (stretch)

- [ ] **1.4** Feature toggles section (if applicable)
  - Simple on/off switches for LibreClaw-specific features
  - Connected to config state

### Acceptance Criteria

- [ ] `/libreclaw` route loads without errors
- [ ] Sidebar shows LibreClaw entry
- [ ] About panel displays version info
- [ ] No regressions in existing Dashboard functionality

---

## Sprint 2: System Prompt Studio

**Target:** 4-5 days | **Branch:** `feat/system-prompt-studio`

### Tasks

- [ ] **2.1** Full-screen editor layout
  - 50/50 split: Editor (left) | Preview (right)
  - Resizable splitter (stretch goal)

- [ ] **2.2** Editor panel
  - Mode toggle (Default / Customize / Replace)
  - Prepend textarea with syntax highlighting (stretch)
  - Append textarea
  - Section checkboxes (grouped, searchable?)

- [ ] **2.3** Preview panel
  - Live preview using existing `/api/system-prompt/preview`
  - Debounced updates (300ms)
  - Token counter display
  - Section count (active/total)

- [ ] **2.4** Controls migration
  - Remove embedded preview from Config tree
  - Redirect users to LibreClaw section
  - Config tree shows "Edit in Prompt Studio →" link

- [ ] **2.5** Persistence
  - Save/Reset buttons
  - Unsaved changes indicator
  - Confirm dialog on navigation with unsaved changes

### Acceptance Criteria

- [ ] Prompt Studio fully functional
- [ ] Token count displays correctly
- [ ] Preview updates live on edits
- [ ] Config changes persist correctly
- [ ] No duplicate UI (Config tree cleaned up)

---

## Sprint 3: Polish & Extras

**Target:** 2-3 days | **Branch:** `feat/libreclaw-polish`

### Tasks

- [ ] **3.1** Keyboard shortcuts
  - `Cmd/Ctrl + S` to save
  - `Cmd/Ctrl + P` to toggle preview
  - `Escape` to reset

- [ ] **3.2** Prompt templates (stretch)
  - Save current config as named template
  - Load from template library
  - Default templates (minimal, full, custom)

- [ ] **3.3** UI polish
  - Animations/transitions
  - Loading states
  - Error handling improvements
  - Dark/light theme consistency

- [ ] **3.4** Documentation
  - Update docs with LibreClaw section usage
  - Screenshots for README

### Acceptance Criteria

- [ ] Keyboard shortcuts work
- [ ] Smooth UX with proper loading states
- [ ] Documentation updated

---

## Future Ideas (Backlog)

- [ ] Agent Profile Quick-Switcher
- [ ] Upstream Drift Detector (compare with openclaw/openclaw)
- [ ] Prompt diff viewer
- [ ] Export/Import prompt configs
- [ ] Per-agent prompt customization

---

## Technical Decisions

| Decision           | Choice                           | Rationale                                 |
| ------------------ | -------------------------------- | ----------------------------------------- |
| State management   | Reuse Config state               | No duplication, single source of truth    |
| Migration strategy | Replace, not duplicate           | Prompt Studio replaces embedded config UI |
| Styling            | Existing CSS patterns            | Consistency with Dashboard                |
| Testing            | Browser tests for critical paths | Catch nested path / basePath issues       |

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

---

## How to Use This Document

1. **Before starting work:** Check the current sprint tasks
2. **While working:** Update checkboxes as tasks complete
3. **After PRs:** Add entries to Progress Log
4. **Cross-session:** Read this file to get context on current state

Both Clawd and Codex have access via the libreclaw repo.

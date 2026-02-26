# LibreClaw Patch Stack — v2026.2.25 Update

Base: `v2026.2.25`  
Working branch: `upgrade/v2026.2.25-track1`

## Summary
- Total applied commits above base: **31**
- Track A+C (core + CI): **12 commits**
- Track B (systemPrompt/UI port): **19 commits**
- Explicitly dropped during update: **2 old commits**
  - `41c83e9697` (`ci(develop): trigger on push and simplify nightly`)  
  - `c3f88dd5a0` (`fix: remove duplicate type declarations from cherry-pick conflicts`)

## Applied commits (in order)
1. `132fce93aa` feat(discord): add historyIncludeBots for multi-agent context
2. `18c0247252` docs: clarify historyIncludeBots is account-level only
3. `d8aa8a5b60` chore: adjust safety prompt wording + add test
4. `d69e9122d8` chore: inject COORDINATION.md as optional workspace context
5. `381304f2e3` feat(ui): add confirmation guard for Update button
6. `44304d5b9d` feat(tools): add 'none' profile to disable all tools
7. `c20de52ce9` feat(inbound): allow hiding untrusted labels
8. `ce078e9c7b` feat(messages): optional trusted message_id in inbound meta
9. `909fbdb632` fix(ui): scope config form unsafe warning to active section
10. `9f4259442d` test(ui): verify config unsafe warning is section-scoped
11. `0904f23bf2` fix(discord): use unique seed customIds for select handlers
12. `e04d03e0ee` ci: build control UI and harden node test memory
13. `fc0f210575` feat(config): add system prompt customization schema + section ids
14. `7de5ee71e7` feat(config): validate systemPrompt section IDs with clear errors
15. `faae91e1a9` feat(prompt): implement configurable system prompt composition
16. `a3e3244446` fix(prompt): respect heading levels when removing sections
17. `b166a0d658` chore(config-ui): order system prompt customization fields
18. `14376a643f` feat(control-ui): add system prompt customization editor
19. `83570c31d4` fix(control-ui): fallback system prompt section IDs when schema enum missing
20. `85f8f66c2e` feat(control-ui): add hover descriptions for system prompt section IDs
21. `425f383ea1` fix(prompt): keep trailing sections when removing project context
22. `16a5f2cf15` feat(ui): embed collapsible system prompt preview
23. `12011d657e` fix(ui): wire base path + recursive preview props
24. `f7bddb14b7` fix(prompt-port): align embedded runner with v2026.2.25 prompt API
25. `98e1f00abe` feat(ui): add system prompt studio split view in libreclaw tab
26. `ac1a18898f` fix(ui): gate prompt studio editor and enable unsafe replace
27. `b13b5e5c83` feat(ui): add prompt studio actions and move libreclaw under settings
28. `fc0ea55a56` fix(ui): confirm save/apply and make libreclaw reload discard dirty
29. `f7b0de363f` feat(prompt-studio): add safety prompt style toggle and config
30. `ffc97b4f27` fix(control-ui): forward safetyStyle in system prompt preview
31. `c6f026fe1a` fix(ui): add LibreClaw tab to navigation with proper i18n

## Validation status
- `pnpm build`: ✅
- `pnpm ui:build`: ✅
- `openclaw status`: ✅ config accepted (`agents.defaults.systemPrompt` recognized)

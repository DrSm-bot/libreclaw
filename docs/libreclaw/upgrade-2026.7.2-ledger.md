---
title: "LibreClaw 2026.7.2 downstream-delta ledger"
sidebarTitle: "LibreClaw 2026.7.2 ledger"
summary: "Upgrade ledger for rebuilding LibreClaw on OpenClaw 2026.7.2, including baseline smoke, Sol review gates, and downstream patch dispositions."
read_when:
  - Rebuilding LibreClaw on a new OpenClaw release
  - Deciding whether to port downstream LibreClaw patches
  - Reviewing the 2026.7.2 LibreClaw upgrade branch
---

# LibreClaw 2026.7.2 downstream-delta ledger

Created: 2026-07-19

## Base freeze

- Integration branch: `upgrade/v2026.7.2-libreclaw`
- Upstream base: `upstream/release/2026.7.2`
- Base SHA: `3201a91b3b807771db5d2e2b09455a4a652dc7d9`
- Upstream ref SHA at freeze: `3201a91b3b807771db5d2e2b09455a4a652dc7d9`
- Package version: `openclaw 2026.7.2-beta.4`
- Local worktree: separate clean checkout; operator-specific path intentionally omitted from docs.

This branch intentionally starts from a clean upstream release foundation. Do not rebase or cherry-pick the previous LibreClaw stack wholesale.

## Baseline smoke before downstream code

Run on the clean base worktree before adding LibreClaw changes:

- `pnpm install --frozen-lockfile` — passed.
- `pnpm check:no-conflict-markers` — passed.
- `pnpm check:base-config-schema` — passed (`[base-config-schema] ok`).
- `pnpm test:bundled` — passed, 2 files / 191 tests.
- `pnpm build` — passed, total 7m19.9s; slowest phase `tsdown-unified` 6m10s.

Build caveat: the upstream build regenerated `extensions/browser/chrome-extension/modules/copilot-runtime.js` and `.openclaw-build-root-help/`; those generated outputs were reverted/removed after the baseline run so the integration tree is clean.

## Sol/high plan review requirements incorporated

Codex CLI `gpt-5.6-sol` with high reasoning returned `VERDICT: revise` for the upgrade plan. Required adjustments now treated as gates:

1. Pin the exact upstream SHA and prove clean baseline before downstream code.
2. Maintain this exhaustive downstream-delta ledger; no remembered feature list as source of truth.
3. Do not drop old visible-reply, wake, ACP, or Codex runtime patches by vibe; map source and run focused proof first.
4. Explicitly do not restore old `openai-codex`/generated `CODEX_HOME` auth bridge unless a demonstrated current gap exists.
5. Rework Creature Catalog as a portable LibreClaw downstream-owned skill/workspace distribution rather than blind product-core copy.
6. Treat `COORDINATION.md` injection as a design decision; prefer standard bootstrap files or managed/plugin hook over core change unless tests prove need/safety.
7. Defer Prompt Studio v2 to separate architecture work; do not restore removed `systemPromptOverride` keys or shims.
8. Each implemented feature slice must pass focused tests, changed checks, repository-native review, and Sol/high adversarial review-fix-until-clean.

## Disposition summary

- already-upstream: 11
- defer/drop: 13
- drop-or-prove: 36
- drop/product: 10
- drop/release-train: 70
- keep/rework: 4
- prove-before-port: 1
- rework-if-needed: 1
- rework-later: 4
- rework/decide: 2

## Carry-forward decisions

### First implementation slice: Creature Catalog

Disposition: `keep/rework`.

Keep the workflow value, but do not copy the old skill verbatim. The old skill assumes local paths and external simulated.site scripts. First slice must:

- inspect current `simulated.site` schema/scripts;
- make repository resolution portable/configurable;
- document why this is carried as a LibreClaw downstream-owned bundled skill, or move it to a managed/ClawHub path;
- run focused validation against the catalog repo;
- run Sol/high adversarial review/fix-until-clean before considering it carried.

Validation caveat: direct `pnpm check:changed` is not currently usable on this host because Blacksmith Testbox/crabbox fails local binary sanity with `selected binary failed basic --version/--help sanity checks`. For docs/skill-only slices, run `pnpm check:changed --dry-run -- <changed files>` and execute the listed local gates individually until the crabbox path is repaired.

### Coordination context

Disposition: `rework/decide`.

Upstream now has `bootstrap-extra-files`, but it intentionally allows only recognized bootstrap basenames, not `COORDINATION.md`. Options:

1. Move coordination context into a recognized bootstrap file such as `AGENTS.md`/`TOOLS.md`/`HEARTBEAT.md`.
2. Use a managed/workspace hook or plugin for `COORDINATION.md`.
3. Reintroduce a core bundled hook only if cross-runtime proof passes.

Required proof if any hook is carried: main-agent bootstrap, subagent filtering, heartbeat, compaction, and native Codex behavior.

### Prompt Studio

Disposition: `defer/drop` for old implementation.

The old `systemPromptOverride`-based implementation must not be ported. 2026.7.2 removed those legacy keys and current prompt surfaces differ across embedded, native Codex, CLI/ACP, compaction, reports, preview, and provider-specific GPT-5 overlays. Treat Prompt Studio v2 as a separate design project after the base upgrade is healthy.

### Runtime patches proved before porting

Initial disposition: `prove-before-port`. Current outcomes:

- Streamed visible channel delivery (`0f1911b`, `5ce35a9`, `0affcc6`): `keep/rework`. Current upstream already bridges CLI assistant events to `onPartialReply` live previews, but it did not deliver CLI assistant deltas to normal source-channel block replies when block streaming was off. Reworked onto the current agent-event bridge architecture instead of cherry-picking old `RunCliAgentParams.onAssistantDelta` commits. Focused coverage now proves buffered CLI assistant deltas reach `onBlockReply`, direct text-only block delivery is explicitly opted in, and final payloads covered by direct block sends are suppressed/deduped.
- Generic wake/system-event prompt inclusion (`0ab1daf`): no code port after proof. Current upstream centrally drains generic system events into prepared prompts; targeted validation passed.
- ACP/native Codex runtime glue mentioned in memory: no port without a focused failing proof. Current upstream already has extensive ACP/native Codex runtime surfaces.

Validation for the visible-delivery slice:

- `node scripts/run-vitest.mjs run src/auto-reply/reply/agent-runner-execution-cli-progress.test.ts src/auto-reply/reply/agent-runner-execution-cli-block-replies.test.ts src/auto-reply/reply/agent-runner-cli-dispatch.test.ts src/auto-reply/reply/reply-delivery.test.ts src/auto-reply/reply/agent-runner-payloads.test.ts` — passed, 5 files / 131 tests.
- `node scripts/run-tsgo.mjs -p tsconfig.core.json --incremental --tsBuildInfoFile .artifacts/tsgo-cache/core.tsbuildinfo && node scripts/run-tsgo.mjs -p test/tsconfig/tsconfig.core.test.json --incremental --tsBuildInfoFile .artifacts/tsgo-cache/core-test.tsbuildinfo` — passed.

## Complete patch-id ledger vs 2026.7.2

Source command from previous LibreClaw checkout:

```bash
git cherry -v upstream/release/2026.7.2 main
```

Legend: `-` means patch-id equivalent in the new base; `+` means unique relative to the new base.

| Mark | Commit         | Subject                                                                              | Disposition        | Note                                                                                                                                                            |
| ---- | -------------- | ------------------------------------------------------------------------------------ | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `+`  | `072a5ae4b011` | chore(release): prepare 2026.4.25 beta 1                                             | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `dd1314190333` | fix: satisfy traceparent header lint                                                 | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `ced0e96cf279` | fix: break plugin command spec import cycle                                          | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `1768995c37c7` | chore(release): sync beta config schema                                              | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `1ce1713139b8` | chore(config): refresh bundled channel metadata                                      | drop/release-train | Old generated channel metadata refresh from release train; new 2026.7.2 generated metadata is the source of truth.                                              |
| `+`  | `399b41bbdbdc` | docs(config): refresh channel config baseline                                        | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `c6276d6b1929` | docs(plugin-sdk): refresh api baseline                                               | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `b9758bf44a63` | docs(plugin-sdk): refresh beta api baseline after main sync                          | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `6ca590769255` | fix(runtime): harden dependency install surfaces (#71997)                            | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `308ba5915115` | test: update npm telegram workflow expectations                                      | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `0ca3fae91a8c` | fix: hide raw agent failures in group chats                                          | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `2e10d8791983` | docs(changelog): flatten 27 multi-line bullets into single lines per AGENTS.md rule  | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `50565b05aa7c` | docs(changelog): add 2026.4.25 release highlights                                    | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `b7733c48c06c` | docs(release): codify beta train backport scan                                       | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `ea9da71f0316` | test: type setup provider mocks                                                      | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `b4ff9472063b` | fix(ui): remove ineffective dynamic imports                                          | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `5bc728d4800c` | docs(release): refine beta validation guidance                                       | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `660dcf2c9409` | docs(plugin-sdk): refresh api baseline after main sync                               | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `dcad0256b222` | docs(plugin-sdk): refresh api baseline after main sync                               | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `ccc8d7146170` | fix(cli): keep channel add plugin install noninteractive                             | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `865fde8f72a3` | chore(release): bump 2026.4.25 beta 2                                                | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `9b1583112a6f` | test(extensions): restore transformed dynamic imports                                | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `ef447c43c700` | test(qa): allow slower gateway rpc startup retries                                   | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `3c89b16fb014` | test(release): wait longer for dashboard smoke                                       | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `8c309aa3deed` | chore(release): bump 2026.4.25 beta 3                                                | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `6ecae2294364` | chore(release): bump 2026.4.25 beta 4                                                | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `4d0e1470df32` | fix(release): stabilize beta validation lanes                                        | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `a813219b6be7` | chore(release): bump 2026.4.25 beta 5                                                | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `b77514b6d94a` | fix: avoid PowerShell error variable collision                                       | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `90c40e9f90a9` | chore(release): bump 2026.4.25 beta 6                                                | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `a4266be80812` | test(release): stabilize release validation waits                                    | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `a188d486ddc6` | chore(release): bump 2026.4.25 beta 7                                                | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `1f194f1d55a4` | fix(whatsapp): stop reconnecting quiet sockets                                       | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `ca9fb36d5370` | docs(changelog): place WhatsApp backport in 2026.4.25                                | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `ec71b01f71ad` | chore(release): bump 2026.4.25 beta 8                                                | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `773e302179f1` | fix(auto-reply): poison inbound dedupe after partial turn failure                    | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `227a07558b4f` | docs(changelog): place auto-reply backport in 2026.4.25                              | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `095e1a90f5b0` | docs(release): allow retagging unpublished betas                                     | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `683437fe6126` | fix(discord): escalate repeated health-monitor restarts                              | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `1a3c48015520` | fix: shortcut live session model redirects during fallback                           | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `3f821a8888bc` | fix(agents): honor bundle mcp tool allowlist                                         | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `a8ba87ee9088` | fix(agents): keep responses web search reasoning compatible                          | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `cec1d46b3040` | test(gateway): harden acp bind docker smoke                                          | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `5ea41fe40ca1` | test(gateway): classify stream fallback as empty live response                       | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `2c625f9368be` | fix: repair skills and memory watcher refresh paths                                  | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `d32a7916bd5a` | docs(changelog): note beta 9 backports                                               | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `377041cd7558` | chore(release): bump 2026.4.25 beta 9                                                | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `c8972376cbc1` | docs(changelog): remove codex credits                                                | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `55d1a2e0e0d7` | fix(logging): redact persisted transcript text                                       | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `a410f05a09f5` | chore(release): bump 2026.4.25 beta 10                                               | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `218bceaa14f9` | fix(release): harden beta validation lanes                                           | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `53f8e9de1311` | ci(release): allow npm telegram e2e from release branch                              | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `b07811b01d8c` | ci: chunk release Docker e2e jobs                                                    | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `d8e62793bb13` | ci: run release Docker chunks through scheduler                                      | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `c02a556faf42` | ci: fix ACPX Docker update repair target                                             | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `11c46893f4e2` | ci: enable docker image attestations                                                 | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `306cfe42b574` | ci: centralize docker build wrapper                                                  | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `f950503b7748` | ci: add targeted docker lane reruns                                                  | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `abf0ef9cd358` | ci(release): trust release branch docker checks                                      | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `710925131843` | test(qa): relax telegram mention reply assertion                                     | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `2e8a089836f8` | ci(docker): preserve pnpm path in scheduler lanes                                    | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `61a539a1b7bd` | ci(docker): use resolved pnpm for scheduled lanes                                    | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `d8c4dcb6a4d5` | ci(docker): test release installer against beta                                      | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `7677b4ca24c3` | ci(docker): pass beta env to installer e2e                                           | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `5e04b0f97a42` | ci(qa): remove telegram beta approval gate                                           | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `b02fdb8264da` | test(qa): drop brittle telegram workflow assertions                                  | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `fa95a607f280` | fix: restart package updates through updated install                                 | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `684b60cbff20` | fix(bonjour): auto-disable advertising in containers                                 | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `9d77d75b274a` | ci: validate release tarball before npm publish                                      | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `13d269f792b4` | fix: keep package inventory aligned with npm tarball                                 | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `324915c15cbd` | test: harden load-sensitive release lanes                                            | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `dedad1c00d0b` | fix: support qr docker build without extra args                                      | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `75bb5c607754` | fix: close session locks synchronously on exit                                       | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `f934ecaa128d` | test(docker): keep web search smoke on one gateway connection                        | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `8fa3c9465363` | Fail package update on unhealthy restart (#72422)                                    | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `1b113d80f7d8` | fix(cli): skip plugin preload for plugin updates                                     | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `81fd54696f83` | test: keep release docker helper assertions scoped                                   | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `2c1c51fa4b17` | ci: backport package acceptance workflow                                             | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `d85778ace53f` | ci: fix telegram package runner parse                                                | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `25a65b731d80` | ci: replace telegram package dependency links                                        | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `ad2db902dbea` | test(docker): backport packaged harness fixes                                        | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `9048032a7690` | fix: materialize staged plugin chunks                                                | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `009216941e17` | fix: preserve bundled runtime mirror chunks                                          | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `52c4f5a0a11e` | chore(release): bump beta 11                                                         | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `94c1e10643ea` | chore(release): refresh beta 11 schema                                               | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `e6d642d510f4` | test(docker): allow heavyweight lanes at low parallelism                             | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `f4c7d4c94214` | test: cover startup runtime dependency staging                                       | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `5ec987c64c86` | chore(release): bump stable 2026.4.25                                                | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `aa36ee670b76` | fix(gateway): stage startup plugin deps before load                                  | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `832e9bf951f2` | feat(hooks): add coordination.md bootstrap hook                                      | rework/decide      | Keep need only if standard bootstrap files cannot replace COORDINATION.md; avoid core hook unless cross-runtime/subagent proof passes.                          |
| `+`  | `53368998212d` | feat(prompt): add system prompt customization engine                                 | defer/drop         | Old Prompt Studio/systemPromptOverride architecture conflicts with 2026.7.2 prompt surfaces and removed config keys; Prompt Studio v2 requires separate design. |
| `+`  | `8eae88d8e181` | feat(prompt): add system prompt preview endpoint                                     | defer/drop         | Old Prompt Studio/systemPromptOverride architecture conflicts with 2026.7.2 prompt surfaces and removed config keys; Prompt Studio v2 requires separate design. |
| `+`  | `29c8abb90888` | feat(ui): add LibreClaw prompt studio                                                | defer/drop         | Old Prompt Studio/systemPromptOverride architecture conflicts with 2026.7.2 prompt surfaces and removed config keys; Prompt Studio v2 requires separate design. |
| `+`  | `9eae22a2b63f` | docs(prompt): document Prompt Studio customization                                   | defer/drop         | Old Prompt Studio/systemPromptOverride architecture conflicts with 2026.7.2 prompt surfaces and removed config keys; Prompt Studio v2 requires separate design. |
| `+`  | `7c6d89d1c2ca` | fix(ui): show recent session identifiers plainly                                     | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `0f1911b7029f` | fix(cli): deliver claude stream deltas to channels                                   | keep/rework        | Reworked onto current agent-event bridge architecture: CLI deltas buffer into source-channel block replies and mark final payloads for dedupe.                  |
| `+`  | `5ce35a90e677` | fix(cli): harden streamed delta delivery                                             | keep/rework        | Current bridge already serializes/drains deliveries; kept the behavior via existing agent-event bridge drain rather than old promise-chain code.                |
| `+`  | `42d91a155e7a` | test: satisfy strict type checks                                                     | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `cf0ae813f022` | style: satisfy hook lint rules                                                       | rework-if-needed   | Style-only follow-up tied to the old hook/prompt port; only relevant if a new hook is implemented.                                                              |
| `+`  | `ea2a2ef78a20` | test: align coordination hook and prompt studio settings                             | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `b40a17b59e34` | fix(ui): align system prompt preview auth option                                     | defer/drop         | Old Prompt Studio/systemPromptOverride architecture conflicts with 2026.7.2 prompt surfaces and removed config keys; Prompt Studio v2 requires separate design. |
| `+`  | `11c480024f0e` | docs: document LibreClaw downstream features                                         | rework-later       | Docs/branding only after carried features are final; preserve OpenClaw package/config/update identity.                                                          |
| `+`  | `e0002c4b5b32` | chore(release): prepare 2026.5.4 beta 2                                              | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `e9ebb6ce6c16` | fix(release): prune externalized plugin chunks                                       | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `766d02ff3b89` | fix(build): route externalized plugin chunks                                         | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `12e1c67f225b` | fix(build): route externalized plugin entry chunks                                   | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `-`  | `32e36d355d78` | fix: recover missing Codex bound threads                                             | already-upstream   | Patch-id equivalent exists in the 2026.7.2 base; do not port.                                                                                                   |
| `-`  | `079b937b4632` | fix(plugins): repair missing openclaw peer links on update                           | already-upstream   | Patch-id equivalent exists in the 2026.7.2 base; do not port.                                                                                                   |
| `-`  | `696f639cf67d` | docs: note plugin peer-link update repair                                            | already-upstream   | Patch-id equivalent exists in the 2026.7.2 base; do not port.                                                                                                   |
| `+`  | `f8f18d53fc47` | fix: start configured generation providers                                           | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `cac973972c22` | fix: slack mention-gating thread participation                                       | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `-`  | `9f15c29397ec` | fix: explain missing git during plugin install                                       | already-upstream   | Patch-id equivalent exists in the 2026.7.2 base; do not port.                                                                                                   |
| `-`  | `6204a6feccb9` | fix(update): authenticate restart health probes                                      | already-upstream   | Patch-id equivalent exists in the 2026.7.2 base; do not port.                                                                                                   |
| `+`  | `997f8af73491` | fix(whatsapp): normalize onboarding allowlist numbers                                | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `-`  | `ade922ba9876` | fix(telegram): reuse preview for long text finals (#77658)                           | already-upstream   | Patch-id equivalent exists in the 2026.7.2 base; do not port.                                                                                                   |
| `-`  | `30b73bbf41cc` | fix(plugins): honor beta channel for auto installs                                   | already-upstream   | Patch-id equivalent exists in the 2026.7.2 base; do not port.                                                                                                   |
| `+`  | `578d9072cf0c` | test: align beta plugin repair expectations                                          | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `-`  | `8017dc4c3bda` | fix(gateway): skip IPv6 loopback binding on Windows (#69701)                         | already-upstream   | Patch-id equivalent exists in the 2026.7.2 base; do not port.                                                                                                   |
| `-`  | `8f6bf65162b9` | fix(agents): enforce exact skill path from <available_skills> [AI-assisted] (#74161) | already-upstream   | Patch-id equivalent exists in the 2026.7.2 base; do not port.                                                                                                   |
| `-`  | `b73317c217bb` | fix(sandbox): support Windows drive-letter bind sources                              | already-upstream   | Patch-id equivalent exists in the 2026.7.2 base; do not port.                                                                                                   |
| `+`  | `5fcdeae80c56` | chore(release): bump to 2026.5.4-beta.3                                              | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `303ff716d435` | chore(release): refresh plugin SDK API baseline                                      | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `41f028e2ea3b` | fix(diagnostics): drop stale session recovery event cases                            | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `-`  | `2fc80754cf4f` | ci: parallelize release publish workflows                                            | already-upstream   | Patch-id equivalent exists in the 2026.7.2 base; do not port.                                                                                                   |
| `+`  | `325df3efefe9` | chore(release): bump to 2026.5.4                                                     | drop/release-train | Old upstream release-train/backport/CI/test/doc noise; new clean 2026.7.2 base supersedes this unless a focused regression proves otherwise.                    |
| `+`  | `992c731bfe60` | feat(hooks): add coordination.md bootstrap hook                                      | rework/decide      | Keep need only if standard bootstrap files cannot replace COORDINATION.md; avoid core hook unless cross-runtime/subagent proof passes.                          |
| `+`  | `38bb133fa377` | feat(prompt): add system prompt customization engine                                 | defer/drop         | Old Prompt Studio/systemPromptOverride architecture conflicts with 2026.7.2 prompt surfaces and removed config keys; Prompt Studio v2 requires separate design. |
| `+`  | `8d554a72faa1` | feat(prompt): add system prompt preview endpoint                                     | defer/drop         | Old Prompt Studio/systemPromptOverride architecture conflicts with 2026.7.2 prompt surfaces and removed config keys; Prompt Studio v2 requires separate design. |
| `+`  | `dbfddb9a90e3` | feat(ui): add LibreClaw prompt studio                                                | defer/drop         | Old Prompt Studio/systemPromptOverride architecture conflicts with 2026.7.2 prompt surfaces and removed config keys; Prompt Studio v2 requires separate design. |
| `+`  | `8108ff083694` | docs(prompt): document Prompt Studio customization                                   | defer/drop         | Old Prompt Studio/systemPromptOverride architecture conflicts with 2026.7.2 prompt surfaces and removed config keys; Prompt Studio v2 requires separate design. |
| `+`  | `33b8a4529266` | docs: document LibreClaw downstream features                                         | rework-later       | Docs/branding only after carried features are final; preserve OpenClaw package/config/update identity.                                                          |
| `+`  | `d7700fdc8d0a` | feat(skills): add creature catalog workflow                                          | keep/rework        | Keep intent, but reimplement as portable managed/workspace skill after validating simulated.site contract; do not blindly copy hard-coded paths.                |
| `+`  | `f04beebf328e` | docs: refresh LibreClaw 2026.5.4 notes                                               | rework-later       | Docs/branding only after carried features are final; preserve OpenClaw package/config/update identity.                                                          |
| `+`  | `26e54c9cf5e9` | fix(prompt): include safety style in cache key                                       | defer/drop         | Old Prompt Studio/systemPromptOverride architecture conflicts with 2026.7.2 prompt surfaces and removed config keys; Prompt Studio v2 requires separate design. |
| `+`  | `e1311112ceef` | fix(prompt-studio): align with 2026.5.4 API types                                    | defer/drop         | Old Prompt Studio/systemPromptOverride architecture conflicts with 2026.7.2 prompt surfaces and removed config keys; Prompt Studio v2 requires separate design. |
| `+`  | `0affcc6ad160` | fix(cli): deliver streamed assistant deltas to channels                              | keep/rework        | Reworked direct visible channel delivery for current CLI assistant events; do not cherry-pick old `onAssistantDelta` API shape.                                 |
| `+`  | `38930f3af14f` | chore: roll forward LibreClaw to OpenClaw 2026.5.28                                  | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `25202be4aac6` | chore: roll forward LibreClaw to OpenClaw 2026.6.9                                   | drop-or-prove      | Likely upstream/backport bugfix from old train; only port if targeted current-base test demonstrates gap.                                                       |
| `+`  | `d2c0468bb5ee` | fix(ui): expose LibreClaw prompt studio in sidebar                                   | defer/drop         | Old Prompt Studio/systemPromptOverride architecture conflicts with 2026.7.2 prompt surfaces and removed config keys; Prompt Studio v2 requires separate design. |
| `+`  | `12a04caac0f7` | fix(libreclaw): expose removable prompt sections                                     | defer/drop         | Old Prompt Studio/systemPromptOverride architecture conflicts with 2026.7.2 prompt surfaces and removed config keys; Prompt Studio v2 requires separate design. |
| `+`  | `dbe286ede88e` | docs: refresh LibreClaw runtime notes                                                | rework-later       | Docs/branding only after carried features are final; preserve OpenClaw package/config/update identity.                                                          |
| `+`  | `0ab1dafc29db` | fix(heartbeat): include generic wake events in prompt                                | prove-before-port  | Generic wake/system-event prompt behavior; inspect current upstream heartbeat/wake path before deciding. Do not assume needed.                                  |
| `+`  | `ddaa14a24ce5` | docs: clarify workflow loop scaffolding                                              | drop/product       | Workflow-loop procedure docs live in external/private skill/reference repos, not product core.                                                                  |
| `+`  | `54eaca476a25` | docs: note workflow result ignore exceptions                                         | drop/product       | Workflow-loop procedure docs live in external/private skill/reference repos, not product core.                                                                  |
| `+`  | `6f5bee599f0e` | docs: distinguish workflow summaries from raw results                                | drop/product       | Workflow-loop procedure docs live in external/private skill/reference repos, not product core.                                                                  |
| `+`  | `46716897dee2` | docs: treat workflow PR sentinels as missing                                         | drop/product       | Workflow-loop procedure docs live in external/private skill/reference repos, not product core.                                                                  |
| `+`  | `260faecd16f8` | docs: sync workflow ledger before tracking                                           | drop/product       | Workflow-loop procedure docs live in external/private skill/reference repos, not product core.                                                                  |
| `+`  | `f63df0ead069` | docs: keep workflow ledger paths relative                                            | drop/product       | Workflow-loop procedure docs live in external/private skill/reference repos, not product core.                                                                  |
| `+`  | `dc823067284f` | docs: clarify workflow ledger commit semantics                                       | drop/product       | Workflow-loop procedure docs live in external/private skill/reference repos, not product core.                                                                  |
| `+`  | `af9f6b9c6368` | docs: add workflow loop final doc sweep                                              | drop/product       | Workflow-loop procedure docs live in external/private skill/reference repos, not product core.                                                                  |
| `+`  | `4bfda454b705` | docs: add bounded workflow self-recovery                                             | drop/product       | Workflow-loop procedure docs live in external/private skill/reference repos, not product core.                                                                  |
| `+`  | `10d07d6eb941` | docs: document workflow review sandbox fallback                                      | drop/product       | Workflow-loop procedure docs live in external/private skill/reference repos, not product core.                                                                  |

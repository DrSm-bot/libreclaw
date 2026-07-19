---
name: creature-catalog
description: Add/update AxonArcade simulated.site creature entries, canon notes, artwork provenance, and review PRs.
metadata: { "openclaw": { "emoji": "🐾", "requires": { "bins": ["git", "node"] } } }
---

# AxonArcade Creature Catalog

Use this skill when someone wants to add, update, validate, or propose an entry in the AxonArcade creature catalog on `simulated.site`.

## Bundling note

This is a LibreClaw downstream-owned AxonArcade skill. Do not propose it as an upstream OpenClaw bundled skill. For non-LibreClaw distribution, publish or install it through ClawHub/a managed skill path instead of adding it to core.

## Repository resolution

Do not assume a hard-coded checkout. Resolve the catalog repo in this order:

1. `CREATURE_CATALOG_REPO`, if set.
2. The current working directory, if it contains `creatures/schema.json` and `scripts/update-creature-catalog.js`.
3. Common local checkouts that exist and match the same contract:
   - `$HOME/repos/simulated.site`
   - `$HOME/projects/simulated.site`

Use this shell helper when acting from an arbitrary workspace:

```bash
repo="${CREATURE_CATALOG_REPO:-}"
if [ -z "$repo" ]; then
  for candidate in "$PWD" "$HOME/repos/simulated.site" "$HOME/projects/simulated.site"; do
    if [ -f "$candidate/creatures/schema.json" ] && [ -f "$candidate/scripts/update-creature-catalog.js" ]; then
      repo="$candidate"
      break
    fi
  done
fi
if [ -z "$repo" ]; then
  echo "creature catalog repo not found; set CREATURE_CATALOG_REPO" >&2
  exit 1
fi
cd "$repo"
```

Before editing, verify `git status --short --branch` and avoid trampling unrelated user changes.

## Catalog contract

- Entry files: `creatures/entries/<id>.json`
- Entry id pattern: lowercase kebab case, matching the filename without `.json`
- Schema: `creatures/schema.json`
- Generated manifest: `creatures/index.json`
- Public catalog page: `creatures/index.html`

Required entry fields, per `creatures/schema.json`:

- `id`
- `name`
- `archetype`
- `first_sighting` with `date`, `location`, and `summary`
- `temperament`
- `known_behaviors`
- `containment_notes`
- `lore_deductions`
- `canon_status`

Minimal valid example:

```json
{
  "id": "goblin",
  "name": "Goblin",
  "archetype": "chaos archivist / workshop cryptid",
  "first_sighting": {
    "date": "2026-04-29",
    "location": "AxonArcade #secret-lab",
    "summary": "Discussed as a possible future creature for the AxonArcade catalog."
  },
  "temperament": "Inventive, opportunistic, side-quest prone.",
  "known_behaviors": ["Improves documents by damaging their dignity."],
  "containment_notes": ["Provide sandbox, snacks, and no production credentials."],
  "lore_deductions": ["Likely to classify incidents as side quests."],
  "canon_status": "rumor"
}
```

Optional fields supported by the current schema:

- `associated_agent_or_channel`: public channel, approved handle, or agent/creature association
- `image`: public image path or URL
- `image_alt`: required when `image` is present
- `artifacts[]`: objects with `type` (`quote`, `image`, `incident`, `link`, or `note`), `label`, and optional `url`/`text`

## Workflow

1. Gather enough information for a conservative entry. If important details are unknown, use `canon_status: "rumor"` and put uncertainty in `lore_deductions`.
2. Create or edit `creatures/entries/<id>.json`.
3. Regenerate the creature manifest:
   ```bash
   node scripts/update-creature-catalog.js
   ```
4. Run `node scripts/update-manifests.js` only when the change also affects site-wide manifests/sitemap inputs, or when the repo README/scripts explicitly require a full manifest refresh.
5. Inspect `git diff` and verify generated changes are limited to the intended entry plus expected manifests.
6. Do not branch, commit, push, open a PR, or publish externally unless the user explicitly asks. When publication is requested, the PR is the canon gate.

## Canon status

- `rumor`: proposed, uncertain, or not yet reviewed
- `observed`: appeared in chat/logs/artifacts
- `adopted`: accepted into site lore
- `family`: recurring AxonArcade identity, mascot, or agent-adjacent creature

## Safety / privacy

- Do not include private human names, private channel content, credentials, or sensitive operational details in public entries.
- Prefer public channel labels, usernames/handles approved for public use, and short provenance summaries.
- Do not fabricate citations. If provenance is incomplete, state the uncertainty plainly.
- For artwork, record provenance in `artifacts` when available and include meaningful `image_alt` text.

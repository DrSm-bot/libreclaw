# LibreClaw Update Checklist (v2026.2.25)

## Lessons learned

- Before any rebase/cherry-pick migration, enumerate **all local commits** on the source branch:
  - `git log --oneline <upstream-tag>..main`
- Cross-check that list against `patches/README.md` and resolve mismatches **before** execution.
- Treat undocumented UI/Prompt Studio features as high-risk drift areas; verify these paths explicitly:
  - `ui/src/ui/views/libreclaw.ts`
  - `ui/src/ui/navigation.ts`
  - `ui/src/i18n/locales/*.ts`
  - safety style config + preview forwarding
- Add a post-port verification gate: ensure `libreclaw` tab exists in navigation + locale keys before declaring update complete.

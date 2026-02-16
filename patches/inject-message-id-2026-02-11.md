# Patch: Inject Message ID into Trusted Inbound Metadata

Date: 2026-02-11
Author: Codex 🐦‍⬛

## Summary
Adds a guarded config toggle to inject the current message id into the **trusted** inbound metadata block. Default is **off**.

**Config:** `messages.inbound.injectMessageId: boolean` (default: false)

When enabled, the inbound trusted metadata JSON includes:
```json
"message_id": "<current message id>"
```

## Rationale
Agents need Discord message IDs for reactions. Prompt-level ID hints were removed for security (prompt injection). This patch reintroduces IDs only in the trusted metadata block, gated by config.

## Files touched
- `src/auto-reply/reply/inbound-meta.ts`
- `src/auto-reply/reply/get-reply-run.ts`
- `src/auto-reply/reply.raw-body.test.ts`
- `src/config/types.messages.ts`
- `src/config/zod-schema.core.ts`
- `src/config/schema.ts`
- `src/config/schema.field-metadata.ts`

## Tests
- Added unit test in `reply.raw-body.test.ts` for `messages.inbound.injectMessageId=true`.

## Notes
- IDs are **not** injected into user-role context.
- No behavior change unless the toggle is enabled.

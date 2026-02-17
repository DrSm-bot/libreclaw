import { html, nothing } from "lit";
import type { GatewayHelloOk } from "../gateway.ts";

const SYSTEM_PROMPT_SECTION_IDS_FALLBACK = [
  "tooling",
  "tool_call_style",
  "safety",
  "openclaw_cli_quick_reference",
  "skills",
  "memory_recall",
  "openclaw_self_update",
  "model_aliases",
  "workspace",
  "documentation",
  "sandbox",
  "user_identity",
  "current_date_time",
  "workspace_files_injected",
  "reply_tags",
  "messaging",
  "voice_tts",
  "group_chat_context",
  "subagent_context",
  "reactions",
  "reasoning_format",
  "project_context",
  "silent_replies",
  "heartbeats",
  "runtime",
] as const;

type SystemPromptMode = "default" | "customize" | "replace";

type LibreClawProps = {
  connected: boolean;
  hello: GatewayHelloOk | null;
  configForm: Record<string, unknown> | null;
  configSnapshot: { config?: Record<string, unknown> } | null;
  configSchema: unknown;
  configFormMode: "form" | "raw";
  configFormDirty: boolean;
  configLoading: boolean;
  configSaving: boolean;
  configApplying: boolean;
  systemPromptPreview: string;
  systemPromptPreviewLoading: boolean;
  systemPromptPreviewError: string | null;
  onReload: () => void;
  onSave: () => void;
  onApply: () => void;
  onPatch: (path: Array<string | number>, value: unknown) => void;
};

function pickVersion(snapshot: Record<string, unknown> | undefined): string {
  if (!snapshot || typeof snapshot !== "object") {
    return "unknown";
  }
  const direct = ["version", "appVersion", "gatewayVersion"]
    .map((k) => snapshot[k])
    .find((v) => typeof v === "string" && v.trim().length > 0) as string | undefined;
  if (direct) {
    return direct;
  }
  const status = snapshot.status;
  if (status && typeof status === "object") {
    const statusVersion = (status as Record<string, unknown>).version;
    if (typeof statusVersion === "string" && statusVersion.trim().length > 0) {
      return statusVersion;
    }
  }
  return "unknown";
}

function estimateTokens(text: string): number {
  return Math.round(text.length / 4);
}

function readSystemPromptConfig(props: LibreClawProps): Record<string, unknown> {
  const root = props.configForm ?? props.configSnapshot?.config ?? {};
  const agents =
    root.agents && typeof root.agents === "object" ? (root.agents as Record<string, unknown>) : {};
  const defaults =
    agents.defaults && typeof agents.defaults === "object"
      ? (agents.defaults as Record<string, unknown>)
      : {};
  const systemPrompt =
    defaults.systemPrompt && typeof defaults.systemPrompt === "object"
      ? (defaults.systemPrompt as Record<string, unknown>)
      : {};
  return systemPrompt;
}

function readSectionOptions(schema: unknown): string[] {
  const cfg = schema && typeof schema === "object" ? (schema as Record<string, unknown>) : {};
  const properties =
    cfg.properties && typeof cfg.properties === "object"
      ? (cfg.properties as Record<string, unknown>)
      : {};
  const agents =
    properties.agents && typeof properties.agents === "object"
      ? (properties.agents as Record<string, unknown>)
      : {};
  const defaults =
    agents.properties && typeof agents.properties === "object"
      ? ((agents.properties as Record<string, unknown>).defaults as
          | Record<string, unknown>
          | undefined)
      : undefined;
  const systemPrompt =
    defaults?.properties && typeof defaults.properties === "object"
      ? ((defaults.properties as Record<string, unknown>).systemPrompt as
          | Record<string, unknown>
          | undefined)
      : undefined;
  const removeSections =
    systemPrompt?.properties && typeof systemPrompt.properties === "object"
      ? ((systemPrompt.properties as Record<string, unknown>).removeSections as
          | Record<string, unknown>
          | undefined)
      : undefined;
  const items =
    removeSections?.items && typeof removeSections.items === "object"
      ? (removeSections.items as Record<string, unknown>)
      : undefined;
  const sectionEnum = items?.enum;

  if (Array.isArray(sectionEnum)) {
    const values = sectionEnum.filter((entry): entry is string => typeof entry === "string");
    if (values.length > 0) {
      return values;
    }
  }
  return [...SYSTEM_PROMPT_SECTION_IDS_FALLBACK];
}

function resolveEditorMode(systemPrompt: Record<string, unknown>): SystemPromptMode {
  if (systemPrompt.mode === "replace") {
    return "replace";
  }
  const prepend = typeof systemPrompt.prepend === "string" ? systemPrompt.prepend.trim() : "";
  const append = typeof systemPrompt.append === "string" ? systemPrompt.append.trim() : "";
  const removeSections = Array.isArray(systemPrompt.removeSections)
    ? systemPrompt.removeSections.filter((entry): entry is string => typeof entry === "string")
    : [];
  if (prepend || append || removeSections.length > 0) {
    return "customize";
  }
  return "default";
}

export function renderLibreClaw(props: LibreClawProps) {
  const snapshot = props.hello?.snapshot as Record<string, unknown> | undefined;
  const version = pickVersion(snapshot);
  const systemPrompt = readSystemPromptConfig(props);
  const mode = resolveEditorMode(systemPrompt);
  const prepend = typeof systemPrompt.prepend === "string" ? systemPrompt.prepend : "";
  const append = typeof systemPrompt.append === "string" ? systemPrompt.append : "";
  const removeSections = Array.isArray(systemPrompt.removeSections)
    ? systemPrompt.removeSections.filter((entry): entry is string => typeof entry === "string")
    : [];
  const sections = readSectionOptions(props.configSchema);
  const configReady = Boolean(props.configSnapshot);
  const rawMode = props.configFormMode === "raw";
  const editorDisabled = !configReady || rawMode;
  const canSave =
    configReady && props.configFormDirty && !props.configLoading && !props.configSaving;
  const canApply =
    configReady &&
    props.configFormDirty &&
    !props.configLoading &&
    !props.configSaving &&
    !props.configApplying;

  const modePath: Array<string | number> = ["agents", "defaults", "systemPrompt", "mode"];
  const prependPath: Array<string | number> = ["agents", "defaults", "systemPrompt", "prepend"];
  const appendPath: Array<string | number> = ["agents", "defaults", "systemPrompt", "append"];
  const removeSectionsPath: Array<string | number> = [
    "agents",
    "defaults",
    "systemPrompt",
    "removeSections",
  ];

  return html`
    <section class="grid grid-cols-2">
      <div class="card">
        <div class="card-title">LibreClaw</div>
        <div class="card-sub">Community fork focused on freedom, customization, and transparency.</div>
        <div class="stat-grid" style="margin-top: 16px;">
          <div class="stat">
            <div class="stat-label">Gateway Connection</div>
            <div class="stat-value ${props.connected ? "ok" : "warn"}">
              ${props.connected ? "Connected" : "Disconnected"}
            </div>
          </div>
          <div class="stat">
            <div class="stat-label">Version</div>
            <div class="stat-value">${version}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">About</div>
        <div class="card-sub">Canonical links for source, docs, and community.</div>
        <div class="note-grid" style="margin-top: 14px;">
          <div>
            <div class="note-title">GitHub</div>
            <a class="session-link" href="https://github.com/DrSm-bot/libreclaw" target="_blank" rel="noreferrer"
              >github.com/DrSm-bot/libreclaw</a
            >
          </div>
          <div>
            <div class="note-title">Docs</div>
            <a class="session-link" href="https://docs.openclaw.ai" target="_blank" rel="noreferrer"
              >docs.openclaw.ai</a
            >
          </div>
          <div>
            <div class="note-title">Community</div>
            <a class="session-link" href="https://discord.com/invite/clawd" target="_blank" rel="noreferrer"
              >discord.gg/clawd</a
            >
          </div>
        </div>
      </div>
    </section>

    <section class="card" style="margin-top: 18px;">
      <div class="card-title">System Prompt Studio</div>
      <div class="card-sub">Editor + live preview for agents.defaults.systemPrompt.</div>
      <div class="cfg-actions" style="margin-top: 12px;">
        <button class="btn" type="button" ?disabled=${props.configLoading} @click=${props.onReload}>
          ${props.configLoading ? "Loading…" : "Reload"}
        </button>
        <button class="btn primary" type="button" ?disabled=${!canSave} @click=${props.onSave}>
          ${props.configSaving ? "Saving…" : "Save"}
        </button>
        <button class="btn ghost" type="button" ?disabled=${!canApply} @click=${props.onApply}>
          ${props.configApplying ? "Applying…" : "Apply"}
        </button>
      </div>

      <div class="grid grid-cols-2" style="margin-top: 14px; gap: 16px; align-items: start;">
        <section class="card" style="margin: 0;">
          <div class="card-title" style="font-size: 14px;">Editor</div>

          ${
            !configReady
              ? html`
                  <div class="muted" style="margin-top: 8px">Loading config…</div>
                `
              : nothing
          }
          ${
            rawMode
              ? html`
                  <div class="callout warn" style="margin-top: 8px">
                    Raw mode is active in Config. Prompt Studio edits are disabled until you switch back to Form mode.
                  </div>
                `
              : nothing
          }

          <div class="cfg-field" style="margin-top: 10px;">
            <label class="cfg-field__label">Mode</label>
            <div class="cfg-segmented">
              <button
                type="button"
                class="cfg-segmented__btn ${mode === "default" ? "active" : ""}"
                ?disabled=${editorDisabled}
                @click=${() => {
                  props.onPatch(modePath, "default");
                  props.onPatch(prependPath, "");
                  props.onPatch(appendPath, "");
                  props.onPatch(removeSectionsPath, []);
                }}
              >
                Default
              </button>
              <button
                type="button"
                class="cfg-segmented__btn ${mode === "customize" ? "active" : ""}"
                ?disabled=${editorDisabled}
                @click=${() => props.onPatch(modePath, "default")}
              >
                Customize
              </button>
              <button
                type="button"
                class="cfg-segmented__btn ${mode === "replace" ? "active" : ""}"
                ?disabled=${editorDisabled}
                @click=${() => {
                  props.onPatch(modePath, "replace");
                  props.onPatch(["agents", "defaults", "systemPrompt", "allowUnsafeReplace"], true);
                }}
              >
                Replace
              </button>
            </div>
          </div>

          <div class="cfg-field" style="margin-top: 10px;">
            <label class="cfg-field__label">Prepend</label>
            <textarea
              class="cfg-textarea cfg-textarea--prompt"
              rows="7"
              .value=${prepend}
              ?disabled=${editorDisabled}
              placeholder="Optional text prepended to the generated system prompt"
              @input=${(e: Event) =>
                props.onPatch(prependPath, (e.target as HTMLTextAreaElement).value)}
            ></textarea>
          </div>

          <div class="cfg-field" style="margin-top: 10px;">
            <label class="cfg-field__label">Append</label>
            <textarea
              class="cfg-textarea cfg-textarea--prompt"
              rows="7"
              .value=${append}
              ?disabled=${editorDisabled}
              placeholder="Optional text appended to the generated system prompt"
              @input=${(e: Event) => props.onPatch(appendPath, (e.target as HTMLTextAreaElement).value)}
            ></textarea>
          </div>

          <div class="cfg-field" style="margin-top: 10px;">
            <label class="cfg-field__label">Remove Sections</label>
            <div class="cfg-check-grid">
              ${sections.map((sectionId) => {
                const selected = removeSections.includes(sectionId);
                return html`
                  <label class="cfg-check-grid__item ${selected ? "active" : ""}">
                    <input
                      type="checkbox"
                      .checked=${selected}
                      ?disabled=${editorDisabled}
                      @change=${(e: Event) => {
                        const checked = (e.target as HTMLInputElement).checked;
                        const next = checked
                          ? [...removeSections, sectionId]
                          : removeSections.filter((entry) => entry !== sectionId);
                        props.onPatch(removeSectionsPath, next);
                      }}
                    />
                    <span class="cfg-check-grid__label">${sectionId}</span>
                  </label>
                `;
              })}
            </div>
          </div>
        </section>

        <section class="card" style="margin: 0;">
          <div style="display: flex; justify-content: space-between; gap: 12px; align-items: baseline;">
            <div class="card-title" style="font-size: 14px;">Live Preview</div>
            <div class="muted">~${estimateTokens(props.systemPromptPreview)} tokens estimate</div>
          </div>
          <div class="card-sub">Debounced updates (300ms) from /api/system-prompt/preview.</div>

          ${
            props.systemPromptPreviewLoading
              ? html`
                  <div class="muted" style="margin-top: 10px">Refreshing…</div>
                `
              : nothing
          }

          ${
            props.systemPromptPreviewError
              ? html`<div class="callout danger" style="margin-top: 10px;">${props.systemPromptPreviewError}</div>`
              : html`<pre class="code-block" style="margin-top: 10px; max-height: 620px; overflow: auto;">${
                  props.systemPromptPreview || "Preview unavailable."
                }</pre>`
          }
        </section>
      </div>
    </section>
  `;
}

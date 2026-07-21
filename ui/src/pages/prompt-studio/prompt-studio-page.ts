import { consume } from "@lit/context";
import { html, LitElement, nothing, type TemplateResult } from "lit";
import { state } from "lit/decorators.js";
import { titleForRoute } from "../../app-navigation.ts";
import { applicationContext, type ApplicationContext } from "../../app/context.ts";
import { resolveControlUiAuthCandidates } from "../../app/control-ui-auth.ts";
import { renderSettingsWorkspace } from "../../components/settings-workspace.ts";
import { t } from "../../i18n/index.ts";
import { currentConfigObject } from "../../lib/config/index.ts";

const OPENCLAW_OVERLAY_PATH = ["agents", "defaults", "promptOverlays", "openclaw"] as const;

const CUSTOM_INSTRUCTIONS_PATH = [...OPENCLAW_OVERLAY_PATH, "customInstructions"] as const;
const OPENCLAW_OVERLAY_ENABLED_PATH = [...OPENCLAW_OVERLAY_PATH, "enabled"] as const;
const PREPEND_PATH = [...OPENCLAW_OVERLAY_PATH, "prepend"] as const;
const APPEND_PATH = [...OPENCLAW_OVERLAY_PATH, "append"] as const;
const REMOVE_SECTIONS_PATH = [...OPENCLAW_OVERLAY_PATH, "removeSections"] as const;
const SAFETY_STYLE_PATH = [...OPENCLAW_OVERLAY_PATH, "safetyStyle"] as const;

const PROMPT_STUDIO_SECTION_IDS = [
  "tooling",
  "subagent_delegation",
  "interaction_style",
  "tool_call_style",
  "execution_bias",
  "safety",
  "openclaw_control",
  "skills",
  "skill_workshop",
  "memory_recall",
  "openclaw_self_update",
  "model_aliases",
  "workspace",
  "documentation",
  "sandbox",
  "workspace_files_injected",
  "reasoning_format",
  "assistant_output_directives",
  "control_ui_embed",
  "project_context",
  "dynamic_project_context",
  "silent_replies",
  "group_chat_context",
  "subagent_context",
  "reactions",
  "runtime",
  "heartbeats",
  "authorized_senders",
  "current_date_time",
  "voice_tts",
  "bootstrap_pending",
  "bootstrap_context_notice",
] as const;

type PromptStudioSectionId = (typeof PROMPT_STUDIO_SECTION_IDS)[number];
type PromptStudioSafetyStyle = "openclaw" | "libreclaw";

type PromptStudioOverlay = {
  enabled: boolean;
  safetyStyle: PromptStudioSafetyStyle;
  customInstructions: string;
  prepend: string;
  append: string;
  removeSections: PromptStudioSectionId[];
};

type PromptPreviewState = {
  prompt: string;
  loading: boolean;
  error: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readRemoveSections(value: unknown): PromptStudioSectionId[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const allowed = new Set<string>(PROMPT_STUDIO_SECTION_IDS);
  return [
    ...new Set(
      value.filter((entry): entry is PromptStudioSectionId => {
        return typeof entry === "string" && allowed.has(entry);
      }),
    ),
  ];
}

function readOpenClawOverlay(config: Record<string, unknown> | null): PromptStudioOverlay {
  const agents = asRecord(config?.agents);
  const defaults = asRecord(agents?.defaults);
  const promptOverlays = asRecord(defaults?.promptOverlays);
  const openclaw = asRecord(promptOverlays?.openclaw);
  const safetyStyle = openclaw?.safetyStyle;
  const enabled = openclaw?.enabled;
  return {
    enabled: enabled !== false,
    safetyStyle: safetyStyle === "libreclaw" ? "libreclaw" : "openclaw",
    customInstructions: readString(openclaw?.customInstructions),
    prepend: readString(openclaw?.prepend),
    append: readString(openclaw?.append),
    removeSections: readRemoveSections(openclaw?.removeSections),
  };
}

function overlayPayload(overlay: PromptStudioOverlay) {
  return {
    enabled: overlay.enabled,
    safetyStyle: overlay.safetyStyle,
    customInstructions: overlay.customInstructions,
    prepend: overlay.prepend,
    append: overlay.append,
    removeSections: overlay.removeSections,
  };
}

function formatSectionLabel(sectionId: string): string {
  return sectionId
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function estimateTokens(text: string): number {
  return Math.max(0, Math.ceil(text.length / 4));
}

function normalizeErrorMessage(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (value && typeof value === "object" && "message" in value) {
    const message = (value as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }
  return "System prompt preview failed.";
}

function renderStatus(kind: "ok" | "warn" | "danger" | "muted", label: string): TemplateResult {
  return html`<span class="prompt-studio-status prompt-studio-status--${kind}">
    <span class="prompt-studio-status__dot"></span>${label}
  </span>`;
}

function renderSection(
  props: { title: string; description: string; actions?: TemplateResult },
  rows: unknown,
) {
  return html`
    <section class="prompt-studio-section card">
      <div class="prompt-studio-section__header">
        <div>
          <h2>${props.title}</h2>
          <p>${props.description}</p>
        </div>
        ${props.actions
          ? html`<div class="prompt-studio-section__actions">${props.actions}</div>`
          : nothing}
      </div>
      <div class="prompt-studio-section__rows">${rows}</div>
    </section>
  `;
}

function renderRow(props: {
  title: string;
  description?: unknown;
  control?: unknown;
  stacked?: boolean;
}) {
  return html`
    <div class="prompt-studio-row ${props.stacked ? "prompt-studio-row--stacked" : ""}">
      <div class="prompt-studio-row__text">
        <span class="prompt-studio-row__title">${props.title}</span>
        ${props.description
          ? html`<span class="prompt-studio-row__desc">${props.description}</span>`
          : nothing}
      </div>
      ${props.control
        ? html`<div class="prompt-studio-row__control">${props.control}</div>`
        : nothing}
    </div>
  `;
}

class PromptStudioPage extends LitElement {
  @consume({ context: applicationContext, subscribe: true })
  private context!: ApplicationContext;

  @state() private actionError: string | null = null;
  @state() private preview: PromptPreviewState = { prompt: "", loading: false, error: null };

  private stopRuntimeConfigSubscription?: () => void;
  private previewTimer: ReturnType<typeof setTimeout> | undefined;
  private previewRequestVersion = 0;

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    void this.context?.runtimeConfig.ensureLoaded().then(() => this.queuePreviewRefresh(0));
    this.stopRuntimeConfigSubscription = this.context?.runtimeConfig.subscribe(() => {
      this.requestUpdate();
      this.queuePreviewRefresh();
    });
  }

  override disconnectedCallback() {
    this.stopRuntimeConfigSubscription?.();
    this.stopRuntimeConfigSubscription = undefined;
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
      this.previewTimer = undefined;
    }
    super.disconnectedCallback();
  }

  private canEdit(): boolean {
    const configState = this.context?.runtimeConfig.state;
    return Boolean(
      configState?.connected &&
      (configState.configForm || configState.configSnapshot) &&
      !configState.configLoading &&
      !configState.configSaving &&
      !configState.configApplying,
    );
  }

  private currentOverlay(): PromptStudioOverlay {
    const stateLocal = this.context?.runtimeConfig.state;
    return readOpenClawOverlay(stateLocal ? currentConfigObject(stateLocal) : null);
  }

  private patchOverlayField(path: readonly string[], value: unknown) {
    if (!this.canEdit()) {
      return;
    }
    this.actionError = null;
    this.context.runtimeConfig.patchForm([...path], value);
  }

  private setCustomInstructions(value: string) {
    this.patchOverlayField(CUSTOM_INSTRUCTIONS_PATH, value);
  }

  private setPrepend(value: string) {
    this.patchOverlayField(PREPEND_PATH, value);
  }

  private setAppend(value: string) {
    this.patchOverlayField(APPEND_PATH, value);
  }

  private setSafetyStyle(value: PromptStudioSafetyStyle) {
    this.patchOverlayField(SAFETY_STYLE_PATH, value);
  }

  private setOverlayEnabled(enabled: boolean) {
    this.patchOverlayField(OPENCLAW_OVERLAY_ENABLED_PATH, enabled);
  }

  private toggleRemoveSection(sectionId: PromptStudioSectionId, checked: boolean) {
    if (!this.canEdit()) {
      return;
    }
    const overlay = this.currentOverlay();
    const next = checked
      ? [...new Set([...overlay.removeSections, sectionId])]
      : overlay.removeSections.filter((entry) => entry !== sectionId);
    this.patchOverlayField(REMOVE_SECTIONS_PATH, next);
  }

  private clearCustomInstructions() {
    if (!this.canEdit()) {
      return;
    }
    this.actionError = null;
    this.context.runtimeConfig.removeFormValue([...CUSTOM_INSTRUCTIONS_PATH]);
  }

  private async save() {
    if (!this.canEdit()) {
      return;
    }
    this.actionError = null;
    const saved = await this.context.runtimeConfig.save();
    if (!saved) {
      this.actionError =
        this.context.runtimeConfig.state.lastError ?? t("promptStudio.status.error");
    }
  }

  private async apply() {
    if (!this.canEdit()) {
      return;
    }
    this.actionError = null;
    const applied = await this.context.runtimeConfig.apply();
    if (!applied) {
      this.actionError =
        this.context.runtimeConfig.state.lastError ?? t("promptStudio.status.error");
    }
  }

  private async reload() {
    this.actionError = null;
    await this.context.runtimeConfig.refresh({ discardPendingChanges: true });
  }

  private queuePreviewRefresh(delayMs = 300) {
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
    }
    this.previewTimer = setTimeout(() => {
      this.previewTimer = undefined;
      void this.refreshPreview();
    }, delayMs);
  }

  private async refreshPreview() {
    if (typeof fetch !== "function") {
      return;
    }
    const overlay = this.currentOverlay();
    const basePath = this.context?.basePath ?? "";
    const url = basePath ? `${basePath}/api/system-prompt/preview` : "/api/system-prompt/preview";
    const candidates = resolveControlUiAuthCandidates({
      hello: this.context?.gateway?.snapshot?.hello,
      settings: { token: this.context?.gateway?.connection?.token },
      password: this.context?.gateway?.connection?.password,
    });
    const attempts = candidates.length > 0 ? candidates : [""];
    const version = ++this.previewRequestVersion;
    this.preview = { ...this.preview, loading: true, error: null };
    try {
      let response: Response | null = null;
      for (const candidate of attempts) {
        const headers: Record<string, string> = {
          Accept: "application/json",
          "Content-Type": "application/json",
        };
        if (candidate) {
          headers.Authorization = `Bearer ${candidate}`;
        }
        response = await fetch(url, {
          method: "POST",
          headers,
          credentials: "same-origin",
          body: JSON.stringify({ promptOverlay: overlayPayload(overlay) }),
        });
        if (response.ok || (response.status !== 401 && response.status !== 403)) {
          break;
        }
      }
      if (!response) {
        throw new Error("System prompt preview failed.");
      }
      let parsed: { ok?: boolean; prompt?: unknown; error?: unknown } | null = null;
      try {
        parsed = (await response.json()) as { ok?: boolean; prompt?: unknown; error?: unknown };
      } catch {
        parsed = null;
      }
      if (!response.ok || parsed?.ok === false) {
        throw new Error(normalizeErrorMessage(parsed?.error ?? response.statusText));
      }
      if (version === this.previewRequestVersion) {
        this.preview = {
          prompt: typeof parsed?.prompt === "string" ? parsed.prompt : "",
          loading: false,
          error: null,
        };
      }
    } catch (err) {
      if (version === this.previewRequestVersion) {
        this.preview = { ...this.preview, loading: false, error: String(err) };
      }
    }
  }

  private renderPreview() {
    const actions = html`
      <button class="btn btn--sm" type="button" @click=${() => void this.refreshPreview()}>
        Refresh preview
      </button>
    `;
    return renderSection(
      {
        title: "Full system prompt preview",
        description:
          "Rendered by the Gateway from the current Prompt Studio draft. Unsaved edits are reflected before Apply.",
        actions,
      },
      html`
        ${renderRow({
          title: "Preview status",
          description: this.preview.error
            ? html`<span role="alert">${this.preview.error}</span>`
            : nothing,
          control: this.preview.loading
            ? renderStatus("warn", "Refreshing…")
            : this.preview.error
              ? renderStatus("danger", "Preview failed")
              : renderStatus("ok", `${estimateTokens(this.preview.prompt)} tokens estimate`),
        })}
        ${renderRow({
          title: "Composed prompt",
          stacked: true,
          control: html`<pre class="prompt-studio-preview" dir="auto">
${this.preview.prompt || "Preview unavailable."}</pre
          >`,
        })}
      `,
    );
  }

  private renderEditorStatus() {
    const stateLocal = this.context?.runtimeConfig.state;
    if (stateLocal?.configSaving || stateLocal?.configApplying) {
      return renderStatus("warn", t("promptStudio.status.saving"));
    }
    if (this.actionError || stateLocal?.lastError) {
      return renderStatus("danger", t("promptStudio.status.error"));
    }
    if (stateLocal?.configFormDirty) {
      return renderStatus("warn", t("common.unsavedChanges"));
    }
    return renderStatus("ok", t("promptStudio.status.ready"));
  }

  override render() {
    const runtimeConfig = this.context?.runtimeConfig;
    const configState = runtimeConfig?.state;
    const overlay = this.currentOverlay();
    const disabled = !this.canEdit();
    const lastError = this.actionError ?? configState?.lastError ?? null;
    const actions = html`
      <button
        class="btn btn--sm"
        type="button"
        ?disabled=${disabled}
        @click=${() => void this.save()}
      >
        ${configState?.configSaving ? t("common.saving") : t("common.save")}
      </button>
      <button
        class="btn btn--sm primary"
        type="button"
        ?disabled=${disabled}
        @click=${() => void this.apply()}
      >
        ${configState?.configApplying
          ? t("promptStudio.actions.applying")
          : t("promptStudio.actions.apply")}
      </button>
      <button class="btn btn--sm" type="button" @click=${() => void this.reload()}>
        ${t("common.reload")}
      </button>
    `;
    const body = html`
      <div class="prompt-studio-page">
        <p class="prompt-studio-intro">${t("promptStudio.intro")}</p>
        ${renderSection(
          {
            title: t("promptStudio.editor.title"),
            description: t("promptStudio.editor.description"),
            actions,
          },
          html`
            ${renderRow({
              title: t("promptStudio.editor.status"),
              description: lastError ? html`<span role="alert">${lastError}</span>` : nothing,
              control: this.renderEditorStatus(),
            })}
            ${renderRow({
              title: t("promptStudio.editor.enableTitle"),
              description: t("promptStudio.editor.enableDescription"),
              control: html`
                <label class="prompt-studio-toggle-control">
                  <input
                    class="prompt-studio-toggle"
                    type="checkbox"
                    ?checked=${overlay.enabled}
                    ?disabled=${disabled}
                    @change=${(event: Event) =>
                      this.setOverlayEnabled((event.currentTarget as HTMLInputElement).checked)}
                  />
                  <span>${overlay.enabled ? t("common.enabled") : t("common.disabled")}</span>
                </label>
              `,
            })}
            ${renderRow({
              title: "Safety prompt style",
              description:
                "LibreClaw restores the aligned-goals Safety wording from Prompt Studio v1.",
              control: html`
                <select
                  class="cfg-input prompt-studio-safety-style"
                  ?disabled=${disabled || !overlay.enabled}
                  .value=${overlay.safetyStyle}
                  @change=${(event: Event) =>
                    this.setSafetyStyle(
                      (event.currentTarget as HTMLSelectElement).value === "libreclaw"
                        ? "libreclaw"
                        : "openclaw",
                    )}
                >
                  <option value="openclaw">OpenClaw default</option>
                  <option value="libreclaw">LibreClaw aligned goals</option>
                </select>
              `,
            })}
            ${renderRow({
              title: t("promptStudio.editor.customInstructionsTitle"),
              description: t("promptStudio.editor.customInstructionsDescription"),
              stacked: true,
              control: html`
                <textarea
                  class="cfg-textarea prompt-studio-editor"
                  rows="8"
                  spellcheck="true"
                  ?disabled=${disabled || !overlay.enabled}
                  .value=${overlay.customInstructions}
                  placeholder=${t("promptStudio.editor.placeholder")}
                  @input=${(event: Event) =>
                    this.setCustomInstructions((event.currentTarget as HTMLTextAreaElement).value)}
                ></textarea>
              `,
            })}
            ${renderRow({
              title: "Prepend",
              description: "Text inserted before the generated system prompt.",
              stacked: true,
              control: html`
                <textarea
                  class="cfg-textarea prompt-studio-prepend"
                  rows="6"
                  spellcheck="true"
                  ?disabled=${disabled || !overlay.enabled}
                  .value=${overlay.prepend}
                  placeholder="Optional text prepended to the full system prompt"
                  @input=${(event: Event) =>
                    this.setPrepend((event.currentTarget as HTMLTextAreaElement).value)}
                ></textarea>
              `,
            })}
            ${renderRow({
              title: "Append",
              description: "Text inserted after the generated system prompt.",
              stacked: true,
              control: html`
                <textarea
                  class="cfg-textarea prompt-studio-append"
                  rows="6"
                  spellcheck="true"
                  ?disabled=${disabled || !overlay.enabled}
                  .value=${overlay.append}
                  placeholder="Optional text appended to the full system prompt"
                  @input=${(event: Event) =>
                    this.setAppend((event.currentTarget as HTMLTextAreaElement).value)}
                ></textarea>
              `,
            })}
            ${renderRow({
              title: "Remove sections",
              description:
                "Hide selected generated sections from the final system prompt. Use with care; the preview shows the exact result.",
              stacked: true,
              control: html`
                <div class="prompt-studio-section-grid">
                  ${PROMPT_STUDIO_SECTION_IDS.map((sectionId) => {
                    const checked = overlay.removeSections.includes(sectionId);
                    return html`
                      <label class="prompt-studio-section-check ${checked ? "active" : ""}">
                        <input
                          type="checkbox"
                          .checked=${checked}
                          ?disabled=${disabled || !overlay.enabled}
                          @change=${(event: Event) =>
                            this.toggleRemoveSection(
                              sectionId,
                              (event.currentTarget as HTMLInputElement).checked,
                            )}
                        />
                        <span>${formatSectionLabel(sectionId)}</span>
                      </label>
                    `;
                  })}
                </div>
              `,
            })}
            ${renderRow({
              title: t("promptStudio.editor.configPath"),
              description: t("promptStudio.editor.configPathDescription"),
              control: html`<code>agents.defaults.promptOverlays.openclaw</code>`,
            })}
            ${renderRow({
              title: t("promptStudio.editor.resetTitle"),
              description: t("promptStudio.editor.resetDescription"),
              control: html`
                <button
                  class="btn btn--sm"
                  type="button"
                  ?disabled=${disabled}
                  @click=${() => this.clearCustomInstructions()}
                >
                  ${t("promptStudio.editor.resetButton")}
                </button>
              `,
            })}
          `,
        )}
        ${this.renderPreview()}
      </div>
    `;
    return html`
      <section class="content-header">
        <div>
          <div class="page-title">${titleForRoute("prompt-studio")}</div>
        </div>
      </section>
      ${renderSettingsWorkspace(
        this.context.basePath,
        body,
        "prompt-studio",
        this.context.navigate,
        this.context.preload,
      )}
    `;
  }
}

if (!customElements.get("openclaw-prompt-studio-page")) {
  customElements.define("openclaw-prompt-studio-page", PromptStudioPage);
}

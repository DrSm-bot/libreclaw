import { consume } from "@lit/context";
import { html, LitElement, nothing, type TemplateResult } from "lit";
import { state } from "lit/decorators.js";
import { titleForRoute } from "../../app-navigation.ts";
import { applicationContext, type ApplicationContext } from "../../app/context.ts";
import { renderSettingsWorkspace } from "../../components/settings-workspace.ts";
import { t } from "../../i18n/index.ts";
import { currentConfigObject } from "../../lib/config/index.ts";

const CUSTOM_INSTRUCTIONS_PATH = [
  "agents",
  "defaults",
  "promptOverlays",
  "openclaw",
  "customInstructions",
] as const;

const OPENCLAW_OVERLAY_ENABLED_PATH = [
  "agents",
  "defaults",
  "promptOverlays",
  "openclaw",
  "enabled",
] as const;

type PromptStudioOverlay = {
  enabled: boolean;
  customInstructions: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readOpenClawOverlay(config: Record<string, unknown> | null): PromptStudioOverlay {
  const agents = asRecord(config?.agents);
  const defaults = asRecord(agents?.defaults);
  const promptOverlays = asRecord(defaults?.promptOverlays);
  const openclaw = asRecord(promptOverlays?.openclaw);
  const customInstructions = openclaw?.customInstructions;
  const enabled = openclaw?.enabled;
  return {
    enabled: enabled !== false,
    customInstructions: typeof customInstructions === "string" ? customInstructions : "",
  };
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

  private stopRuntimeConfigSubscription?: () => void;

  override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    void this.context?.runtimeConfig.ensureLoaded();
    this.stopRuntimeConfigSubscription = this.context?.runtimeConfig.subscribe(() =>
      this.requestUpdate(),
    );
  }

  override disconnectedCallback() {
    this.stopRuntimeConfigSubscription?.();
    this.stopRuntimeConfigSubscription = undefined;
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

  private setCustomInstructions(value: string) {
    if (!this.canEdit()) {
      return;
    }
    this.actionError = null;
    this.context.runtimeConfig.patchForm([...CUSTOM_INSTRUCTIONS_PATH], value);
  }

  private setOverlayEnabled(enabled: boolean) {
    if (!this.canEdit()) {
      return;
    }
    this.actionError = null;
    this.context.runtimeConfig.patchForm([...OPENCLAW_OVERLAY_ENABLED_PATH], enabled);
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

  private renderPreview(customInstructions: string, enabled: boolean) {
    const trimmed = customInstructions.trim();
    const preview = enabled && trimmed ? `## Custom Instructions\n${trimmed}` : "";
    return renderSection(
      {
        title: t("promptStudio.preview.title"),
        description: t("promptStudio.preview.description"),
      },
      renderRow({
        title: t("promptStudio.preview.sectionTitle"),
        description: preview ? undefined : t("promptStudio.preview.empty"),
        control: preview
          ? html`<pre class="prompt-studio-preview" dir="auto">${preview}</pre>`
          : nothing,
        stacked: true,
      }),
    );
  }

  private renderEditorStatus() {
    const state = this.context?.runtimeConfig.state;
    if (state?.configSaving || state?.configApplying) {
      return renderStatus("warn", t("promptStudio.status.saving"));
    }
    if (this.actionError || state?.lastError) {
      return renderStatus("danger", t("promptStudio.status.error"));
    }
    if (state?.configFormDirty) {
      return renderStatus("warn", t("common.unsavedChanges"));
    }
    return renderStatus("ok", t("promptStudio.status.ready"));
  }

  override render() {
    const runtimeConfig = this.context?.runtimeConfig;
    const configState = runtimeConfig?.state;
    const overlay = readOpenClawOverlay(configState ? currentConfigObject(configState) : null);
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
              title: t("promptStudio.editor.customInstructionsTitle"),
              description: t("promptStudio.editor.customInstructionsDescription"),
              stacked: true,
              control: html`
                <textarea
                  class="cfg-textarea prompt-studio-editor"
                  rows="12"
                  spellcheck="true"
                  ?disabled=${disabled}
                  .value=${overlay.customInstructions}
                  placeholder=${t("promptStudio.editor.placeholder")}
                  @input=${(event: Event) =>
                    this.setCustomInstructions((event.currentTarget as HTMLTextAreaElement).value)}
                ></textarea>
              `,
            })}
            ${renderRow({
              title: t("promptStudio.editor.configPath"),
              description: t("promptStudio.editor.configPathDescription"),
              control: html`<code
                >agents.defaults.promptOverlays.openclaw.customInstructions</code
              >`,
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
        ${this.renderPreview(overlay.customInstructions, overlay.enabled)}
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

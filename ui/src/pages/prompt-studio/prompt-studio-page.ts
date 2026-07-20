import { consume } from "@lit/context";
import { html, nothing } from "lit";
import { state } from "lit/decorators.js";
import { titleForRoute } from "../../app-navigation.ts";
import { applicationContext, type ApplicationContext } from "../../app/context.ts";
import {
  renderSettingsPage,
  renderSettingsRow,
  renderSettingsSection,
  renderSettingsStatus,
  renderSettingsToggle,
  renderSettingsValue,
} from "../../components/settings-ui.ts";
import { renderSettingsWorkspace } from "../../components/settings-workspace.ts";
import { t } from "../../i18n/index.ts";
import type { ConfigAutoSaveStatus } from "../../lib/config/index.ts";
import { currentConfigObject } from "../../lib/config/index.ts";
import { OpenClawLightDomElement } from "../../lit/openclaw-element.ts";
import { SubscriptionsController } from "../../lit/subscriptions-controller.ts";

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

function promptStudioStatus(status: ConfigAutoSaveStatus): {
  kind: "ok" | "warn" | "danger" | "accent" | "muted";
  label: string;
} {
  switch (status) {
    case "saving":
      return { kind: "accent", label: t("promptStudio.status.saving") };
    case "saved":
      return { kind: "ok", label: t("promptStudio.status.saved") };
    case "error":
      return { kind: "danger", label: t("promptStudio.status.error") };
    case "conflict":
      return { kind: "warn", label: t("promptStudio.status.conflict") };
    case "idle":
      return { kind: "muted", label: t("promptStudio.status.ready") };
  }
}

class PromptStudioPage extends OpenClawLightDomElement {
  @consume({ context: applicationContext, subscribe: true })
  private context!: ApplicationContext;

  @state() private actionError: string | null = null;

  private readonly subscriptions = new SubscriptionsController(this).effect(
    () => this.context?.runtimeConfig,
    (runtimeConfig) => {
      void runtimeConfig.ensureLoaded();
      return runtimeConfig.subscribe(() => this.requestUpdate());
    },
  );

  override disconnectedCallback() {
    this.subscriptions.clear();
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
    return renderSettingsSection(
      {
        title: t("promptStudio.preview.title"),
        description: t("promptStudio.preview.description"),
      },
      renderSettingsRow({
        title: t("promptStudio.preview.sectionTitle"),
        description: preview ? undefined : t("promptStudio.preview.empty"),
        control: preview
          ? html`<pre class="prompt-studio-preview" dir="auto">${preview}</pre>`
          : nothing,
        stacked: true,
      }),
    );
  }

  override render() {
    const runtimeConfig = this.context?.runtimeConfig;
    const configState = runtimeConfig?.state;
    const overlay = readOpenClawOverlay(configState ? currentConfigObject(configState) : null);
    const disabled = !this.canEdit();
    const status = promptStudioStatus(configState?.configAutoSaveStatus ?? "idle");
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
    const body = renderSettingsPage(
      html`
        ${renderSettingsSection(
          {
            title: t("promptStudio.editor.title"),
            description: t("promptStudio.editor.description"),
            actions,
          },
          html`
            ${renderSettingsRow({
              title: t("promptStudio.editor.status"),
              description: lastError ? html`<span role="alert">${lastError}</span>` : nothing,
              control: renderSettingsStatus(status),
            })}
            ${renderSettingsRow({
              title: t("promptStudio.editor.enableTitle"),
              description: t("promptStudio.editor.enableDescription"),
              control: renderSettingsToggle({
                checked: overlay.enabled,
                disabled,
                ariaLabel: t("promptStudio.editor.enableTitle"),
                onChange: (enabled) => this.setOverlayEnabled(enabled),
              }),
            })}
            ${renderSettingsRow({
              title: t("promptStudio.editor.customInstructionsTitle"),
              description: t("promptStudio.editor.customInstructionsDescription"),
              stacked: true,
              control: html`
                <textarea
                  class="settings-input prompt-studio-editor"
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
            ${renderSettingsRow({
              title: t("promptStudio.editor.configPath"),
              description: t("promptStudio.editor.configPathDescription"),
              control: renderSettingsValue(
                "agents.defaults.promptOverlays.openclaw.customInstructions",
                {
                  mono: true,
                },
              ),
            })}
            ${renderSettingsRow({
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
      `,
      { intro: t("promptStudio.intro") },
    );
    return html`
      <section class="content-header">
        <div>
          <div class="page-title">${titleForRoute("prompt-studio")}</div>
        </div>
      </section>
      ${renderSettingsWorkspace(body)}
    `;
  }
}

if (!customElements.get("openclaw-prompt-studio-page")) {
  customElements.define("openclaw-prompt-studio-page", PromptStudioPage);
}
